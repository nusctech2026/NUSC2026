import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "matches" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "match_benefits" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "matches" CASCADE;
  DROP TABLE "match_benefits" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_matches_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_match_benefits_fk";
  
  DROP INDEX "payload_locked_documents_rels_matches_id_idx";
  DROP INDEX "payload_locked_documents_rels_match_benefits_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "matches_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "match_benefits_id";
  DROP TYPE "public"."enum_matches_status";
  DROP TYPE "public"."enum_match_benefits_discount_type";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_matches_status" AS ENUM('scheduled', 'ongoing', 'completed', 'cancelled');
  CREATE TYPE "public"."enum_match_benefits_discount_type" AS ENUM('percentage', 'fixed');
  CREATE TABLE "matches" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"opponent" varchar NOT NULL,
  	"match_date" timestamp(3) with time zone NOT NULL,
  	"venue" varchar NOT NULL,
  	"ahibi_event_id" varchar,
  	"status" "enum_matches_status" DEFAULT 'scheduled' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "match_benefits" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"match_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"points_cost" numeric NOT NULL,
  	"discount_type" "enum_match_benefits_discount_type" NOT NULL,
  	"discount_value" numeric NOT NULL,
  	"claim_start" timestamp(3) with time zone NOT NULL,
  	"claim_end" timestamp(3) with time zone NOT NULL,
  	"active" boolean DEFAULT true,
  	"max_redemptions_per_member" numeric DEFAULT 1 NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "matches_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "match_benefits_id" uuid;
  ALTER TABLE "match_benefits" ADD CONSTRAINT "match_benefits_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "matches_updated_at_idx" ON "matches" USING btree ("updated_at");
  CREATE INDEX "matches_created_at_idx" ON "matches" USING btree ("created_at");
  CREATE INDEX "match_benefits_match_idx" ON "match_benefits" USING btree ("match_id");
  CREATE INDEX "match_benefits_updated_at_idx" ON "match_benefits" USING btree ("updated_at");
  CREATE INDEX "match_benefits_created_at_idx" ON "match_benefits" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_matches_fk" FOREIGN KEY ("matches_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_match_benefits_fk" FOREIGN KEY ("match_benefits_id") REFERENCES "public"."match_benefits"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_matches_id_idx" ON "payload_locked_documents_rels" USING btree ("matches_id");
  CREATE INDEX "payload_locked_documents_rels_match_benefits_id_idx" ON "payload_locked_documents_rels" USING btree ("match_benefits_id");`)
}
