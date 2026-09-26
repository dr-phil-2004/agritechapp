import { db } from '../index';
import * as schema from '../schema';
import { eq, sql } from 'drizzle-orm';
import { supabaseAdmin } from '../../src/infrastructure/supabase/admin-client';

// Graine fixe pour la reproductibilité
const SEED = 42;

// Simuler un générateur aléatoire déterministe
function seededRandom(seed: number) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

const random = seededRandom(SEED);

// ─── Personas avec identifiants connus ───────────────────────────────────────
//
//  Producteurs/acheteurs  →  numéro + code à 6 chiffres
//  Conseiller/admin       →  email + mot de passe
//
//  Bio (producteur)    : 0141000001 / 123456
//  Adjara (producteur) : 0141000002 / 000000
//  Mme Houénou (ach.)  : 0141000003 / 123456
//  Serge (conseiller)  : serge@agriveille.bj / Conseil1
//  Admin               : admin@agriveille.bj / Admin2026
//
const PERSONAS = [
  { phone: '0141000001', code: '123456', role: 'producteur' as const },
  { phone: '0141000002', code: '000000', role: 'producteur' as const },
  { phone: '0141000003', code: '123456', role: 'acheteur' as const },
  { email: 'serge@agriveille.bj', password: 'Conseil1', role: 'conseiller' as const },
  { email: 'admin@agriveille.bj', password: 'Admin2026', role: 'admin' as const },
];

function phoneToEmail(phone: string): string {
  return `${phone.replace(/[^0-9]/g, '')}@agri.bj`;
}

// Créer (ou ignorer si déjà existant) un compte Supabase Auth
async function createAuthUser(email: string, password: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error && !error.message.includes('already')) {
    console.warn(`Auth user ${email}: ${error.message}`);
  }
}

// Données des communes — géométrie en WKT (compatible ST_GeomFromText)
// Note : PostGIS WKT = POLYGON((lng lat, lng lat, ...)) — longitude d'abord
const communesData = [
  {
    nom: 'N\'Dali',
    departement: 'Borgou',
    // Coordonnées réelles : N'Dali ~2.75°E, 9.85°N (Borgou, Bénin)
    geom: 'POLYGON((2.70 9.78, 2.85 9.78, 2.85 9.92, 2.70 9.92, 2.70 9.78))',
    bbox: { minLng: 2.70, maxLng: 2.85, minLat: 9.78, maxLat: 9.92 },
  },
  {
    nom: 'Parakou',
    departement: 'Borgou',
    geom: 'POLYGON((2.6 9.3, 2.7 9.3, 2.7 9.4, 2.6 9.4, 2.6 9.3))',
    bbox: { minLng: 2.6, maxLng: 2.7, minLat: 9.3, maxLat: 9.4 },
  },
  {
    nom: 'Tchaourou',
    departement: 'Borgou',
    geom: 'POLYGON((2.9 9.7, 3.0 9.7, 3.0 9.8, 2.9 9.8, 2.9 9.7))',
    bbox: { minLng: 2.9, maxLng: 3.0, minLat: 9.7, maxLat: 9.8 },
  },
  {
    nom: 'Djidja',
    departement: 'Zou',
    geom: 'POLYGON((1.9 7.4, 2.0 7.4, 2.0 7.5, 1.9 7.5, 1.9 7.4))',
    bbox: { minLng: 1.9, maxLng: 2.0, minLat: 7.4, maxLat: 7.5 },
  },
];

// Ravageurs du § 7
const ravageursData = [
  {
    nom: 'Chenille légionnaire d\'automne',
    culture: 'maïs',
    description: 'Ravageur nocturne qui attaque les feuilles et les épis',
    pictogramme: '🐛'
  },
  {
    nom: 'Foreurs de tiges',
    culture: 'maïs',
    description: 'Larves qui creusent des galeries dans les tiges',
    pictogramme: '🪱'
  },
  {
    nom: 'Striure du maïs (virus)',
    culture: 'maïs',
    description: 'Maladie virale transmise par des insectes',
    pictogramme: '🦠'
  },
  {
    nom: 'Striga',
    culture: 'maïs',
    description: 'Plante parasite qui se fixe sur les racines',
    pictogramme: '🌱'
  },
  {
    nom: 'Charançons et grand capucin',
    culture: 'maïs',
    description: 'Insectes du stockage qui attaquent les grains',
    pictogramme: '🪲'
  }
];

