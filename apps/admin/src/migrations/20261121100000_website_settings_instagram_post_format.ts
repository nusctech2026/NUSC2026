import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "website_settings_home_page_instagram_posts"
      ADD COLUMN IF NOT EXISTS "format" varchar NOT NULL DEFAULT 'photo';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "website_settings_home_page_instagram_posts"
      DROP COLUMN IF EXISTS "format";
  `)
}
