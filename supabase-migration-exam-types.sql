-- ════════════════════════════════════════════════════════════════════
--  supabase-migration-exam-types.sql
--  GDC Lakarai — migrate LEGACY exam-type values to the new scheme.
--
--  NEW OFFICIAL EXAM TYPES (used everywhere in the app):
--      "Mid Term"  ·  "Annual"  ·  "Board Exam"
--
--  OLD school-era values being retired:
--      "1st Semester"  ·  "2nd Semester"  ·  "Annual-I"  ·  "Annual-II"
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → paste this whole file → Run.
--    Safe to re-run: rows already migrated simply match no WHERE clause.
--
--  NOTE: The app also displays legacy values gracefully if they still
--  exist, but running this migration keeps everything consistent under
--  the new naming.
-- ════════════════════════════════════════════════════════════════════

-- 1) results — the main result records
UPDATE results SET exam_type = 'Mid Term' WHERE exam_type IN ('1st Semester', 'Annual-I');
UPDATE results SET exam_type = 'Annual'   WHERE exam_type IN ('2nd Semester', 'Annual-II');

-- 2) exam_schedule — the date sheet
UPDATE exam_schedule SET exam_type = 'Mid Term' WHERE exam_type IN ('1st Semester', 'Annual-I');
UPDATE exam_schedule SET exam_type = 'Annual'   WHERE exam_type IN ('2nd Semester', 'Annual-II');

-- 3) exam_roll_sessions — roll-number slip sessions (exam_term column)
UPDATE exam_roll_sessions
SET exam_term = 'Mid Term'
WHERE exam_term ILIKE '%1st semester%' OR exam_term ILIKE '%annual-i%';
UPDATE exam_roll_sessions
SET exam_term = 'Annual'
WHERE exam_term ILIKE '%2nd semester%' OR exam_term ILIKE '%annual-ii%';

-- 4) merit_lists — published merit list records
UPDATE merit_lists
SET exam_type = 'Mid Term'
WHERE exam_type IN ('1st Semester', 'Annual-I') AND scope <> 'school-bise';
UPDATE merit_lists
SET exam_type = 'Annual'
WHERE exam_type IN ('2nd Semester', 'Annual-II') AND scope <> 'school-bise';

-- 5) school_settings — make sure the official establishment year is 2004
UPDATE school_settings
SET established_year = 2004
WHERE established_year IS DISTINCT FROM 2004;

-- 6) school_settings — make sure the school name is the college's
UPDATE school_settings
SET school_name = 'Government Degree College Lakarai'
WHERE school_name IS NULL OR school_name = '' OR school_name ILIKE '%babi khel%';

-- Done. Every legacy exam-type row now uses: Mid Term / Annual / Board Exam.
