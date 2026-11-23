import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "website_videos" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "title" varchar NOT NULL,
      "_objectkey" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric
    );

    ALTER TABLE "website_videos"
      ADD COLUMN IF NOT EXISTS "_objectkey" varchar;

    ALTER TABLE "website_settings_home_page_instagram_reels"
      ADD COLUMN IF NOT EXISTS "video_id" uuid;
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "website_videos_id" uuid;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'website_settings_home_page_instagram_reels_video_fk'
          AND conrelid = 'public.website_settings_home_page_instagram_reels'::regclass
      ) THEN
        ALTER TABLE "website_settings_home_page_instagram_reels"
          ADD CONSTRAINT "website_settings_home_page_instagram_reels_video_fk"
          FOREIGN KEY ("video_id") REFERENCES "public"."website_videos"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payload_locked_documents_rels_website_videos_fk'
          AND conrelid = 'public.payload_locked_documents_rels'::regclass
      ) THEN
        ALTER TABLE "payload_locked_documents_rels"
          ADD CONSTRAINT "payload_locked_documents_rels_website_videos_fk"
          FOREIGN KEY ("website_videos_id") REFERENCES "public"."website_videos"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS "website_videos_updated_at_idx"
      ON "website_videos" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "website_videos_created_at_idx"
      ON "website_videos" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "website_videos_filename_idx"
      ON "website_videos" USING btree ("filename");
    CREATE INDEX IF NOT EXISTS "website_settings_home_page_instagram_reels_video_idx"
      ON "website_settings_home_page_instagram_reels" USING btree ("video_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_website_videos_id_idx"
      ON "payload_locked_documents_rels" USING btree ("website_videos_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "website_settings_home_page_instagram_reels"
      DROP CONSTRAINT IF EXISTS "website_settings_home_page_instagram_reels_video_fk";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_website_videos_fk";

    DROP INDEX IF EXISTS "website_settings_home_page_instagram_reels_video_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_website_videos_id_idx";
    DROP INDEX IF EXISTS "website_videos_updated_at_idx";
    DROP INDEX IF EXISTS "website_videos_created_at_idx";
    DROP INDEX IF EXISTS "website_videos_filename_idx";

    ALTER TABLE "website_settings_home_page_instagram_reels"
      DROP COLUMN IF EXISTS "video_id";
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "website_videos_id";
    DROP TABLE IF EXISTS "website_videos";
  `)
}
