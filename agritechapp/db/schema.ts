import { pgTable, serial, text, timestamp, boolean, integer, varchar, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Communes avec limites géographiques
export const communes = pgTable('communes', {
  id: serial('id').primaryKey(),
  nom: text('nom').notNull(),
  departement: text('departement').notNull(),
  geom: text('geom').notNull(), // Stocké comme GeoJSON text pour l'instant, sera converti en geography(Point, 4326)
}, (table) => ({
  geomIdx: index('communes_geom_idx').using('gist', sql`ST_GeomFromText(${table.geom})`),
}));

// Profils utilisateurs
export const profils = pgTable('profils', {
  id: serial('id').primaryKey(),
  role: text('role').notNull(), // 'producteur', 'conseiller', 'acheteur', 'admin'
  nom: text('nom').notNull(),
  telephone: text('telephone').notNull().unique(),
  langue: text('langue').notNull(), // 'fr', 'fon', 'bariba'
  a_smartphone: boolean('a_smartphone').notNull().default(true),
  commune_id: integer('commune_id').references(() => communes.id),
  position: text('position'), // Stocké comme GeoJSON text, sera converti en geography(Point, 4326)
  inscrit_par: integer('inscrit_par').references((): AnyPgColumn => profils.id),
  created_at: timestamp('created_at').defaultNow(),
}, (table) => ({
  positionIdx: index('profils_position_idx').using('gist', sql`ST_GeomFromText(${table.position})`),
}));

// Tentatives de connexion pour le blocage
export const tentatives_connexion = pgTable('tentatives_connexion', {
  id: serial('id').primaryKey(),
  telephone: text('telephone').notNull(),
  nb_echecs: integer('nb_echecs').notNull().default(0),
  bloque_jusqu_a: timestamp('bloque_jusqu_a'),
  created_at: timestamp('created_at').defaultNow(),
});

// Ravageurs
export const ravageurs = pgTable('ravageurs', {
  id: serial('id').primaryKey(),
  nom: text('nom').notNull(),
  culture: text('culture').notNull(),
  description: text('description'),
  pictogramme: text('pictogramme'),
});

// Signalements
export const signalements = pgTable('signalements', {
  id: serial('id').primaryKey(),
  producteur_id: integer('producteur_id').references(() => profils.id).notNull(),
  position: text('position').notNull(), // Stocké comme GeoJSON text, sera converti en geography(Point, 4326)
  photo_url: text('photo_url'),
  audio_url: text('audio_url'),
  canal_origine: text('canal_origine').notNull(), // 'app', 'web', 'appel'
  statut: text('statut').notNull().default('signale'), // 'signale', 'confirme', 'rejete', 'traite', 'clos'
  ravageur_id: integer('ravageur_id').references(() => ravageurs.id),
  gravite: text('gravite'), // 'faible', 'moyenne', 'forte'
  conseiller_id: integer('conseiller_id').references(() => profils.id),
  created_at: timestamp('created_at').defaultNow(),
  confirme_at: timestamp('confirme_at'),
  traite_at: timestamp('traite_at'),
  clos_at: timestamp('clos_at'),
}, (table) => ({
  positionIdx: index('signalements_position_idx').using('gist', sql`ST_GeomFromText(${table.position})`),
}));

// Alertes
export const alertes = pgTable('alertes', {
  id: serial('id').primaryKey(),
  signalement_id: integer('signalement_id').references(() => signalements.id).notNull(),
  rayon_km: integer('rayon_km').notNull().default(10),
  declenchee_par: integer('declenchee_par').references(() => profils.id).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  recommandation: text('recommandation'),
  audio_url: text('audio_url'),       // Note vocale enregistrée par le conseiller
  audio_langue: varchar('audio_langue', { length: 10 }), // 'fr' | 'fon' | 'bariba'
});

// Envois de notifications
export const envois = pgTable('envois', {
  id: serial('id').primaryKey(),
  alerte_id: integer('alerte_id').references(() => alertes.id).notNull(),
  destinataire_id: integer('destinataire_id').references(() => profils.id).notNull(),
  canal: text('canal').notNull(), // 'sms', 'appel', 'notification'
  langue: text('langue').notNull(),
  statut: text('statut').notNull().default('envoye'), // 'envoye', 'echoue', 'delivre'
  sent_at: timestamp('sent_at').defaultNow(),
  vu_at: timestamp('vu_at'), // null = pas encore consulté par le producteur
});

// Contenus (fiches ravageurs, réglementaires)
export const contenus = pgTable('contenus', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // 'ravageur', 'reglementation'
  titre: text('titre').notNull(),
  texte: text('texte'),
  pictogramme: text('pictogramme'),
});

// Audios par langue pour les contenus
export const contenus_audio = pgTable('contenus_audio', {
  id: serial('id').primaryKey(),
  contenu_id: integer('contenu_id').references(() => contenus.id).notNull(),
  langue: text('langue').notNull(),
  audio_url: text('audio_url').notNull(),
});

// Annonces d'achat (publiées par les acheteurs)
export const annonces = pgTable('annonces', {
  id: serial('id').primaryKey(),
  acheteur_id: integer('acheteur_id').references(() => profils.id).notNull(),
  produit: text('produit').notNull(),
  description: text('description'),
  quantite: integer('quantite').notNull(),
  unite: text('unite').notNull().default('kg'),
  prix: integer('prix').notNull(), // en FCFA par unité
  photo_url: text('photo_url'),
  statut: text('statut').notNull().default('active'), // 'active', 'completee', 'archivee'
  created_at: timestamp('created_at').defaultNow(),
});

// Contacts : un producteur répond à une annonce d'achat
export const contacts_annonce = pgTable('contacts_annonce', {
  id: serial('id').primaryKey(),
  annonce_id: integer('annonce_id').references(() => annonces.id).notNull(),
  producteur_id: integer('producteur_id').references(() => profils.id).notNull(),
  message: text('message'),
  quantite_proposee: integer('quantite_proposee'),
  statut: text('statut').notNull().default('en_discussion'), // 'en_discussion', 'accepte', 'refuse'
  created_at: timestamp('created_at').defaultNow(),
});

// Commandes : créées quand un acheteur valide une proposition de producteur
export const commandes = pgTable('commandes', {
  id: serial('id').primaryKey(),
  contact_id: integer('contact_id').references(() => contacts_annonce.id).notNull(),
  annonce_id: integer('annonce_id').references(() => annonces.id).notNull(),
  producteur_id: integer('producteur_id').references(() => profils.id).notNull(),
  acheteur_id: integer('acheteur_id').references(() => profils.id).notNull(),
  montant: integer('montant').notNull(), // en FCFA
  statut: text('statut').notNull().default('en_attente_paiement'), // 'en_attente_paiement', 'paiement_bloque', 'livraison_confirmee', 'termine'
  created_at: timestamp('created_at').defaultNow(),
  livraison_confirme_at: timestamp('livraison_confirme_at'),
});

// Ventes déclarées
export const ventes_declarees = pgTable('ventes_declarees', {
  id: serial('id').primaryKey(),
  commande_id: integer('commande_id').references(() => commandes.id),
  annonce_id: integer('annonce_id').references(() => annonces.id).notNull(),
  acheteur_id: integer('acheteur_id').references(() => profils.id).notNull(),
  producteur_id: integer('producteur_id').references(() => profils.id),
  montant: integer('montant').notNull(), // en FCFA
  redevance: integer('redevance').notNull(), // 1% du montant
  numero_recu: text('numero_recu').notNull().unique(),
  created_at: timestamp('created_at').defaultNow(),
});
