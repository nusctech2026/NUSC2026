import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE "jersey_interest_registrations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "full_name" varchar NOT NULL,
      "email" varchar NOT NULL,
      "phone" varchar,
      "usual_size" varchar,
      "quantity" numeric DEFAULT 1 NOT NULL,
      "contact_consent" boolean DEFAULT false NOT NULL,
      "interest_status" varchar DEFAULT 'new' NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX "jersey_interest_registrations_email_idx" ON "jersey_interest_registrations" USING btree ("email");
    CREATE INDEX "jersey_interest_registrations_updated_at_idx" ON "jersey_interest_registrations" USING btree ("updated_at");
    CREATE INDEX "jersey_interest_registrations_created_at_idx" ON "jersey_interest_registrations" USING btree ("created_at");
    ALTER TABLE "jersey_interest_registrations" ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE "jersey_interest_registrations" FROM anon, authenticated;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE "jersey_interest_registrations";`)
}
