import React, { useState } from 'react';
import { Download, FileText, CheckCircle, Files, BookOpen } from 'lucide-react';
import type { GeneratedExam } from '../types/exam.js';

interface ExportToolbarProps {
  currentExam: GeneratedExam;
  allExams: GeneratedExam[];
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({ currentExam, allExams }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleExport = async (
    mode: 'single' | 'all_combined' | 'answers_only' | 'exam_and_answers'
  ) => {
    setIsExporting(true);
    setDownloadSuccess(null);

    try {
      const examsToExport = mode === 'single' ? [currentExam] : allExams;
      const cleanSubject = currentExam.subject.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
      const cleanGrade = currentExam.grade.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');

      let fileName = '';
      if (mode === 'single') {
        fileName = `De_kiem_tra_${cleanSubject}_${cleanGrade}_${currentExam.examCode.replace(/\s+/g, '_')}.docx`;
      } else if (mode === 'all_combined') {
        fileName = `Bo_de_kiem_tra_${cleanSubject}_${cleanGrade}_(${allExams.length}_de).docx`;
      } else if (mode === 'answers_only') {
        fileName = `Dap_an_huong_dan_giai_${cleanSubject}_${cleanGrade}.docx`;
      } else {
        fileName = `Bo_de_kem_dap_an_${cleanSubject}_${cleanGrade}.docx`;
      }

      const response = await fetch('/api/exam/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exams: examsToExport,
          options: {
            includeAnswers: mode !== 'single',
            includeExplanations: true,
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

      setDownloadSuccess(`Đã tải thành công: ${fileName}`);
      setTimeout(() => setDownloadSuccess(null), 5000);
    } catch (err: any) {
      alert(`Không thể tải tệp DOCX: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Xuất file Word DOCX (chuẩn Bộ GD&ĐT)
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhúng trực tiếp hình vẽ minh họa / đồ thị sắc nét vào trang Word, font Times New Roman, bảo toàn LaTeX
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Current Exam */}
          <button
            onClick={() => handleExport('single')}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Tải {currentExam.examCode} (.docx)
          </button>

          {/* Export All Exams */}
          {allExams.length > 1 && (
            <button
              onClick={() => handleExport('all_combined')}
              disabled={isExporting}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Files className="w-3.5 h-3.5" />
              Tải toàn bộ {allExams.length} đề (.docx)
            </button>
          )}

          {/* Export Answers Only */}
          <button
            onClick={() => handleExport('answers_only')}
            disabled={isExporting}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            Tải đáp án & lời giải riêng
          </button>

          {/* Export Exam + Answers */}
          <button
            onClick={() => handleExport('exam_and_answers')}
            disabled={isExporting}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            Đề kèm đáp án
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          {downloadSuccess}
        </div>
      )}
    </div>
  );
};
