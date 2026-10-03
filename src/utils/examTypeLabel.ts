const DISPLAY_LABELS: Record<string, string> = {
  "Mid Term": "Mid Term",
  "Annual Exam": "Annual Exam",
  "Board Exam": "Board Exam",
};
export function examTypeLabel(examType: string): string { return DISPLAY_LABELS[examType] ?? examType; }
export function examTypeLabelInText(text: string): string { return text; }
