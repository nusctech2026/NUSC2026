import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "website_settings_home_page_hero_slides" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "image_id" uuid,
      "alt" varchar
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'website_settings_home_page_hero_slides_parent_id_fk'
          AND conrelid = 'public.website_settings_home_page_hero_slides'::regclass
      ) THEN
        ALTER TABLE "website_settings_home_page_hero_slides"
          ADD CONSTRAINT "website_settings_home_page_hero_slides_parent_id_fk"
          FOREIGN KEY ("_parent_id")
          REFERENCES "public"."website_settings"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'website_settings_home_page_hero_slides_image_id_website_media_id_fk'
          AND conrelid = 'public.website_settings_home_page_hero_slides'::regclass
      ) THEN
        ALTER TABLE "website_settings_home_page_hero_slides"
          ADD CONSTRAINT "website_settings_home_page_hero_slides_image_id_website_media_id_fk"
          FOREIGN KEY ("image_id")
          REFERENCES "public"."website_media"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "website_settings_home_page_hero_slides_order_idx"
      ON "website_settings_home_page_hero_slides" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "website_settings_home_page_hero_slides_parent_id_idx"
      ON "website_settings_home_page_hero_slides" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "website_settings_home_page_hero_slides_image_idx"
      ON "website_settings_home_page_hero_slides" USING btree ("image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "website_settings_home_page_hero_slides";
  `)
}
