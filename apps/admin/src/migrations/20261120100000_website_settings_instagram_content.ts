import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "website_settings_home_page_instagram_posts" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "title" varchar,
      "thumbnail_id" uuid,
      "alt_text" varchar,
      "instagram_url" varchar,
      "show_on_homepage" boolean DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS "website_settings_home_page_instagram_reels" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "title" varchar,
      "thumbnail_id" uuid,
      "alt_text" varchar,
      "instagram_url" varchar,
      "show_on_homepage" boolean DEFAULT true
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'website_settings_home_page_instagram_posts_parent_id_fk'
          AND conrelid = 'public.website_settings_home_page_instagram_posts'::regclass
      ) THEN
        ALTER TABLE "website_settings_home_page_instagram_posts"
          ADD CONSTRAINT "website_settings_home_page_instagram_posts_parent_id_fk"
          FOREIGN KEY ("_parent_id")
          REFERENCES "public"."website_settings"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'website_settings_home_page_instagram_posts_thumb_fk'
          AND conrelid = 'public.website_settings_home_page_instagram_posts'::regclass
      ) THEN
        ALTER TABLE "website_settings_home_page_instagram_posts"
          ADD CONSTRAINT "website_settings_home_page_instagram_posts_thumb_fk"
          FOREIGN KEY ("thumbnail_id")
          REFERENCES "public"."website_media"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'website_settings_home_page_instagram_reels_parent_id_fk'
          AND conrelid = 'public.website_settings_home_page_instagram_reels'::regclass
      ) THEN
        ALTER TABLE "website_settings_home_page_instagram_reels"
          ADD CONSTRAINT "website_settings_home_page_instagram_reels_parent_id_fk"
          FOREIGN KEY ("_parent_id")
          REFERENCES "public"."website_settings"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'website_settings_home_page_instagram_reels_thumb_fk'
          AND conrelid = 'public.website_settings_home_page_instagram_reels'::regclass
      ) THEN
        ALTER TABLE "website_settings_home_page_instagram_reels"
          ADD CONSTRAINT "website_settings_home_page_instagram_reels_thumb_fk"
          FOREIGN KEY ("thumbnail_id")
          REFERENCES "public"."website_media"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "website_settings_home_page_instagram_posts_order_idx"
      ON "website_settings_home_page_instagram_posts" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "website_settings_home_page_instagram_posts_parent_id_idx"
      ON "website_settings_home_page_instagram_posts" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "website_settings_home_page_instagram_posts_thumbnail_idx"
      ON "website_settings_home_page_instagram_posts" USING btree ("thumbnail_id");

    CREATE INDEX IF NOT EXISTS "website_settings_home_page_instagram_reels_order_idx"
      ON "website_settings_home_page_instagram_reels" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "website_settings_home_page_instagram_reels_parent_id_idx"
      ON "website_settings_home_page_instagram_reels" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "website_settings_home_page_instagram_reels_thumbnail_idx"
      ON "website_settings_home_page_instagram_reels" USING btree ("thumbnail_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "website_settings_home_page_instagram_posts";
    DROP TABLE IF EXISTS "website_settings_home_page_instagram_reels";
  `)
}
