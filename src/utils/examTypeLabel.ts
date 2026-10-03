// src/utils/examTypeLabel.ts
//
// CANONICAL EXAM TYPES — Government Degree College Lakarai (Intermediate
// 1st Year / 2nd Year). These are the ONLY exam types offered anywhere in
// the admin panel and on public pages:
//   1. "Mid Term"    — college-conducted mid-term examination
//   2. "Annual"      — college-conducted annual examination
//   3. "Board Exam"  — BISE Peshawar board examination (HSSC)
//
// The old school-era options ("1st Semester", "2nd Semester", "Annual-I",
// "Annual-II") have been REMOVED from every dropdown / tab list. They are
// still DISPLAYED correctly if legacy rows with those values exist in the
// database (pass-through below), so old records never break the UI.
//
// Use this ONLY for display (JSX text, PDF/Excel labels, dropdown option
// text). Never use it for .eq("exam_type", ...) queries, localStorage
// keys, or anything read back into the database — those must keep using
// the raw stored values.

/** The exam types every exam-type dropdown in the app offers, in order. */
export const ALL_EXAM_TYPES = ["Mid Term", "Annual", "Board Exam"] as const;

/** Display labels for values whose stored name differs from its label. */
const DISPLAY_LABELS: Record<string, string> = {
  "Mid Term": "Mid Term",
  "Annual": "Annual",
  "Board Exam": "Board Exam",
};

/** Converts an internal exam_type value to its user-facing label.
 *  Passes through unrecognized/legacy values (e.g. "1st Semester")
 *  unchanged so old database rows still render sensibly. */
export function examTypeLabel(examType: string): string {
  return DISPLAY_LABELS[examType] ?? examType;
}

/** Same as examTypeLabel (kept for backward compatibility). */
export function examTypeLabelInText(text: string): string {
  return text;
}
