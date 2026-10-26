export type SubjectName =
  | 'Toán'
  | 'Ngữ văn'
  | 'Tiếng Anh'
  | 'Khoa học tự nhiên'
  | 'Lịch sử và Địa lí'
  | 'Vật lí'
  | 'Hóa học'
  | 'Sinh học'
  | 'Tin học'
  | 'Công nghệ'
  | 'Giáo dục công dân'
  | 'Giáo dục kinh tế và pháp luật'
  | string;

export type GradeLevel =
  | 'Lớp 1'
  | 'Lớp 2'
  | 'Lớp 3'
  | 'Lớp 4'
  | 'Lớp 5'
  | 'Lớp 6'
  | 'Lớp 7'
  | 'Lớp 8'
  | 'Lớp 9'
  | 'Lớp 10'
  | 'Lớp 11'
  | 'Lớp 12'
  | string;

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_in_blank'
  | 'short_answer'
  | 'essay'
  | 'proof'
  | 'other';

export type DifficultyLevel =
  | 'nhan_biet'
  | 'thong_hieu'
  | 'van_dung'
  | 'van_dung_cao';

export interface MultipleChoiceOption {
  key: 'A' | 'B' | 'C' | 'D' | string;
  text: string;
}

export interface QuestionBlueprint {
  id: string;
  order: number;
  partTitle?: string;
  originalContent: string;
  type: QuestionType;
  options?: MultipleChoiceOption[];
  correctAnswer?: string;
  score?: number;
  topic?: string;
  difficulty?: DifficultyLevel;
  variables?: string[];
  invariants?: string[];
  hasFigure?: boolean;
  figureDescription?: string;
  figureSvg?: string;
  hasTable?: boolean;
  tableData?: string[][];
  verificationRule?: string;
}

export interface OriginalExamBlueprint {
  title: string;
  detectedSubject: string;
  detectedGrade: string;
  durationMinutes?: number;
  totalScore?: number;
  sections: {
    id: string;
    title: string;
    description?: string;
    questionIds: string[];
  }[];
  questions: QuestionBlueprint[];
  rawTextPreview?: string;
  transcribedLatexText?: string;
  warnings?: string[];
}

export interface ExamQuestion {
  id: string;
  order: number;
  originalId: string;
  partTitle?: string;
  type: QuestionType;
  content: string; // Contains LaTeX in $...$
  options?: MultipleChoiceOption[];
  correctAnswer: string;
  explanation: string;
  score: number;
  topic?: string;
  difficulty: DifficultyLevel;
  figureSvg?: string;
  figureDescription?: string;
  hasTable?: boolean;
  tableData?: string[][];
}

export interface QualityCheckItem {
  id: string;
  label: string;
  passed: boolean;
  note?: string;
}

export interface QualityReport {
  overallPassed: boolean;
  scorePercent: number;
  checks: QualityCheckItem[];
  warnings: string[];
  summary: string;
}

export interface GeneratedExam {
  id: string;
  examCode: string; // e.g. "Đề 01", "Mã đề 101"
  title: string;
  subject: string;
  grade: string;
  durationMinutes: number;
  totalScore: number;
  questions: ExamQuestion[];
  qualityReport: QualityReport;
  createdAt: string;
}

export interface AdvancedOptions {
  examCount: number; // 1 - 10, default 3
  includeAnswers: boolean; // default true
  includeExplanations: boolean; // default true
  figureHandling: 'generate_new_svg' | 'keep_original' | 'no_figure'; // default generate_new_svg
  exportMode: 'individual' | 'combined' | 'answers_separate' | 'exam_and_answers';
  keepExactScores: boolean;
  modelStrategy?: 'auto' | 'fast_lite' | 'flash_standard' | 'rotate';
}

export interface ModelExecutionLog {
  timestamp: string;
  model: string;
  status: 'info' | 'success' | 'warning' | 'error' | 'fallback';
  message: string;
  latencyMs?: number;
}
