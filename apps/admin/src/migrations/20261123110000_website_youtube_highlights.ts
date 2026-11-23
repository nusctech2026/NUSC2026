import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "website_settings_home_page_youtube_highlights" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "video_url" varchar,
      "title" varchar,
      "category" varchar
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'website_settings_home_page_youtube_highlights_parent_id_fk'
          AND conrelid = 'public.website_settings_home_page_youtube_highlights'::regclass
      ) THEN
        ALTER TABLE "website_settings_home_page_youtube_highlights"
          ADD CONSTRAINT "website_settings_home_page_youtube_highlights_parent_id_fk"
          FOREIGN KEY ("_parent_id")
          REFERENCES "public"."website_settings"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "website_settings_home_page_youtube_highlights_order_idx"
      ON "website_settings_home_page_youtube_highlights" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "website_settings_home_page_youtube_highlights_parent_id_idx"
      ON "website_settings_home_page_youtube_highlights" USING btree ("_parent_id");

    INSERT INTO "website_settings_home_page_youtube_highlights"
      ("_order", "_parent_id", "id", "video_url", "title", "category")
    SELECT
      highlight.display_order,
      settings."id",
      gen_random_uuid()::text,
      highlight.video_url,
      highlight.title,
      highlight.category
    FROM "website_settings" AS settings
    CROSS JOIN (VALUES
      (1, 'https://www.youtube.com/watch?v=5Gset6wtHkU', 'NUSC vs Aizawl FC', 'Match highlights'),
      (2, 'https://www.youtube.com/watch?v=E8vDDIPQqY0', 'Official NUSC jersey reveal', 'Club stories')
    ) AS highlight(display_order, video_url, title, category)
    WHERE NOT EXISTS (
      SELECT 1
      FROM "website_settings_home_page_youtube_highlights" AS existing
      WHERE existing."_parent_id" = settings."id"
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "website_settings_home_page_youtube_highlights";
  `)
}
