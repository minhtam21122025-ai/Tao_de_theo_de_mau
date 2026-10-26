import React, { useState } from 'react';
import { Download, FileText, CheckCircle, Files, BookOpen, UserCheck, Layers } from 'lucide-react';
import type { GeneratedExam } from '../types/exam.js';

interface ExportToolbarProps {
  currentExam: GeneratedExam;
  allExams: GeneratedExam[];
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({ currentExam, allExams }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleExport = async (
    mode: 'exam_only' | 'all_exams_only' | 'answers_only' | 'exam_and_answers' | 'all_combined'
  ) => {
    setIsExporting(true);
    setDownloadSuccess(null);

    try {
      const isSingleExam = mode === 'exam_only' || mode === 'exam_and_answers';
      const examsToExport = isSingleExam ? [currentExam] : allExams;
      const cleanSubject = currentExam.subject.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
      const cleanGrade = currentExam.grade.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');

      let fileName = '';
      let includeAnswers = false;

      if (mode === 'exam_only') {
        fileName = `De_rieng_${cleanSubject}_${cleanGrade}_${currentExam.examCode.replace(/\s+/g, '_')}.docx`;
        includeAnswers = false;
      } else if (mode === 'all_exams_only') {
        fileName = `Bo_de_rieng_cho_hoc_sinh_${cleanSubject}_${cleanGrade}_(${allExams.length}_de).docx`;
        includeAnswers = false;
      } else if (mode === 'answers_only') {
        fileName = `Dap_an_huong_dan_giai_${cleanSubject}_${cleanGrade}.docx`;
        includeAnswers = true;
      } else if (mode === 'exam_and_answers') {
        fileName = `De_va_dap_an_${cleanSubject}_${cleanGrade}_${currentExam.examCode.replace(/\s+/g, '_')}.docx`;
        includeAnswers = true;
      } else {
        fileName = `Bo_de_kem_dap_an_${cleanSubject}_${cleanGrade}_(${allExams.length}_de).docx`;
        includeAnswers = true;
      }

      const response = await fetch('/api/exam/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exams: examsToExport,
          options: {
            includeAnswers,
            includeExplanations: includeAnswers,
            mode,
          },
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi từ máy chủ khi tạo file Word.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      const label =
        mode === 'exam_only' || mode === 'all_exams_only'
          ? 'Đề riêng (cho học sinh)'
          : mode === 'answers_only'
          ? 'Đáp án riêng'
          : 'Đề kèm đáp án';
      setDownloadSuccess(`Đã tải thành công ${label}: ${fileName}`);
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err: any) {
      alert(`Không thể tải tệp DOCX: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Khu vực tải đề về (.docx chuẩn Bộ GD&ĐT)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhúng trực tiếp hình vẽ minh họa / đồ thị sắc nét vào trang Word, font Times New Roman, bảo toàn công thức LaTeX
          </p>
        </div>

        {downloadSuccess && (
          <div className="p-2 px-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            {downloadSuccess}
          </div>
        )}
      </div>

      {/* 3 Dedicated Download Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* MỤC 1: TẢI ĐỀ RIÊNG (DÀNH CHO HỌC SINH LÀM BÀI / IN ĐỀ - KHÔNG ĐÁP ÁN) */}
        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Mục 1: Tải đề riêng
              </span>
              <span className="text-[10px] font-bold bg-blue-200/80 text-blue-800 px-2 py-0.5 rounded-full">
                Không đáp án
              </span>
            </div>
            <p className="text-[11px] text-blue-800/80 mt-1 leading-snug">
              Chỉ có đề bài, thang điểm và hình vẽ. Dành để in phát học sinh làm bài thi.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <button
              onClick={() => handleExport('exam_only')}
              disabled={isExporting}
              className="w-full px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Tải đề riêng ({currentExam.examCode})
            </button>

            {allExams.length > 1 && (
              <button
                onClick={() => handleExport('all_exams_only')}
                disabled={isExporting}
                className="w-full px-3.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold rounded-lg border border-blue-300 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Layers className="w-3.5 h-3.5 text-blue-700" />
                Tải toàn bộ {allExams.length} đề riêng
              </button>
            )}
          </div>
        </div>

        {/* MỤC 2: TẢI ĐÁP ÁN RIÊNG (DÀNH CHO GIÁO VIÊN CHẤM THI) */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-slate-600" />
                Mục 2: Tải đáp án riêng
              </span>
              <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                Chấm thi
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1 leading-snug">
              Bảng ma trận đáp án trắc nghiệm và thang điểm chi tiết cho phần tự luận.
            </p>
          </div>

          <div className="pt-1">
            <button
              onClick={() => handleExport('answers_only')}
              disabled={isExporting}
              className="w-full px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Tải đáp án & lời giải riêng
            </button>
          </div>
        </div>

        {/* MỤC 3: ĐỀ KÈM ĐÁP ÁN (BỘ HOÀN CHỈNH ĐỂ LƯU TRỮ HỒ SƠ) */}
        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Mục 3: Đề kèm đáp án
              </span>
              <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full">
                Hồ sơ lưu trữ
              </span>
            </div>
            <p className="text-[11px] text-emerald-800/80 mt-1 leading-snug">
              Bao gồm đề thi đầy đủ và bảng đáp án + lời giải ở các trang cuối.
            </p>
          </div>

          <div className="space-y-1.5 pt-1">
            <button
              onClick={() => handleExport('exam_and_answers')}
              disabled={isExporting}
              className="w-full px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Đề kèm đáp án ({currentExam.examCode})
            </button>

            {allExams.length > 1 && (
              <button
                onClick={() => handleExport('all_combined')}
                disabled={isExporting}
                className="w-full px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-300 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Files className="w-3.5 h-3.5 text-emerald-700" />
                Trọn bộ {allExams.length} đề kèm đáp án
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
