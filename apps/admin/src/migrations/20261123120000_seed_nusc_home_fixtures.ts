import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    WITH supplied_fixtures (id, opponent, date_time) AS (
      VALUES
        ('8a42d4f4-31c7-4e63-9e7b-202611300001'::uuid, 'Dempo SC', '2026-11-30T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202612070002'::uuid, 'Chanmari FC', '2026-12-07T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202612150003'::uuid, 'Sreenidi Deccan FC', '2026-12-15T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202612190004'::uuid, 'Mohammedan SC', '2026-12-19T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202701040005'::uuid, 'Rajasthan United FC', '2027-01-04T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202701090006'::uuid, 'FC Bengaluru United', '2027-01-09T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202701160007'::uuid, 'Shillong Lajong FC', '2027-01-16T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202703130008'::uuid, 'Samaleswari SC', '2027-03-13T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202703200009'::uuid, 'Real Kashmir FC', '2027-03-20T18:30:00+05:30'::timestamptz)
    )
    INSERT INTO "fixtures" (
      "id",
      "opponent",
      "date_time",
      "home_away",
      "venue",
      "competition",
      "match_status"
    )
    SELECT
      supplied.id,
      supplied.opponent,
      supplied.date_time,
      'home'::"enum_fixtures_home_away",
      'Chümoukedima Football Stadium',
      'IFL',
      'upcoming'::"enum_fixtures_match_status"
    FROM supplied_fixtures AS supplied
    WHERE NOT EXISTS (
      SELECT 1
      FROM "fixtures" AS existing
      WHERE existing."home_away" = 'home'::"enum_fixtures_home_away"
        AND regexp_replace(lower(existing."opponent"), '[^a-z0-9]', '', 'g')
          = regexp_replace(lower(supplied.opponent), '[^a-z0-9]', '', 'g')
        AND existing."date_time" >= '2026-07-01T00:00:00+05:30'::timestamptz
        AND existing."date_time" < '2027-07-01T00:00:00+05:30'::timestamptz
    )
    ON CONFLICT ("id") DO NOTHING;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    WITH seeded_fixtures (id, opponent, date_time) AS (
      VALUES
        ('8a42d4f4-31c7-4e63-9e7b-202611300001'::uuid, 'Dempo SC', '2026-11-30T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202612070002'::uuid, 'Chanmari FC', '2026-12-07T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202612150003'::uuid, 'Sreenidi Deccan FC', '2026-12-15T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202612190004'::uuid, 'Mohammedan SC', '2026-12-19T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202701040005'::uuid, 'Rajasthan United FC', '2027-01-04T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202701090006'::uuid, 'FC Bengaluru United', '2027-01-09T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202701160007'::uuid, 'Shillong Lajong FC', '2027-01-16T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202703130008'::uuid, 'Samaleswari SC', '2027-03-13T18:30:00+05:30'::timestamptz),
        ('8a42d4f4-31c7-4e63-9e7b-202703200009'::uuid, 'Real Kashmir FC', '2027-03-20T18:30:00+05:30'::timestamptz)
    )
    DELETE FROM "fixtures" AS fixture
    USING seeded_fixtures AS seeded
    WHERE fixture."id" = seeded.id
      AND fixture."opponent" = seeded.opponent
      AND fixture."date_time" = seeded.date_time
      AND fixture."home_away" = 'home'::"enum_fixtures_home_away"
      AND fixture."venue" = 'Chümoukedima Football Stadium'
      AND fixture."competition" = 'IFL'
      AND fixture."match_status" = 'upcoming'::"enum_fixtures_match_status"
      AND fixture."score_result" IS NULL
      AND fixture."match_report_id" IS NULL
      AND fixture."home_team_logo_id" IS NULL
      AND fixture."away_team_logo_id" IS NULL;
  `)
}
