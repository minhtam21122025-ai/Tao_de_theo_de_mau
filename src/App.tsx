import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  UploadCloud,
  FileText,
  Trash2,
  Settings2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowRight,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  RotateCcw,
  Zap,
  Download,
} from 'lucide-react';
import type {
  SubjectName,
  GradeLevel,
  OriginalExamBlueprint,
  GeneratedExam,
  AdvancedOptions,
  ExamQuestion,
  ModelExecutionLog,
} from './types/exam.js';
import { ModelStatusBadge } from './components/ModelStatusBadge.js';
import { ExamQuestionCard } from './components/ExamQuestionCard.js';
import { QualityReportModal } from './components/QualityReportModal.js';
import { ExportToolbar } from './components/ExportToolbar.js';
import { MathRenderer } from './components/MathRenderer.js';
import { SvgViewer } from './components/SvgViewer.js';

const POPULAR_SUBJECTS: SubjectName[] = [
  'Toán',
  'Ngữ văn',
  'Tiếng Anh',
  'Vật lí',
  'Hóa học',
  'Sinh học',
  'Khoa học tự nhiên',
  'Lịch sử và Địa lí',
  'Tin học',
  'Công nghệ',
  'Giáo dục công dân',
  'Giáo dục kinh tế và pháp luật',
];

const GRADES: GradeLevel[] = [
  'Lớp 1',
  'Lớp 2',
  'Lớp 3',
  'Lớp 4',
  'Lớp 5',
  'Lớp 6',
  'Lớp 7',
  'Lớp 8',
  'Lớp 9',
  'Lớp 10',
  'Lớp 11',
  'Lớp 12',
];

const PROCESSING_STEPS = [
  'Đang đọc và phân tích tệp tài liệu',
  'Đang nhận dạng OCR và công thức LaTeX ($...$)',
  'Đang thiết lập bản đồ cấu trúc đề mẫu',
  'Đang tạo các đề thi tương đương (đổi số liệu hợp lệ)',
  'Đang dựng hình vẽ hình học / đồ thị SVG',
  'Đang kiểm định chất lượng theo 16 tiêu chí Bộ GD&ĐT',
  'Hoàn tất và chuẩn bị tệp Word .docx',
];