// Villages réels dans la zone (noms exacts)
const villagesNDali = ['Kokoro', 'Sèkèrè', 'Bembèrèkè', 'Gogounou', 'Kandi'];
const villagesParakou = ['Tchatchou', 'Perèrè', 'Nikki', 'Kalalé', 'Beterou'];
const villagesTchaourou = ['Bembéréké', 'Tchaourou-centre', 'Kpinnou', 'Oké', 'Bodjocohou'];

// Noms de famille courants dans la zone
const nomsFamille = ['Kouagou', 'Sanni', 'Yao', 'Aïssé', 'Koudjo', 'Toko', 'Gnanvi', 'Koffi', 'Adé', 'Moutawakilou'];

function randomPointInBbox(bbox: { minLng: number; maxLng: number; minLat: number; maxLat: number }) {
  const lng = bbox.minLng + random() * (bbox.maxLng - bbox.minLng);
  const lat = bbox.minLat + random() * (bbox.maxLat - bbox.minLat);
  // WKT Point format compatible with ST_GeomFromText
  return `POINT(${lng} ${lat})`;
}

async function seed() {
  console.log('Début du seed...');

  // ── 0. Nettoyage des tables (pour un seed reproductible) ─────────────────────
  console.log('Nettoyage des tables...');
  await db.execute(sql`TRUNCATE TABLE envois, alertes, signalements, commandes, contacts_annonce, ventes_declarees, annonces, contenus_audio, contenus, profils, ravageurs, communes RESTART IDENTITY CASCADE`);

  // ── 0b. Buckets Supabase Storage ──────────────────────────────────────────────
  console.log('Création des buckets Storage...');
  for (const bucketId of ['photos', 'notes-vocales']) {
    const { error } = await supabaseAdmin.storage.createBucket(bucketId, { public: true });
    if (error && !error.message.includes('already exists')) {
      console.warn(`Bucket ${bucketId}: ${error.message}`);
    }
  }

  // ── 1. Comptes Supabase Auth ────────────────────────────────────────────────
  console.log('Création des comptes Supabase Auth...');
  for (const p of PERSONAS) {
    if ('phone' in p && p.phone && p.code) {
      await createAuthUser(phoneToEmail(p.phone), p.code);
    } else if ('email' in p && p.email && p.password) {
      await createAuthUser(p.email, p.password);
    }
  }

  // ── 2. Communes ──────────────────────────────────────────────────────────────
  console.log('Insertion des communes...');
  // Strip the 'bbox' helper field before inserting into DB
  const insertedCommunes = await db.insert(schema.communes).values(
    communesData.map(({ nom, departement, geom }) => ({ nom, departement, geom }))
  ).returning();
  const communeMap = new Map(insertedCommunes.map(c => [c.nom, c.id]));

  // ── 3. Ravageurs ──────────────────────────────────────────────────────────────
  console.log('Insertion des ravageurs...');
  await db.insert(schema.ravageurs).values(ravageursData);

  // ── 4. Personas principaux ───────────────────────────────────────────────────
  console.log('Création des personas...');

  // Bio — producteur smartphone, N'Dali, près d'Adjara et des coordonnées de démo (2.73, 9.85)
  // Position fixe pour garantir que Bio est dans le rayon de 10 km lors de la démo
  const bioPosition = 'POINT(2.76 9.86)';
  const bio = await db.insert(schema.profils).values({
    role: 'producteur',
    nom: 'Bio Kouagou',
    telephone: '0141000001',
    langue: 'bariba',
    a_smartphone: true,
    commune_id: communeMap.get('N\'Dali'),
    position: bioPosition,
  }).returning();

  // Adjara — producteur téléphone basique, près de N'Dali
  const adjaraPosition = 'POINT(2.77 9.87)'; // N'Dali, coordonnées réelles
  await db.insert(schema.profils).values({
    role: 'producteur',
    nom: 'Adjara Sanni',
    telephone: '0141000002',
    langue: 'bariba',
    a_smartphone: false,
    commune_id: communeMap.get('N\'Dali'),
    position: adjaraPosition,
  });

  // Serge — conseiller à Parakou
  // Note : pour les conseillers/admins, on stocke l'email dans le champ telephone
  // car loginWithEmailPassword fait la recherche par ce champ.
  const sergePosition = randomPointInBbox(communesData[1].bbox);
  const serge = await db.insert(schema.profils).values({
    role: 'conseiller',
    nom: 'Serge Yao',
    telephone: 'serge@agriveille.bj',
    langue: 'fr',
    a_smartphone: true,
    commune_id: communeMap.get('Parakou'),
    position: sergePosition,
  }).returning();

  // Mme Houénou — acheteur à Parakou
  const acheteusePosition = randomPointInBbox(communesData[1].bbox);
  const acheteuse = await db.insert(schema.profils).values({
    role: 'acheteur',
    nom: 'Mme Houénou',
    telephone: '0141000003',
    langue: 'fr',
    a_smartphone: true,
    commune_id: communeMap.get('Parakou'),
    position: acheteusePosition,
  }).returning();

  // Admin
  await db.insert(schema.profils).values({
    role: 'admin',
    nom: 'Admin Direction',
    telephone: 'admin@agriveille.bj',
    langue: 'fr',
    a_smartphone: true,
    commune_id: communeMap.get('Parakou'),
    position: sergePosition,
  });

  // ── 5. Producteurs supplémentaires (~115 de plus) ─────────────────────────
  console.log('Création des producteurs supplémentaires...');
  const communesForProducteurs = ['N\'Dali', 'Parakou', 'Tchaourou'];
  let producteurCount = 5;

  for (const communeNom of communesForProducteurs) {
    const communeId = communeMap.get(communeNom);
    const villages = communeNom === 'N\'Dali' ? villagesNDali :
                     communeNom === 'Parakou' ? villagesParakou : villagesTchaourou;

    const targetCount = communeNom === 'N\'Dali' ? 50 :
                        communeNom === 'Parakou' ? 40 : 25;

    while (producteurCount < targetCount) {
      const aSmartphone = random() > 0.3;
      const langue = aSmartphone ? (random() > 0.5 ? 'fr' : 'bariba') : 'bariba';
      const village = villages[Math.floor(random() * villages.length)];
      const nomFamille = nomsFamille[Math.floor(random() * nomsFamille.length)];

      const position = randomPointInBbox(communesData.find(c => c.nom === communeNom)!.bbox);

      await db.insert(schema.profils).values({
        role: 'producteur',
        nom: `${village} ${nomFamille}`,
        telephone: `2294${String(Math.floor(random() * 9000000) + 1000000)}`,
        langue,
        a_smartphone: aSmartphone,
        commune_id: communeId,
        position,
      });

      producteurCount++;
    }
  }

  // ── 6. Signalements historiques (~40 sur 3 mois) ──────────────────────────
  console.log('Création des signalements historiques...');
  const statuts = ['signale', 'confirme', 'traite', 'clos', 'rejete'];
  const now = new Date();

  for (let i = 0; i < 40; i++) {
    const daysAgo = Math.floor(random() * 90);
    const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    const statut = statuts[Math.floor(random() * statuts.length)];
    const producteur = await db.select().from(schema.profils).where(
      eq(schema.profils.role, 'producteur')
    ).limit(1).offset(Math.floor(random() * 50));

    if (producteur.length === 0) continue;

    const position = randomPointInBbox(communesData[0].bbox);

    const signalement = await db.insert(schema.signalements).values({
      producteur_id: producteur[0].id,
      position,
      canal_origine: random() > 0.3 ? 'app' : 'web',
      statut,
      created_at: createdAt,
      confirme_at: statut !== 'signale' ? new Date(createdAt.getTime() + 24 * 60 * 60 * 1000) : null,
      traite_at: statut === 'traite' || statut === 'clos' ? new Date(createdAt.getTime() + 48 * 60 * 60 * 1000) : null,
      clos_at: statut === 'clos' ? new Date(createdAt.getTime() + 72 * 60 * 60 * 1000) : null,
    }).returning();

    if (statut === 'confirme' || statut === 'traite' || statut === 'clos') {
      await db.insert(schema.alertes).values({
        signalement_id: signalement[0].id,
        rayon_km: 10,
        declenchee_par: serge[0].id,
        created_at: createdAt,
      });
    }
  }

  // ── 7. Annonces d'achat (publiées par Mme Houénou) ───────────────────────
  console.log('Création des annonces d\'achat...');
  const annonceData = [
    {
      acheteur_id: acheteuse[0].id,
      produit: 'Maïs',
      description: 'Maïs sec, bonne qualité, sac de 100 kg minimum',
      quantite: 500,
      unite: 'kg',
      prix: 150,
      statut: 'active' as const,
    },
    {
      acheteur_id: acheteuse[0].id,
      produit: 'Soja',
      description: 'Soja décortiqué pour transformation',
      quantite: 200,
      unite: 'kg',
      prix: 280,
      statut: 'active' as const,
    },
  ];
  const insertedAnnonces = await db.insert(schema.annonces).values(annonceData).returning();

  // ── 8. Contact : Bio répond à l'annonce maïs ──────────────────────────────
  console.log('Création des contacts et commandes de démonstration...');
  if (insertedAnnonces.length > 0) {
    const contact = await db.insert(schema.contacts_annonce).values({
      annonce_id: insertedAnnonces[0].id,
      producteur_id: bio[0].id,
      message: 'J\'ai 300 kg de maïs sec disponibles. Intéressé.',
      quantite_proposee: 300,
      statut: 'accepte',
    }).returning();

    if (contact.length > 0) {
      const commande = await db.insert(schema.commandes).values({
        contact_id: contact[0].id,
        annonce_id: insertedAnnonces[0].id,
        producteur_id: bio[0].id,
        acheteur_id: acheteuse[0].id,
        montant: 45000, // 300 kg × 150 FCFA
        statut: 'termine',
        livraison_confirme_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      }).returning();

      if (commande.length > 0) {
        await db.insert(schema.ventes_declarees).values({
          commande_id: commande[0].id,
          annonce_id: insertedAnnonces[0].id,
          acheteur_id: acheteuse[0].id,
          producteur_id: bio[0].id,
          montant: 45000,
          redevance: 450, // 1%
          numero_recu: 'RECV-2026-001',
        });
      }
    }
  }

  // ── 9. Fiches réglementaires ───────────────────────────────────────────────
  console.log('Création des fiches réglementaires...');
  const fichesReglementaires = [
    { type: 'reglementation', titre: 'Bonnes pratiques phytosanitaires', texte: 'Utilisez des méthodes de lutte intégrée. Consultez un conseiller avant tout traitement.', pictogramme: '📋' },
    { type: 'reglementation', titre: 'Alerte chenille légionnaire', texte: 'Surveillez vos champs dès l\'apparition des premiers symptômes. Signalez rapidement.', pictogramme: '⚠️' },
    { type: 'reglementation', titre: 'Stockage des grains', texte: 'Stockez les grains dans des sacs hermétiques pour éviter les attaques de charançons.', pictogramme: '🌾' },
    { type: 'reglementation', titre: 'Gestion de l\'eau', texte: 'Pratiquez une irrigation raisonnée pour préserver les ressources en eau.', pictogramme: '💧' },
  ];

  const insertedContenus = await db.insert(schema.contenus).values(fichesReglementaires).returning();

  for (const contenu of insertedContenus) {
    await db.insert(schema.contenus_audio).values({
      contenu_id: contenu.id,
      langue: 'fr',
      audio_url: '/audio/placeholder.mp3',
    });
  }

  // ── Récapitulatif ──────────────────────────────────────────────────────────
  console.log('\n✅ Seed terminé avec succès!\n');
  console.log('┌─ IDENTIFIANTS DE CONNEXION ─────────────────────────────────┐');
  console.log('│ Persona        │ Identifiant          │ Mot de passe / Code │');
  console.log('├────────────────┼──────────────────────┼─────────────────────┤');
  console.log('│ Bio (prod.)    │ 0141000001            │ 123456              │');
  console.log('│ Adjara (prod.) │ 0141000002            │ 000000              │');
  console.log('│ Mme Houénou    │ 0141000003            │ 123456              │');
  console.log('│ Serge          │ serge@agriveille.bj   │ Conseil1            │');
  console.log('│ Admin          │ admin@agriveille.bj   │ Admin2026           │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
}

seed().catch(console.error);
