import type { ClassName } from "./types";
export const CLASS_MAX_MARKS: Record<ClassName, number> = {
  "1st Year": 550,
  "2nd Year": 550,
};
export function classDisplayName(c: ClassName): string { return c; }
export function isCollegeClass(_c: ClassName): boolean { return true; }
export function combinedPairFor(_c: ClassName): [ClassName, ClassName] {
  return ["1st Year", "2nd Year"];
}
export function biseTotalPercentage(totalMarks: number, className: ClassName): number {
  const max = CLASS_MAX_MARKS[className];
  return max ? Math.round((totalMarks / max) * 1000) / 10 : 0;
}
