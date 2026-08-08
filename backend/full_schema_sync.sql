-- ============================================================
-- Sports Injury Risk Detection - COMPREHENSIVE schema sync
-- Brings an existing Postgres DB up to match the CURRENT database/models.py,
-- regardless of which prior migration state it's actually in.
--
-- Safe to re-run: every step is guarded (IF NOT EXISTS / IF EXISTS / DO
-- blocks checking information_schema first), so running this on a DB
-- that's already fully migrated, partially migrated, or not migrated at
-- all will not error and will not duplicate anything.
--
-- Run the whole file at once:
--   psql -U postgres -d sports_injury_db -f full_schema_sync.sql
-- ============================================================


-- ============================================================
-- TABLE: users
-- No changes needed - this table is entirely new (didn't exist before the
-- multi-user work) and gets created automatically by
-- models.Base.metadata.create_all() in main.py on startup, since
-- create_all() DOES create missing TABLES (it just never ALTERs existing
-- ones). Included here only as a safety net in case it's somehow missing.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    role VARCHAR DEFAULT 'Athlete',
    created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);


-- ============================================================
-- TABLE: athletes
-- Introduced by: database/models.py (multi-user ownership work)
-- Why a migration was needed: athlete_id was originally globally unique;
-- ownership requires a user_id column and a composite (user_id,
-- athlete_id) unique constraint instead, so two different users can each
-- have an athlete "ATH001" without colliding.
-- ============================================================
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS user_id INTEGER;

-- Backfill: assign any pre-existing athlete rows (created before user_id
-- existed) to the FIRST user in the table. Adjust the subquery if you want
-- a specific user instead.
UPDATE athletes
SET user_id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)
WHERE user_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_athletes_user'
    ) THEN
        ALTER TABLE athletes ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE athletes ADD CONSTRAINT fk_athletes_user
            FOREIGN KEY (user_id) REFERENCES users(id);
    END IF;
END $$;

-- Replace the old GLOBAL unique constraint on athlete_id alone (if it still
-- exists) with the new composite (user_id, athlete_id) constraint.
ALTER TABLE athletes DROP CONSTRAINT IF EXISTS athletes_athlete_id_key;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_athlete_user_athlete_id'
    ) THEN
        ALTER TABLE athletes ADD CONSTRAINT uq_athlete_user_athlete_id
            UNIQUE (user_id, athlete_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_athletes_athlete_id ON athletes (athlete_id);
CREATE INDEX IF NOT EXISTS ix_athletes_user_id ON athletes (user_id);


-- ============================================================
-- TABLE: videos
-- Introduced by: database/models.py (multi-user ownership work)
-- Why: the old string athlete_id FK pointed at athletes.athlete_id, which
-- is no longer unique on its own (see above) - Postgres requires an FK to
-- reference a unique/PK column, so this had to become an integer FK to
-- athletes.id (the real primary key) instead.
-- ============================================================
ALTER TABLE videos ADD COLUMN IF NOT EXISTS athlete_pk_id INTEGER;

-- Backfill from the OLD string athlete_id column, only if it still exists.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'videos' AND column_name = 'athlete_id'
    ) THEN
        UPDATE videos v
        SET athlete_pk_id = a.id
        FROM athletes a
        WHERE v.athlete_id = a.athlete_id
          AND v.athlete_pk_id IS NULL;
    END IF;
END $$;

-- Safety check: any videos that still have no athlete_pk_id (orphaned rows
-- whose old athlete_id didn't match any athlete) will BLOCK the NOT NULL
-- step below. If this SELECT returns rows, fix or delete them first.
-- SELECT id, original_filename FROM videos WHERE athlete_pk_id IS NULL;

ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_athlete_id_fkey;
ALTER TABLE videos DROP COLUMN IF EXISTS athlete_id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_videos_athlete'
    ) THEN
        -- Only enforce NOT NULL if there are no NULLs left (otherwise this
        -- intentionally fails loudly rather than silently corrupting data).
        IF NOT EXISTS (SELECT 1 FROM videos WHERE athlete_pk_id IS NULL) THEN
            ALTER TABLE videos ALTER COLUMN athlete_pk_id SET NOT NULL;
        END IF;
        ALTER TABLE videos ADD CONSTRAINT fk_videos_athlete
            FOREIGN KEY (athlete_pk_id) REFERENCES athletes(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_videos_athlete_pk_id ON videos (athlete_pk_id);


-- ============================================================
-- TABLE: analysis_results
-- Introduced by:
--   - athlete_pk_id: database/models.py (multi-user ownership work) -
--     same reasoning as videos.athlete_pk_id above.
--   - biomechanics: database/models.py (persistence work) - needed so the
--     full biomechanics breakdown survives a server restart; GET
--     /analysis/{id} reads it back from Postgres instead of an in-memory
--     cache.
--   - status, error_message: database/models.py (TODAY's async
--     background-processing work) - services/analysis_service.py now
--     creates this row immediately with status="processing" before any
--     actual processing happens, then a background task fills in the real
--     fields and flips status to "completed" (or "failed" + error_message).
--     THIS is the change that caused your current errors, since these two
--     columns didn't exist in your DB yet.
-- ============================================================
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS athlete_pk_id INTEGER;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'analysis_results' AND column_name = 'athlete_id'
    ) THEN
        UPDATE analysis_results ar
        SET athlete_pk_id = a.id
        FROM athletes a
        WHERE ar.athlete_id = a.athlete_id
          AND ar.athlete_pk_id IS NULL;
    END IF;
END $$;

ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS analysis_results_athlete_id_fkey;
ALTER TABLE analysis_results DROP COLUMN IF EXISTS athlete_id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_analysis_results_athlete'
    ) THEN
        IF NOT EXISTS (SELECT 1 FROM analysis_results WHERE athlete_pk_id IS NULL) THEN
            ALTER TABLE analysis_results ALTER COLUMN athlete_pk_id SET NOT NULL;
        END IF;
        ALTER TABLE analysis_results ADD CONSTRAINT fk_analysis_results_athlete
            FOREIGN KEY (athlete_pk_id) REFERENCES athletes(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_analysis_results_athlete_pk_id ON analysis_results (athlete_pk_id);

-- The biomechanics column (needed regardless of async work).
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS biomechanics TEXT;

-- THE TWO COLUMNS FROM TODAY'S ASYNC CHANGE - this is what's actually
-- causing your current "column status/biomechanics does not exist" errors.
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'completed';
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Explicitly make sure every EXISTING row (created before status existed)
-- is marked "completed", not left as NULL or whatever the default applied -
-- they were all produced by the old fully-synchronous pipeline, so they
-- really are done, not "processing".
UPDATE analysis_results SET status = 'completed' WHERE status IS NULL;


-- ============================================================
-- TABLE: reports
-- No schema changes needed in any of this work - untouched throughout.
-- ============================================================


-- ============================================================
-- VERIFY - confirm the final schema matches models.py exactly
-- ============================================================
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN ('users','athletes','videos','analysis_results','reports')
ORDER BY table_name, ordinal_position;