import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "jersey_interest_registrations"
      ADD COLUMN IF NOT EXISTS "interested_in_official" boolean DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS "official_kit_size" varchar,
      ADD COLUMN IF NOT EXISTS "interested_in_away" boolean DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS "away_kit_size" varchar,
      ADD COLUMN IF NOT EXISTS "interested_in_reserve" boolean DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS "reserve_kit_size" varchar,
      ADD COLUMN IF NOT EXISTS "selected_kits_summary" varchar,
      ADD COLUMN IF NOT EXISTS "notes" text;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "jersey_interest_registrations"
      DROP COLUMN IF EXISTS "interested_in_official",
      DROP COLUMN IF EXISTS "official_kit_size",
      DROP COLUMN IF EXISTS "interested_in_away",
      DROP COLUMN IF EXISTS "away_kit_size",
      DROP COLUMN IF EXISTS "interested_in_reserve",
      DROP COLUMN IF EXISTS "reserve_kit_size",
      DROP COLUMN IF EXISTS "selected_kits_summary",
      DROP COLUMN IF EXISTS "notes";
  `)
}
