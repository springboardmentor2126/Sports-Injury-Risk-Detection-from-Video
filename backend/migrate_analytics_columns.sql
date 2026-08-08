-- ============================================================
-- Admin Analytics Dashboard - adds two denormalized columns for SQL
-- aggregation. Safe to re-run (idempotent).
-- ============================================================
 
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS overall_risk_score_numeric DOUBLE PRECISION;
ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS risk_level VARCHAR;
 
CREATE INDEX IF NOT EXISTS ix_analysis_results_overall_risk_score_numeric
    ON analysis_results (overall_risk_score_numeric);
CREATE INDEX IF NOT EXISTS ix_analysis_results_risk_level
    ON analysis_results (risk_level);
 
-- Backfill historical rows by parsing their existing overall_risk_score
-- JSON text. Uses a per-row loop with exception handling so one corrupted
-- legacy row (we know a few exist from before an earlier bugfix in this
-- project) can't abort the whole backfill - it's just skipped and logged.
DO $$
DECLARE
    r RECORD;
    parsed JSON;
BEGIN
    FOR r IN
        SELECT id, overall_risk_score
        FROM analysis_results
        WHERE overall_risk_score IS NOT NULL
          AND overall_risk_score_numeric IS NULL
    LOOP
        BEGIN
            parsed := r.overall_risk_score::JSON;
            UPDATE analysis_results
            SET overall_risk_score_numeric = (parsed->>'overall_score')::DOUBLE PRECISION,
                risk_level = parsed->>'risk_level'
            WHERE id = r.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped analysis_results.id=% - could not parse overall_risk_score (%)', r.id, SQLERRM;
        END;
    END LOOP;
END $$;
 
-- Verify
SELECT id, overall_risk_score_numeric, risk_level, status
FROM analysis_results
ORDER BY id;
 