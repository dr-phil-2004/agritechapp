import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from './index';

async function migrate() {
  console.log('Applying vente schema migration...');

  await db.execute(sql`ALTER TABLE annonces RENAME COLUMN producteur_id TO acheteur_id`);
  console.log('✓ annonces: producteur_id → acheteur_id');

  await db.execute(sql`ALTER TABLE annonces ADD COLUMN IF NOT EXISTS description text`);
  await db.execute(sql`ALTER TABLE annonces ADD COLUMN IF NOT EXISTS unite text NOT NULL DEFAULT 'kg'`);
  console.log('✓ annonces: added description, unite');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS contacts_annonce (
      id serial PRIMARY KEY,
      annonce_id integer NOT NULL REFERENCES annonces(id),
      producteur_id integer NOT NULL REFERENCES profils(id),
      message text,
      quantite_proposee integer,
      statut text NOT NULL DEFAULT 'en_discussion',
      created_at timestamp DEFAULT now()
    )
  `);
  console.log('✓ contacts_annonce created');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS commandes (
      id serial PRIMARY KEY,
      contact_id integer NOT NULL REFERENCES contacts_annonce(id),
      annonce_id integer NOT NULL REFERENCES annonces(id),
      producteur_id integer NOT NULL REFERENCES profils(id),
      acheteur_id integer NOT NULL REFERENCES profils(id),
      montant integer NOT NULL,
      statut text NOT NULL DEFAULT 'en_attente_paiement',
      created_at timestamp DEFAULT now(),
      livraison_confirme_at timestamp
    )
  `);
  console.log('✓ commandes created');

  await db.execute(sql`ALTER TABLE ventes_declarees ADD COLUMN IF NOT EXISTS commande_id integer REFERENCES commandes(id)`);
  await db.execute(sql`ALTER TABLE ventes_declarees ADD COLUMN IF NOT EXISTS producteur_id integer REFERENCES profils(id)`);
  console.log('✓ ventes_declarees: added commande_id, producteur_id');

  console.log('\nMigration complete!');
  process.exit(0);
}

migrate().catch(e => { console.error('Migration failed:', e.message); process.exit(1); });
