import React from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react';
import type { QualityReport } from '../types/exam.js';

interface QualityReportModalProps {
  report: QualityReport;
  isOpen: boolean;
  onClose: () => void;
  examCode: string;
}

export const QualityReportModal: React.FC<QualityReportModalProps> = ({
  report,
  isOpen,
  onClose,
  examCode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${report.overallPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Báo cáo Kiểm tra Chất lượng Đề thi ({examCode})
              </h3>
              <p className="text-xs text-slate-500">
                16 tiêu chí thẩm định chất lượng giáo dục tự động (Mục XI)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Score Banner */}
        <div className={`p-4 rounded-xl mb-4 border flex items-center justify-between ${
          report.overallPassed
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/60 border-amber-200 text-amber-950'
        }`}>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider opacity-80">
              Kết quả đánh giá tổng thể
            </div>
            <div className="text-base font-bold mt-0.5">{report.summary}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold">{report.scorePercent}%</div>
            <div className="text-[11px] opacity-75 font-medium">Tiêu chí đạt</div>
          </div>
        </div>

        {/* Checks List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          <div className="text-xs font-semibold text-slate-700 mb-2">Chi tiết từng tiêu chí:</div>

          {report.checks.map((check) => (
            <div
              key={check.id}
              className={`p-3 rounded-lg border flex items-start gap-3 text-xs transition ${
                check.passed
                  ? 'bg-slate-50/70 border-slate-200 text-slate-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {check.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900">{check.label}</div>
                {check.note && (
                  <div className="text-[11px] text-slate-500 mt-0.5">{check.note}</div>
                )}
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                  check.passed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {check.passed ? 'Đạt' : 'Cần lưu ý'}
              </span>
            </div>
          ))}

          {/* Warnings list if any */}
          {report.warnings && report.warnings.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                Khuyến nghị điều chỉnh từ AI:
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {report.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
          >
            Đã hiểu & Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
};
