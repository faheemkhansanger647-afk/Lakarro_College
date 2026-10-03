// Shared types for the college Report Card bulk-result feature.
export interface RollEntry { roll: string; addedAt: number; }
export interface SubjectMark {
  sr: string; subject: string; theory: string; practical: string;
  theory_fail: boolean; practical_fail: boolean;
}
export interface BisepResult {
  found: boolean; roll_no?: string; name?: string; father_name?: string;
  marks?: string; grade?: string; remarks?: string; collect_dmc_from?: string;
  subjects?: SubjectMark[]; message?: string; error?: string;
}
export interface NormalizedResult {
  roll: string; found: boolean; name: string; fatherName: string; rawMarks: string;
  grade: string; remarks: string; subjects: ParsedSubject[]; totalMarks: number;
  percentage: number; isFail: boolean; failedSubjectCount: number; error?: string;
}
export interface ParsedSubject {
  name: string; theory: number | null; practical: number | null;
  theoryFail: boolean; practicalFail: boolean; isFail: boolean;
}
export type ClassName = "1st Year" | "2nd Year";
export interface ExamSelection {
  schoolName: string; className: ClassName;
  examType: "Mid Term" | "Annual Exam" | "Board Exam"; year: string;
}
export interface ResultStats {
  totalStudents: number; foundCount: number; notFoundCount: number; errorCount: number;
  passCount: number; failCount: number; passPercentage: number; averageMarks: number;
  highestMarks: number; lowestMarks: number; topScorerName: string; topScorerRoll: string;
  subjectPassRates: Record<string, { pass: number; fail: number; rate: number }>;
}
export type ProgressCallback = (done: number, total: number, currentRoll: string) => void;
