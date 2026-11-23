import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "fixtures"
      ADD COLUMN IF NOT EXISTS "home_team_logo_id" uuid,
      ADD COLUMN IF NOT EXISTS "away_team_logo_id" uuid;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fixtures_home_team_logo_id_website_media_id_fk'
          AND conrelid = 'public.fixtures'::regclass
      ) THEN
        ALTER TABLE "fixtures"
          ADD CONSTRAINT "fixtures_home_team_logo_id_website_media_id_fk"
          FOREIGN KEY ("home_team_logo_id")
          REFERENCES "public"."website_media"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fixtures_away_team_logo_id_website_media_id_fk'
          AND conrelid = 'public.fixtures'::regclass
      ) THEN
        ALTER TABLE "fixtures"
          ADD CONSTRAINT "fixtures_away_team_logo_id_website_media_id_fk"
          FOREIGN KEY ("away_team_logo_id")
          REFERENCES "public"."website_media"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "fixtures_home_team_logo_idx"
      ON "fixtures" USING btree ("home_team_logo_id");
    CREATE INDEX IF NOT EXISTS "fixtures_away_team_logo_idx"
      ON "fixtures" USING btree ("away_team_logo_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "fixtures"
      DROP CONSTRAINT IF EXISTS "fixtures_home_team_logo_id_website_media_id_fk",
      DROP CONSTRAINT IF EXISTS "fixtures_away_team_logo_id_website_media_id_fk";

    DROP INDEX IF EXISTS "fixtures_home_team_logo_idx";
    DROP INDEX IF EXISTS "fixtures_away_team_logo_idx";

    ALTER TABLE "fixtures"
      DROP COLUMN IF EXISTS "home_team_logo_id",
      DROP COLUMN IF EXISTS "away_team_logo_id";
  `)
}
