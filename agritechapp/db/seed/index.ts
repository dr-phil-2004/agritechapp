import { db } from '../index';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';
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
//  Bio (producteur)    : 22941000001 / 123456
//  Adjara (producteur) : 22941000002 / 000000
//  Mme Houénou (ach.)  : 22941000003 / 123456
//  Serge (conseiller)  : serge@agriveille.bj / Conseil1
//  Admin               : admin@agriveille.bj / Admin2026
//
const PERSONAS = [
  { phone: '22941000001', code: '123456', role: 'producteur' as const },
  { phone: '22941000002', code: '000000', role: 'producteur' as const },
  { phone: '22941000003', code: '123456', role: 'acheteur' as const },
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

// Données des communes réelles (limites simplifiées pour le seed)
const communesData = [
  {
    nom: 'N\'Dali',
    departement: 'Borgou',
    geom: JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [9.5, 10.0], [9.6, 10.0], [9.6, 10.1], [9.5, 10.1], [9.5, 10.0]
      ]]
    })
  },
  {
    nom: 'Parakou',
    departement: 'Borgou',
    geom: JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [2.6, 9.3], [2.7, 9.3], [2.7, 9.4], [2.6, 9.4], [2.6, 9.3]
      ]]
    })
  },
  {
    nom: 'Tchaourou',
    departement: 'Borgou',
    geom: JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [2.9, 9.7], [3.0, 9.7], [3.0, 9.8], [2.9, 9.8], [2.9, 9.7]
      ]]
    })
  },
  {
    nom: 'Djidja',
    departement: 'Zou',
    geom: JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [1.9, 7.4], [2.0, 7.4], [2.0, 7.5], [1.9, 7.5], [1.9, 7.4]
      ]]
    })
  }
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

function randomPointInPolygon(polygon: { coordinates: number[][][] }) {
  const coords = polygon.coordinates[0];
  const minLng = Math.min(...coords.map((c) => c[0]));
  const maxLng = Math.max(...coords.map((c) => c[0]));
  const minLat = Math.min(...coords.map((c) => c[1]));
  const maxLat = Math.max(...coords.map((c) => c[1]));

  const lng = minLng + random() * (maxLng - minLng);
  const lat = minLat + random() * (maxLat - minLat);

  return JSON.stringify({ type: 'Point', coordinates: [lng, lat] });
}

async function seed() {
  console.log('Début du seed...');

  // ── 1. Comptes Supabase Auth ────────────────────────────────────────────────
  console.log('Création des comptes Supabase Auth...');
  for (const p of PERSONAS) {
    if ('phone' in p) {
      await createAuthUser(phoneToEmail(p.phone), p.code);
    } else {
      await createAuthUser(p.email, p.password);
    }
  }

  // ── 2. Communes ──────────────────────────────────────────────────────────────
  console.log('Insertion des communes...');
  const insertedCommunes = await db.insert(schema.communes).values(communesData).returning();
  const communeMap = new Map(insertedCommunes.map(c => [c.nom, c.id]));

  // ── 3. Ravageurs ──────────────────────────────────────────────────────────────
  console.log('Insertion des ravageurs...');
  await db.insert(schema.ravageurs).values(ravageursData);

  // ── 4. Personas principaux ───────────────────────────────────────────────────
  console.log('Création des personas...');

  // Bio — producteur smartphone, N'Dali
  const bioPosition = randomPointInPolygon(JSON.parse(communesData[0].geom));
  const bio = await db.insert(schema.profils).values({
    role: 'producteur',
    nom: 'Bio Kouagou',
    telephone: '22941000001',
    langue: 'bariba',
    a_smartphone: true,
    commune_id: communeMap.get('N\'Dali'),
    position: bioPosition,
  }).returning();

  // Adjara — producteur téléphone basique, près de N'Dali
  const adjaraPosition = JSON.stringify({ type: 'Point', coordinates: [9.55, 10.05] });
  await db.insert(schema.profils).values({
    role: 'producteur',
    nom: 'Adjara Sanni',
    telephone: '22941000002',
    langue: 'bariba',
    a_smartphone: false,
    commune_id: communeMap.get('N\'Dali'),
    position: adjaraPosition,
  });

  // Serge — conseiller à Parakou
  // Note : pour les conseillers/admins, on stocke l'email dans le champ telephone
  // car loginWithEmailPassword fait la recherche par ce champ.
  const sergePosition = randomPointInPolygon(JSON.parse(communesData[1].geom));
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
  const acheteusePosition = randomPointInPolygon(JSON.parse(communesData[1].geom));
  const acheteuse = await db.insert(schema.profils).values({
    role: 'acheteur',
    nom: 'Mme Houénou',
    telephone: '22941000003',
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

      const position = randomPointInPolygon(JSON.parse(
        communesData.find(c => c.nom === communeNom)!.geom
      ));

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

    const position = randomPointInPolygon(JSON.parse(communesData[0].geom));

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

  // ── 7. Annonces (~20) ─────────────────────────────────────────────────────
  console.log('Création des annonces...');
  const produits = ['maïs', 'soja', 'haricot'];

  for (let i = 0; i < 20; i++) {
    const producteurs = await db.select().from(schema.profils).where(
      eq(schema.profils.role, 'producteur')
    ).limit(1).offset(Math.floor(random() * 50));

    if (producteurs.length === 0) continue;

    await db.insert(schema.annonces).values({
      producteur_id: producteurs[0].id,
      produit: produits[Math.floor(random() * produits.length)],
      quantite: Math.floor(random() * 500) + 50,
      prix: Math.floor(random() * 200) + 100,
      statut: random() > 0.7 ? 'vendue' : 'active',
    });
  }

  // ── 8. Ventes déclarées (~15) ──────────────────────────────────────────────
  console.log('Création des ventes déclarées...');
  const annonces = await db.select().from(schema.annonces).limit(15);

  for (const annonce of annonces) {
    const montant = annonce.quantite * annonce.prix;
    const redevance = Math.floor(montant * 0.01);

    await db.insert(schema.ventes_declarees).values({
      annonce_id: annonce.id,
      acheteur_id: acheteuse[0].id,
      montant,
      redevance,
      numero_recu: `REC-${Date.now()}-${Math.floor(random() * 1000)}`,
    });
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
  console.log('│ Bio (prod.)    │ 22941000001           │ 123456              │');
  console.log('│ Adjara (prod.) │ 22941000002           │ 000000              │');
  console.log('│ Mme Houénou    │ 22941000003           │ 123456              │');
  console.log('│ Serge          │ serge@agriveille.bj   │ Conseil1            │');
  console.log('│ Admin          │ admin@agriveille.bj   │ Admin2026           │');
  console.log('└─────────────────────────────────────────────────────────────┘\n');
}

seed().catch(console.error);
