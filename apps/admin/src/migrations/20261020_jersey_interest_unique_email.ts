import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM "jersey_interest_registrations"
        GROUP BY lower(btrim("email"))
        HAVING count(*) > 1
          AND count(DISTINCT jsonb_build_array(
            "full_name", "phone", "usual_size", "quantity", "contact_consent", "interest_status"
          )) > 1
      ) THEN
        RAISE EXCEPTION 'Cannot enforce unique jersey interest emails: an email has multiple different submissions. Review and resolve those records, then rerun this migration.';
      END IF;
    END $$;

    WITH ranked_interests AS (
      SELECT "id",
        row_number() OVER (
          PARTITION BY lower(btrim("email"))
          ORDER BY "created_at" ASC, "id" ASC
        ) AS duplicate_rank
      FROM "jersey_interest_registrations"
    )
    DELETE FROM "jersey_interest_registrations" AS interests
    USING ranked_interests
    WHERE interests."id" = ranked_interests."id"
      AND ranked_interests.duplicate_rank > 1;

    UPDATE "jersey_interest_registrations"
    SET "email" = lower(btrim("email"));

    DROP INDEX IF EXISTS "jersey_interest_registrations_email_idx";
    CREATE UNIQUE INDEX "jersey_interest_registrations_email_idx"
      ON "jersey_interest_registrations" USING btree ("email");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "jersey_interest_registrations_email_idx";
    CREATE INDEX "jersey_interest_registrations_email_idx"
      ON "jersey_interest_registrations" USING btree ("email");
  `)
}
