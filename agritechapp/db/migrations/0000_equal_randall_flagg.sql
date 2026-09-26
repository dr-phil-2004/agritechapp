CREATE TABLE "alertes" (
	"id" serial PRIMARY KEY NOT NULL,
	"signalement_id" integer NOT NULL,
	"rayon_km" integer DEFAULT 10 NOT NULL,
	"declenchee_par" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "annonces" (
	"id" serial PRIMARY KEY NOT NULL,
	"producteur_id" integer NOT NULL,
	"produit" text NOT NULL,
	"quantite" integer NOT NULL,
	"prix" integer NOT NULL,
	"photo_url" text,
	"statut" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communes" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"departement" text NOT NULL,
	"geom" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contenus" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"titre" text NOT NULL,
	"texte" text,
	"pictogramme" text
);
--> statement-breakpoint
CREATE TABLE "contenus_audio" (
	"id" serial PRIMARY KEY NOT NULL,
	"contenu_id" integer NOT NULL,
	"langue" text NOT NULL,
	"audio_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "envois" (
	"id" serial PRIMARY KEY NOT NULL,
	"alerte_id" integer NOT NULL,
	"destinataire_id" integer NOT NULL,
	"canal" text NOT NULL,
	"langue" text NOT NULL,
	"statut" text DEFAULT 'envoye' NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profils" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"nom" text NOT NULL,
	"telephone" text NOT NULL,
	"langue" text NOT NULL,
	"a_smartphone" boolean DEFAULT true NOT NULL,
	"commune_id" integer,
	"position" text,
	"inscrit_par" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "profils_telephone_unique" UNIQUE("telephone")
);
--> statement-breakpoint
CREATE TABLE "ravageurs" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"culture" text NOT NULL,
	"description" text,
	"pictogramme" text
);
--> statement-breakpoint
CREATE TABLE "signalements" (
	"id" serial PRIMARY KEY NOT NULL,
	"producteur_id" integer NOT NULL,
	"position" text NOT NULL,
	"photo_url" text,
	"audio_url" text,
	"canal_origine" text NOT NULL,
	"statut" text DEFAULT 'signale' NOT NULL,
	"ravageur_id" integer,
	"gravite" text,
	"conseiller_id" integer,
	"created_at" timestamp DEFAULT now(),
	"confirme_at" timestamp,
	"traite_at" timestamp,
	"clos_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tentatives_connexion" (
	"id" serial PRIMARY KEY NOT NULL,
	"telephone" text NOT NULL,
	"nb_echecs" integer DEFAULT 0 NOT NULL,
	"bloque_jusqu_a" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ventes_declarees" (
	"id" serial PRIMARY KEY NOT NULL,
	"annonce_id" integer NOT NULL,
	"acheteur_id" integer NOT NULL,
	"montant" integer NOT NULL,
	"redevance" integer NOT NULL,
	"numero_recu" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ventes_declarees_numero_recu_unique" UNIQUE("numero_recu")
);
--> statement-breakpoint
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_signalement_id_signalements_id_fk" FOREIGN KEY ("signalement_id") REFERENCES "public"."signalements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertes" ADD CONSTRAINT "alertes_declenchee_par_profils_id_fk" FOREIGN KEY ("declenchee_par") REFERENCES "public"."profils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annonces" ADD CONSTRAINT "annonces_producteur_id_profils_id_fk" FOREIGN KEY ("producteur_id") REFERENCES "public"."profils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contenus_audio" ADD CONSTRAINT "contenus_audio_contenu_id_contenus_id_fk" FOREIGN KEY ("contenu_id") REFERENCES "public"."contenus"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envois" ADD CONSTRAINT "envois_alerte_id_alertes_id_fk" FOREIGN KEY ("alerte_id") REFERENCES "public"."alertes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envois" ADD CONSTRAINT "envois_destinataire_id_profils_id_fk" FOREIGN KEY ("destinataire_id") REFERENCES "public"."profils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profils" ADD CONSTRAINT "profils_commune_id_communes_id_fk" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profils" ADD CONSTRAINT "profils_inscrit_par_profils_id_fk" FOREIGN KEY ("inscrit_par") REFERENCES "public"."profils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_producteur_id_profils_id_fk" FOREIGN KEY ("producteur_id") REFERENCES "public"."profils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_ravageur_id_ravageurs_id_fk" FOREIGN KEY ("ravageur_id") REFERENCES "public"."ravageurs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signalements" ADD CONSTRAINT "signalements_conseiller_id_profils_id_fk" FOREIGN KEY ("conseiller_id") REFERENCES "public"."profils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventes_declarees" ADD CONSTRAINT "ventes_declarees_annonce_id_annonces_id_fk" FOREIGN KEY ("annonce_id") REFERENCES "public"."annonces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventes_declarees" ADD CONSTRAINT "ventes_declarees_acheteur_id_profils_id_fk" FOREIGN KEY ("acheteur_id") REFERENCES "public"."profils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "communes_geom_idx" ON "communes" USING gist (ST_GeomFromText("geom"));--> statement-breakpoint
CREATE INDEX "profils_position_idx" ON "profils" USING gist (ST_GeomFromText("position"));--> statement-breakpoint
CREATE INDEX "signalements_position_idx" ON "signalements" USING gist (ST_GeomFromText("position"));