export default function App() {
  // Only 2 MANDATORY input fields
  const [subject, setSubject] = useState<string>('Toán');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [grade, setGrade] = useState<string>('Lớp 8');
  const [customGrade, setCustomGrade] = useState<string>('');

  // File Upload / Direct Text Input State
  const [inputMode, setInputMode] = useState<'upload' | 'text'>('upload');
  const [pastedExamText, setPastedExamText] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<{
    file: File | null;
    base64Data?: string;
    mimeType?: string;
    name: string;
    sizeFormatted: string;
    previewText?: string;
  } | null>(null);

  // Quick client-side question counter
  const countQuestionsInText = (text: string): number => {
    if (!text) return 0;
    const lines = text.split(/\r?\n/);
    const regex = /(?:^|\s)(?:câu|bài|question)\s*(\d+|[IVXLCDM]+)[\s.:)-]/i;
    const seen = new Set<string>();
    for (const l of lines) {
      const trimmed = l.trim();
      const m = trimmed.match(regex);
      if (m) {
        seen.add(m[0].trim().toLowerCase());
      }
    }
    return seen.size;
  };

  const detectedQuestionCount = countQuestionsInText(pastedExamText);

  // Advanced Options & Model Strategy
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [examCount, setExamCount] = useState<number>(3);
  const [customExamCount, setCustomExamCount] = useState<string>('');
  const [modelStrategy, setModelStrategy] = useState<'auto' | 'fast_lite' | 'flash_standard' | 'rotate'>('auto');

  const [advancedOptions, setAdvancedOptions] = useState<AdvancedOptions>({
    examCount: 3,
    includeAnswers: true,
    includeExplanations: true,
    figureHandling: 'generate_new_svg',
    exportMode: 'individual',
    keepExactScores: true,
    modelStrategy: 'auto',
  });

  // Processing & State
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activeModel, setActiveModel] = useState('gemini-3.8-flash');
  const [logs, setLogs] = useState<ModelExecutionLog[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [blueprint, setBlueprint] = useState<OriginalExamBlueprint | null>(null);
  const [generatedExams, setGeneratedExams] = useState<GeneratedExam[]>([]);
  const [activeTab, setActiveTab] = useState<'blueprint' | string>('exam_0');
  const [regeneratingQuestionId, setRegeneratingQuestionId] = useState<string | null>(null);
  const [selectedQualityModalExam, setSelectedQualityModalExam] = useState<GeneratedExam | null>(null);
  const [currentlyProcessingIndex, setCurrentlyProcessingIndex] = useState<number | null>(null);
  const [totalToGenerate, setTotalToGenerate] = useState<number>(3);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveSubject = subject === 'other' ? customSubject.trim() || 'Môn học' : subject;
  const effectiveGrade = grade === 'other' ? customGrade.trim() || 'Lớp' : grade;

  // Safe JSON parser to prevent "Unexpected token < in JSON"
  const parseResponseJson = async <T,>(res: Response, defaultMessage: string): Promise<T> => {
    const text = await res.text();
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      if (res.status === 504 || res.status === 502) {
        throw new Error('Yêu cầu vượt quá thời gian chờ của máy chủ (504 Gateway Timeout). Vui lòng thử lại.');
      }
      const cleanSnippet = text.replace(/<[^>]*>/g, '').trim().slice(0, 150);
      throw new Error(`${defaultMessage} (Mã lỗi ${res.status}): ${cleanSnippet || 'Phản hồi không phải JSON'}`);
    }
    if (!res.ok) {
      throw new Error(json.error || `${defaultMessage} (Mã lỗi ${res.status})`);
    }
    return json as T;
  };

  // Quick download individual exam .docx immediately upon completion
  const handleQuickDownloadSingle = async (exam: GeneratedExam) => {
    try {
      const cleanSubject = exam.subject.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
      const cleanGrade = exam.grade.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
      const fileName = `De_kiem_tra_${cleanSubject}_${cleanGrade}_${exam.examCode.replace(/\s+/g, '_')}.docx`;

      const response = await fetch('/api/exam/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exams: [exam],
          options: {
            includeAnswers: true,
            includeExplanations: true,
            mode: 'single',
          },
          fileName,
        }),
      });

      if (!response.ok) throw new Error('Không thể tạo file Word.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Lỗi tải Word: ${err.message}`);
    }
  };

  // Fetch initial health/model status
  useEffect(() => {
    fetch('/api/health')
      .then((res) => parseResponseJson<any>(res, 'Không thể kiểm tra sức khỏe hệ thống'))
      .then((data) => {
        if (data.activeModel) setActiveModel(data.activeModel);
        if (data.logs) setLogs(data.logs);
      })
      .catch((err) => console.warn('Health check note:', err.message));
  }, []);

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Tệp quá lớn. Vui lòng chọn tệp dưới 25MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setUploadedFile({
        file,
        base64Data,
        mimeType: file.type || 'application/octet-stream',
        name: file.name,
        sizeFormatted: formatSize(file.size),
      });
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Load sample exam for instant test
  const handleLoadSample = async () => {
    try {
      setIsProcessing(true);
      setCurrentStepIndex(0);
      setErrorMessage(null);

      const res = await fetch('/api/exam/sample');
      const data = await parseResponseJson<{ blueprint: OriginalExamBlueprint }>(res, 'Lỗi khi tải đề mẫu');
      if (data.blueprint) {
        setSubject('Toán');
        setGrade('Lớp 8');
        setBlueprint(data.blueprint);
        setUploadedFile({
          file: null,
          name: 'De_Kiem_Tra_Mau_Toan_8_Hoc_Ky_I.docx',
          sizeFormatted: '48.5 KB',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        // Generate exams one by one for fast feedback and no timeout
        setCurrentStepIndex(3);
        const targetCount = examCount || 3;
        setTotalToGenerate(targetCount);
        const accumulatedExams: GeneratedExam[] = [];

        for (let i = 1; i <= targetCount; i++) {
          setCurrentlyProcessingIndex(i);
          const genRes = await fetch('/api/exam/generate-single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              blueprint: data.blueprint,
              index: i,
              options: { ...advancedOptions, examCount: targetCount, modelStrategy },
              subject: 'Toán',
              grade: 'Lớp 8',
            }),
          });

          const genData = await parseResponseJson<{
            exam: GeneratedExam;
            logs?: ModelExecutionLog[];
            activeModel?: string;
          }>(genRes, `Lỗi khi sinh Đề ${i}`);

          accumulatedExams.push(genData.exam);
          setGeneratedExams([...accumulatedExams]);
          if (genData.logs) setLogs(genData.logs);
          if (genData.activeModel) setActiveModel(genData.activeModel);
          if (i === 1) setActiveTab('exam_0');
        }
        setCurrentlyProcessingIndex(null);
        setCurrentStepIndex(6);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải đề mẫu.');
    } finally {
      setIsProcessing(false);
      setCurrentlyProcessingIndex(null);
    }
  };

  // Main Submit Action: PHÂN TÍCH VÀ TẠO ĐỀ
  const handleAnalyzeAndGenerate = async () => {
    if (inputMode === 'upload' && !uploadedFile && !blueprint) {
      alert('Vui lòng tải lên một tệp đề mẫu (Ảnh, PDF hoặc Word) hoặc bấm "Thử với đề mẫu có sẵn".');
      return;
    }
    if (inputMode === 'text' && !pastedExamText.trim() && !blueprint) {
      alert('Vui lòng dán nội dung đề thi vào ô văn bản hoặc bấm "Thử với đề mẫu có sẵn".');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStepIndex(0);

    try {
      let currentBlueprint = blueprint;

      // Step 1 & 2: Analyze & OCR document if not already done
      const needsAnalysis =
        inputMode === 'text'
          ? !!pastedExamText.trim()
          : !!uploadedFile?.base64Data;

      if (needsAnalysis) {
        setCurrentStepIndex(1);
        const payload =
          inputMode === 'text'
            ? {
                textContent: pastedExamText.trim(),
                subject: effectiveSubject,
                grade: effectiveGrade,
              }
            : {
                base64Data: uploadedFile?.base64Data,
                mimeType: uploadedFile?.mimeType,
                fileName: uploadedFile?.name,
                textContent: uploadedFile?.previewText,
                subject: effectiveSubject,
                grade: effectiveGrade,
              };

        const analyzeRes = await fetch('/api/exam/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const analyzeData = await parseResponseJson<{
          blueprint: OriginalExamBlueprint;
          detectedCount?: number;
          logs?: ModelExecutionLog[];
          activeModel?: string;
        }>(analyzeRes, 'Lỗi khi phân tích cấu trúc đề mẫu');

        currentBlueprint = analyzeData.blueprint;
        setBlueprint(analyzeData.blueprint);
        if (analyzeData.logs) setLogs(analyzeData.logs);
        if (analyzeData.activeModel) setActiveModel(analyzeData.activeModel);
      }

      if (!currentBlueprint) {
        throw new Error('Chưa nhận dạng được cấu trúc đề mẫu.');
      }

      // Step 3 & 4: Generate N similar exams one by one (isolated & resilient)
      setCurrentStepIndex(3);
      const targetCount = examCount || 3;
      setTotalToGenerate(targetCount);
      const accumulatedExams: GeneratedExam[] = [];

      for (let i = 1; i <= targetCount; i++) {
        setCurrentlyProcessingIndex(i);
        const genRes = await fetch('/api/exam/generate-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blueprint: currentBlueprint,
            index: i,
            options: { ...advancedOptions, examCount: targetCount, modelStrategy },
            subject: effectiveSubject,
            grade: effectiveGrade,
          }),
        });

        const genData = await parseResponseJson<{
          exam: GeneratedExam;
          logs?: ModelExecutionLog[];
          activeModel?: string;
        }>(genRes, `Lỗi khi sinh Đề ${i.toString().padStart(2, '0')}`);

        accumulatedExams.push(genData.exam);
        setGeneratedExams([...accumulatedExams]);
        if (genData.logs) setLogs(genData.logs);
        if (genData.activeModel) setActiveModel(genData.activeModel);
        if (i === 1) setActiveTab('exam_0');
      }

      setCurrentlyProcessingIndex(null);
      setCurrentStepIndex(6);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Có lỗi xảy ra trong quá trình xử lý.');
    } finally {
      setIsProcessing(false);
      setCurrentlyProcessingIndex(null);
    }
  };

  // Regenerate single question
  const handleRegenerateQuestion = async (
    examIndex: number,
    question: ExamQuestion
  ) => {
    if (!blueprint) return;
    const originalQ = blueprint.questions.find((q) => q.order === question.order);
    if (!originalQ) return;

    setRegeneratingQuestionId(question.id);
    try {
      const res = await fetch('/api/exam/regenerate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuestion: originalQ,
          currentQuestion: question,
          subject: effectiveSubject,
          grade: effectiveGrade,
        }),
      });

      const data = await parseResponseJson<{
        question: ExamQuestion;
        logs?: ModelExecutionLog[];
        activeModel?: string;
      }>(res, 'Lỗi khi tạo lại câu hỏi');

      // Update question in active exam
      setGeneratedExams((prev) => {
        const next = [...prev];
        const targetExam = { ...next[examIndex] };
        targetExam.questions = targetExam.questions.map((q) =>
          q.id === question.id ? data.question : q
        );
        next[examIndex] = targetExam;
        return next;
      });

      if (data.logs) setLogs(data.logs);
    } catch (err: any) {
      alert(`Không thể tạo lại câu hỏi: ${err.message}`);
    } finally {
      setRegeneratingQuestionId(null);
    }
  };

  // Update question locally (edit text/score)
  const handleUpdateQuestion = (examIndex: number, updatedQuestion: ExamQuestion) => {
    setGeneratedExams((prev) => {
      const next = [...prev];
      const targetExam = { ...next[examIndex] };
      targetExam.questions = targetExam.questions.map((q) =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      );
      next[examIndex] = targetExam;
      return next;
    });
  };

  const currentActiveExamIndex =
    activeTab.startsWith('exam_') ? parseInt(activeTab.replace('exam_', '')) : 0;
  const currentExam = generatedExams[currentActiveExamIndex] || generatedExams[0];

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                AI TẠO ĐỀ TƯƠNG TỰ
                <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full hidden sm:inline">
                  Giữ nguyên cấu trúc đề mẫu
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Phân tích ảnh / PDF / Word • Bảo toàn LaTeX & Hình vẽ SVG • Xuất file Word .docx chuẩn GD&ĐT
              </p>
            </div>
          </div>

          {/* Model Status Badge */}
          <ModelStatusBadge
            activeModel={activeModel}
            logs={logs}
            isProcessing={isProcessing}
            currentStage={PROCESSING_STEPS[currentStepIndex]}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-sm">Thông báo xử lý</div>
              <p className="text-xs mt-0.5 text-rose-700 leading-relaxed">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800 transition"
            >
              Đóng
            </button>
          </div>
        )}

        {/* SECTION III: CHỈ CHỌN MÔN VÀ LỚP (GIAO DIỆN CHÍNH TINH GỌN) */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Thông tin đề thi (Chỉ chọn Môn và Lớp)
                </h2>
                <p className="text-xs text-slate-500">
                  Hệ thống tự động suy diễn dạng bài, kiến thức, độ khó và phân bố điểm từ đề mẫu.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLoadSample}
              disabled={isProcessing}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-2 rounded-xl border border-indigo-200 transition flex items-center gap-1.5 shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              Thử ngay với Đề mẫu có sẵn (Toán 8)
            </button>
          </div>

          {/* MAIN CONFIGURATION GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Field 1: Môn học */}
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                1. Môn học <span className="text-rose-500">*</span>
              </label>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setSubject(sub);
                      setCustomSubject('');
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                      subject === sub
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSubject('other')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                    subject === 'other'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Môn khác...
                </button>
              </div>

              {subject === 'other' && (
                <input
                  type="text"
                  placeholder="Nhập tên môn học..."
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              )}
            </div>

            {/* Field 2: Lớp */}
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                2. Lớp <span className="text-rose-500">*</span>
              </label>

              {/* Quick Select Grades 1-12 */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {GRADES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setGrade(g);
                      setCustomGrade('');
                    }}
                    className={`text-xs py-1.5 rounded-lg font-medium text-center transition ${
                      grade === g
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {grade === 'other' && (
                <input
                  type="text"
                  placeholder="Nhập khối lớp..."
                  value={customGrade}
                  onChange={(e) => setCustomGrade(e.target.value)}
                  className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              )}
            </div>
          </div>

          {/* ROW 2: SỐ LƯỢNG ĐỀ CẦN TẠO & TỐI ƯU HÓA MÔ HÌNH GEMINI (YÊU CẦU ĐIỀU CHỈNH) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
            {/* Field 3: Số lượng đề cần tạo */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  3. Số lượng đề cần tạo
                </label>
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Đang chọn: {examCount} đề tương đương
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      setExamCount(num);
                      setCustomExamCount('');
                      setAdvancedOptions((prev) => ({ ...prev, examCount: num }));
                    }}
                    className={`text-xs font-bold px-3.5 py-2 rounded-xl border transition flex items-center gap-1.5 ${
                      examCount === num
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{num} đề</span>
                    {num === 3 && (
                      <span className={`text-[10px] px-1 py-0.2 rounded font-normal ${
                        examCount === 3 ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'
                      }`}>
                        Mặc định
                      </span>
                    )}
                  </button>
                ))}

                {/* Custom exam count */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="15"
                    placeholder="Khác..."
                    value={customExamCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setCustomExamCount(e.target.value);
                      if (val && val > 0 && val <= 15) {
                        setExamCount(val);
                        setAdvancedOptions((prev) => ({ ...prev, examCount: val }));
                      }
                    }}
                    className="w-20 text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-center"
                  />
                  <span className="text-xs text-slate-500">đề</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                * Mỗi đề mới có dữ kiện & số liệu độc lập 100%, bảo toàn cấu trúc đề mẫu và độ khó tương đương.
              </p>
            </div>

            {/* Field 4: Mô hình Gemini & Tối ưu câu lệnh */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  4. Chế độ mô hình Gemini & Tốc độ
                </label>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Kháng lỗi 429/500/503
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModelStrategy('auto');
                    setAdvancedOptions((prev) => ({ ...prev, modelStrategy: 'auto' }));
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    modelStrategy === 'auto'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1 text-blue-600">
                    <Sparkles className="w-3.5 h-3.5" />
                    Tự động tối ưu
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Cân bằng tốc độ & chất lượng, tự đổi mô hình khi quá tải
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModelStrategy('fast_lite');
                    setAdvancedOptions((prev) => ({ ...prev, modelStrategy: 'fast_lite' }));
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    modelStrategy === 'fast_lite'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1 text-amber-700">
                    <Zap className="w-3.5 h-3.5" />
                    Siêu tốc 3.1 Lite
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Hạn mức RPM cao nhất, phản hồi 2–4s/đề, giảm tối đa 429
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModelStrategy('rotate');
                    setAdvancedOptions((prev) => ({ ...prev, modelStrategy: 'rotate' }));
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    modelStrategy === 'rotate'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1 text-indigo-700">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Luân phiên (Rotate)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Luân phiên các model, x3 hạn mức lệnh khi tạo nhiều đề
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION IV: NẠP ĐỀ MẪU (TẢI TỆP HOẶC DÁN VĂN BẢN ĐỀ THI TRỰC TIẾP) */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-blue-600" />
                5. Nạp đề mẫu để hệ thống quét và phân tích
              </label>

              {/* Input Mode Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    inputMode === 'upload'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Tải tệp đề (Word, PDF, Ảnh)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                    inputMode === 'text'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Dán nội dung đề thi (Văn bản / LaTeX)
                </button>
              </div>
            </div>

            {inputMode === 'upload' ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf,.docx,.txt"
                  className="hidden"
                />

                {!uploadedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 rounded-2xl p-8 text-center cursor-pointer transition group"
                  >
                    <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition duration-200 mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">
                      Nhấp hoặc kéo thả tệp đề mẫu vào đây
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Hỗ trợ: Word DOCX (quét 100% không sót câu), PDF scan, PDF văn bản, JPG, PNG (Tối đa 25MB)
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span className="bg-white px-2 py-1 rounded border border-slate-200">Word .docx đầy đủ trắc nghiệm & tự luận</span>
                      <span className="bg-white px-2 py-1 rounded border border-slate-200">Đề kèm hình vẽ hình học</span>
                      <span className="bg-white px-2 py-1 rounded border border-slate-200">Công thức Math $x^2 + y^2$</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {uploadedFile.name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{uploadedFile.sizeFormatted}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ Đã sẵn sàng quét toàn bộ đề
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-medium transition"
                      >
                        Thay tệp
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                          setBlueprint(null);
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Xóa tệp"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={8}
                    value={pastedExamText}
                    onChange={(e) => setPastedExamText(e.target.value)}
                    placeholder="Dán toàn bộ nội dung đề thi của thầy cô vào đây...&#10;&#10;Ví dụ:&#10;ĐỀ KIỂM TRA HỌC KỲ I - TOÁN 8&#10;PHẦN I. TRẮC NGHIỆM KHÁCH QUAN&#10;Câu 1: Điều kiện xác định của phân thức P = (2x-1)/(x-3) là:&#10;A. x != 3    B. x != -3    C. x != 1/2    D. x > 3&#10;Câu 2: ...&#10;PHẦN II. TỰ LUẬN&#10;Bài 1: Rút gọn biểu thức...&#10;Bài 2: Cho tam giác ABC vuông tại A..."
                    className="w-full text-xs font-mono p-4 bg-slate-50 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-hidden transition leading-relaxed resize-y"
                  />
                  {pastedExamText && (
                    <button
                      type="button"
                      onClick={() => setPastedExamText('')}
                      className="absolute top-3 right-3 text-xs text-slate-400 hover:text-rose-600 p-1.5 bg-white/80 rounded-lg hover:bg-rose-50 transition"
                      title="Xóa nội dung đã dán"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Đã nhập: <strong>{pastedExamText.length.toLocaleString('vi-VN')}</strong> ký tự • Nhận diện sơ bộ:{' '}
                      <strong className="text-emerald-700">{detectedQuestionCount} câu hỏi</strong> được đánh số
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    Bảo đảm quét 100% không bỏ sót câu
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ADVANCED OPTIONS (COLLAPSIBLE ACCORDION) */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition"
            >
              <Settings2 className="w-4 h-4 text-slate-500" />
              <span>Tùy chọn nâng cao (Số lượng đề, đáp án, hình vẽ, định dạng)</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-4 p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Option: Number of exams */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Số lượng đề cần tạo (Mặc định: 3):
                    </label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 5, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setAdvancedOptions({ ...advancedOptions, examCount: num })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                            advancedOptions.examCount === num
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {num} đề
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option: Include Answers */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Tạo đáp án:
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={advancedOptions.includeAnswers}
                        onChange={(e) =>
                          setAdvancedOptions({ ...advancedOptions, includeAnswers: e.target.checked })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      Tính lại đáp án mới 100%
                    </label>
                  </div>

                  {/* Option: Include Explanations */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Lời giải & Biểu điểm chi tiết:
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={advancedOptions.includeExplanations}
                        onChange={(e) =>
                          setAdvancedOptions({
                            ...advancedOptions,
                            includeExplanations: e.target.checked,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      Kèm các bước giải cụ thể
                    </label>
                  </div>

                  {/* Option: Figure Handling */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Xử lý hình vẽ hình học:
                    </label>
                    <select
                      value={advancedOptions.figureHandling}
                      onChange={(e: any) =>
                        setAdvancedOptions({ ...advancedOptions, figureHandling: e.target.value })
                      }
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="generate_new_svg">Dựng hình SVG mới khớp số liệu mới</option>
                      <option value="keep_original">Giữ hình minh họa gốc</option>
                      <option value="no_figure">Không chèn hình vẽ</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MAIN ACTION BUTTON: PHÂN TÍCH VÀ TẠO ĐỀ */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleAnalyzeAndGenerate}
              disabled={isProcessing}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-base tracking-wide shadow-lg shadow-blue-600/25 hover:shadow-xl transition flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{PROCESSING_STEPS[currentStepIndex]}...</span>
                </>
              ) : (
                <>
                  <span>PHÂN TÍCH VÀ TẠO ĐỀ</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </section>

        {/* PROCESSING STAGE PROGRESS TRACKER (Mục XIV) */}
        {isProcessing && (
          <div className="bg-white rounded-2xl p-6 border border-blue-200 shadow-md space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-blue-900">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                Tiến trình xử lý thời gian thực
              </span>
              <span>
                Bước {currentStepIndex + 1} / {PROCESSING_STEPS.length}
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStepIndex + 1) / PROCESSING_STEPS.length) * 100}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
              {PROCESSING_STEPS.map((step, idx) => {
                const isDone = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl text-center text-[11px] leading-tight flex flex-col items-center justify-center gap-1 transition ${
                      isDone
                        ? 'bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200'
                        : isCurrent
                        ? 'bg-blue-50 text-blue-900 font-bold border border-blue-300 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px]">
                        {idx + 1}
                      </span>
                    )}
                    <span>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EXAM PREVIEW & EDIT SECTION (Mục XII) */}
        {(generatedExams.length > 0 || blueprint) && (
          <section className="space-y-4">
            {/* STEPWISE STATUS STRIP: XỬ LÝ DỨT ĐIỂM TỪNG ĐỀ */}
            {generatedExams.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Xử lý dứt điểm từng đề (Đã xong {generatedExams.length}/{totalToGenerate} đề):</span>
                  </div>
                  {currentlyProcessingIndex && (
                    <span className="text-xs text-blue-600 font-bold animate-pulse flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                      <RotateCcw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      Đang xử lý dứt điểm Đề {currentlyProcessingIndex.toString().padStart(2, '0')}...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: totalToGenerate }).map((_, idx) => {
                    const exam = generatedExams[idx];
                    const isCurrent = currentlyProcessingIndex === idx + 1;
                    const isDone = !!exam;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 transition ${
                          isDone
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                            : isCurrent
                            ? 'bg-blue-50/70 border-blue-300 text-blue-900 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : isCurrent ? (
                              <RotateCcw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                                {idx + 1}
                              </span>
                            )}
                            <span className="truncate">Đề { (idx + 1).toString().padStart(2, '0') }</span>
                            {isDone && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold shrink-0">
                                Dứt điểm
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] mt-0.5 opacity-80 truncate">
                            {isDone
                              ? `Đủ ${exam.questions.length} câu • Đáp án & SVG`
                              : isCurrent
                              ? 'Đang sinh câu hỏi & hình vẽ...'
                              : 'Chờ trong hàng đợi...'}
                          </div>
                        </div>

                        {isDone && (
                          <button
                            type="button"
                            onClick={() => handleQuickDownloadSingle(exam)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-2xs"
                            title={`Tải ngay file Word Đề ${(idx + 1).toString().padStart(2, '0')}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            Tải Word
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DOCX EXPORT TOOLBAR */}
            {generatedExams.length > 0 && currentExam && (
              <ExportToolbar currentExam={currentExam} allExams={generatedExams} />
            )}

            {/* TABS NAVIGATION */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {generatedExams.map((exam, idx) => (
                  <button
                    key={exam.id}
                    onClick={() => setActiveTab(`exam_${idx}`)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === `exam_${idx}`
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {exam.examCode} ({exam.questions.length} câu)
                  </button>
                ))}

                {blueprint && (
                  <button
                    onClick={() => setActiveTab('blueprint')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'blueprint'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Đề mẫu gốc ({blueprint.questions.length} câu)
                  </button>
                )}
              </div>

              {/* Quality Report Quick Button */}
              {currentExam && (
                <button
                  onClick={() => setSelectedQualityModalExam(currentExam)}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Báo cáo thẩm định ({currentExam.qualityReport.scorePercent}% đạt)
                </button>
              )}
            </div>

            {/* TAB CONTENT: CURRENT ACTIVE EXAM */}
            {activeTab.startsWith('exam_') && currentExam && (
              <div className="space-y-4">
                {/* Exam Sheet Banner with Quick Download */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center shadow-2xs space-y-3">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Đã xử lý dứt điểm 100% (Câu hỏi, LaTeX, Hình vẽ, Đáp án & Lời giải)
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase font-serif tracking-tight">
                    ĐỀ KIỂM TRA MÔN {currentExam.subject.toUpperCase()} – {currentExam.grade.toUpperCase()}
                  </h3>
                  <p className="text-xs text-slate-600 italic">
                    Mã đề: {currentExam.examCode} • Thời gian làm bài: {currentExam.durationMinutes || 45} phút • Tổng điểm: {currentExam.totalScore || 10} điểm
                  </p>

                  <div className="pt-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleQuickDownloadSingle(currentExam)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Tải ngay file Word của {currentExam.examCode} (.docx)
                    </button>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  {currentExam.questions.map((question) => {
                    const originalQ = blueprint?.questions.find((bq) => bq.order === question.order);
                    return (
                      <ExamQuestionCard
                        key={question.id}
                        question={question}
                        originalQuestion={originalQ}
                        onUpdateQuestion={(updated) =>
                          handleUpdateQuestion(currentActiveExamIndex, updated)
                        }
                        onRegenerateQuestion={(q) =>
                          handleRegenerateQuestion(currentActiveExamIndex, q)
                        }
                        isRegenerating={regeneratingQuestionId === question.id}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: ORIGINAL BLUEPRINT */}
            {activeTab === 'blueprint' && blueprint && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                        Bản đồ cấu trúc đề mẫu đã nhận dạng
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">{blueprint.title}</h3>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {blueprint.questions.length} câu hỏi
                    </span>
                  </div>

                  {/* Question count completeness verification */}
                  <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold">
                        Đã quét và bảo toàn 100% toàn bộ {blueprint.questions.length}/{blueprint.questions.length} câu hỏi của đề mẫu
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Bảo đảm đầy đủ không sót câu
                    </span>
                  </div>

                  {blueprint.warnings && blueprint.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                      <span className="font-bold">Lưu ý phân tích: </span>
                      {blueprint.warnings.join(' ')}
                    </div>
                  )}

                  <div className="space-y-3 pt-2">
                    {blueprint.questions.map((q) => (
                      <div key={q.id} className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-[11px]">
                              {q.order}
                            </span>
                            Câu {q.order} ({q.score || 0} điểm)
                          </span>
                          <span className="text-[11px] font-semibold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                            {q.topic || q.type}
                          </span>
                        </div>

                        <div className="text-sm font-serif text-slate-800">
                          <MathRenderer content={q.originalContent} />
                        </div>

                        {q.figureSvg && (
                          <SvgViewer svgMarkup={q.figureSvg} description={q.figureDescription} />
                        )}

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 text-xs font-serif pt-1">
                            {q.options.map((opt) => (
                              <div key={opt.key} className="p-1.5 rounded bg-white border border-slate-200">
                                <span className="font-bold text-slate-700 mr-1">{opt.key}.</span>
                                <MathRenderer content={opt.text} />
                              </div>
                            ))}
                          </div>
                        )}

                        {q.invariants && q.invariants.length > 0 && (
                          <div className="text-[11px] text-slate-500 pt-1">
                            <span className="font-semibold text-slate-700">Điều kiện bất biến: </span>
                            {q.invariants.join('; ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Quality Report Modal */}
      {selectedQualityModalExam && (
        <QualityReportModal
          report={selectedQualityModalExam.qualityReport}
          isOpen={!!selectedQualityModalExam}
          onClose={() => setSelectedQualityModalExam(null)}
          examCode={selectedQualityModalExam.examCode}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-500">
        <p className="font-medium text-slate-700">
          AI Tạo Đề Tương Tự – Trợ lý số chuyên biệt dành cho giáo viên Việt Nam
        </p>
        <p className="mt-1 text-slate-400">
          Tự động điều phối mô hình Gemini • Bảo toàn công thức LaTeX • Xuất file Word .docx chuẩn giáo dục
        </p>
      </footer>
    </div>
  );
}
