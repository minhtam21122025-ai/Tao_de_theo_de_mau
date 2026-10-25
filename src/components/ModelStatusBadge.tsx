import React, { useState } from 'react';
import { Cpu, Activity, RefreshCw, AlertTriangle, CheckCircle, Info, ChevronRight, X } from 'lucide-react';
import type { ModelExecutionLog } from '../types/exam.js';

interface ModelStatusBadgeProps {
  activeModel: string;
  logs: ModelExecutionLog[];
  isProcessing?: boolean;
  currentStage?: string;
}

export const ModelStatusBadge: React.FC<ModelStatusBadgeProps> = ({
  activeModel,
  logs,
  isProcessing = false,
  currentStage,
}) => {
  const [showLogsModal, setShowLogsModal] = useState(false);

  const fallbackCount = logs.filter((l) => l.status === 'fallback').length;
  const errorCount = logs.filter((l) => l.status === 'error').length;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowLogsModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition shadow-2xs group"
          title="Nhấp để xem nhật ký điều phối mô hình Gemini"
        >
          <span className="relative flex h-2 w-2">
            {isProcessing ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            )}
          </span>

          <Cpu className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-slate-800">{activeModel}</span>

          {fallbackCount > 0 && (
            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
              +{fallbackCount} chuyển mô hình
            </span>
          )}

          <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition" />
        </button>
      </div>

      {/* Logs and Architecture Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Gemini Model Manager & Điều phối tự động
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động chuyển đổi mô hình dự phòng khi gặp quá tải, bảo toàn 100% tiến trình
                </p>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Hierarchy */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Hệ thống phân cấp mô hình dự phòng:
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className={`p-2 rounded-lg border ${activeModel === 'gemini-3.8-flash' ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <div className="text-[10px] uppercase font-semibold text-blue-600">Ưu tiên 1 (Chính)</div>
                  gemini-3.8-flash
                </div>
                <div className={`p-2 rounded-lg border ${activeModel === 'gemini-3.1-flash-lite' ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Dự phòng 1</div>
                  gemini-3.1-flash-lite
                </div>
                <div className={`p-2 rounded-lg border ${activeModel === 'gemini-flash-latest' ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Dự phòng 2</div>
                  gemini-flash-latest
                </div>
              </div>
            </div>

            {/* Real-time Logs List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Nhật ký thực thi ({logs.length} sự kiện):</span>
                {currentStage && (
                  <span className="text-blue-600 font-normal">Trạng thái: {currentStage}</span>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Chưa có nhật ký hoạt động. Hãy tải đề mẫu và bấm &quot;Phân tích và tạo đề&quot;.
                </div>
              ) : (
                logs.map((log, index) => {
                  let badge = (
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  );
                  let bg = 'bg-slate-50 border-slate-200 text-slate-700';

                  if (log.status === 'success') {
                    badge = <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />;
                    bg = 'bg-emerald-50/50 border-emerald-200 text-emerald-800';
                  } else if (log.status === 'fallback') {
                    badge = <RefreshCw className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5 animate-spin" />;
                    bg = 'bg-amber-50 border-amber-200 text-amber-900 font-medium';
                  } else if (log.status === 'warning') {
                    badge = <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />;
                    bg = 'bg-amber-50/40 border-amber-200 text-amber-800';
                  } else if (log.status === 'error') {
                    badge = <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />;
                    bg = 'bg-rose-50 border-rose-200 text-rose-800';
                  }

                  return (
                    <div
                      key={index}
                      className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition ${bg}`}
                    >
                      {badge}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[11px] text-slate-900">
                            [{log.model}]
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {log.timestamp} {log.latencyMs ? `(${log.latencyMs}ms)` : ''}
                          </span>
                        </div>
                        <p className="mt-0.5 leading-relaxed break-words">{log.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
