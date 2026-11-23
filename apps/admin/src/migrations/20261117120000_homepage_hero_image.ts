import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "website_settings"
      ADD COLUMN IF NOT EXISTS "home_page_hero_image_id" uuid;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'website_settings_home_page_hero_image_id_website_media_id_fk'
          AND conrelid = 'public.website_settings'::regclass
      ) THEN
        ALTER TABLE "website_settings"
          ADD CONSTRAINT "website_settings_home_page_hero_image_id_website_media_id_fk"
          FOREIGN KEY ("home_page_hero_image_id")
          REFERENCES "public"."website_media"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "website_settings_home_page_hero_image_idx"
      ON "website_settings" USING btree ("home_page_hero_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "website_settings"
      DROP CONSTRAINT IF EXISTS "website_settings_home_page_hero_image_id_website_media_id_fk";

    DROP INDEX IF EXISTS "website_settings_home_page_hero_image_idx";

    ALTER TABLE "website_settings"
      DROP COLUMN IF EXISTS "home_page_hero_image_id";
  `)
}
