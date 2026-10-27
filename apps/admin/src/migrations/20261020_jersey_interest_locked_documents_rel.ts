import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS public.payload_locked_documents_rels
      ADD COLUMN IF NOT EXISTS jersey_interest_registrations_id uuid;

    DO $$
    BEGIN
      IF to_regclass('public.payload_locked_documents_rels') IS NOT NULL
        AND to_regclass('public.jersey_interest_registrations') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'payload_locked_documents_rels_jersey_interest_registrations_fk'
            AND conrelid = 'public.payload_locked_documents_rels'::regclass
        )
      THEN
        ALTER TABLE public.payload_locked_documents_rels
          ADD CONSTRAINT payload_locked_documents_rels_jersey_interest_registrations_fk
          FOREIGN KEY (jersey_interest_registrations_id)
          REFERENCES public.jersey_interest_registrations(id)
          ON DELETE CASCADE;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_jersey_interest_registrations_id_idx
      ON public.payload_locked_documents_rels USING btree (jersey_interest_registrations_id);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS public.payload_locked_documents_rels
      DROP CONSTRAINT IF EXISTS payload_locked_documents_rels_jersey_interest_registrations_fk;
    DROP INDEX IF EXISTS public.payload_locked_documents_rels_jersey_interest_registrations_id_idx;
    ALTER TABLE IF EXISTS public.payload_locked_documents_rels
      DROP COLUMN IF EXISTS jersey_interest_registrations_id;
  `)
}
