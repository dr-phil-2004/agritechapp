ALTER TABLE "alertes" ADD COLUMN IF NOT EXISTS "recommandation" text;--> statement-breakpoint
ALTER TABLE "alertes" ADD COLUMN IF NOT EXISTS "audio_url" text;--> statement-breakpoint
ALTER TABLE "alertes" ADD COLUMN IF NOT EXISTS "audio_langue" varchar(10);
