import React, { useState } from 'react';
import { ZoomIn, Maximize2, X } from 'lucide-react';

interface SvgViewerProps {
  svgMarkup?: string;
  description?: string;
  className?: string;
}

export const SvgViewer: React.FC<SvgViewerProps> = ({ svgMarkup, description, className = '' }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!svgMarkup || !svgMarkup.includes('<svg')) {
    return null;
  }

  // Sanitize and ensure responsive SVG
  const responsiveSvg = svgMarkup.replace(
    /<svg\b([^>]*)>/i,
    (match, attrs) => {
      // Ensure preserveAspectRatio and proper styling
      if (!attrs.includes('preserveAspectRatio')) {
        return `<svg ${attrs} preserveAspectRatio="xMidYMid meet">`;
      }
      return match;
    }
  );

  return (
    <div className={`my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          Hình vẽ / Đồ thị minh họa
        </span>
        <button
          onClick={() => setIsModalOpen(true)}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium bg-white px-2 py-1 rounded border border-slate-200 shadow-xs transition"
          title="Phóng to hình vẽ"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Phóng to
        </button>
      </div>

      <div
        className="flex justify-center items-center overflow-hidden bg-white p-4 rounded-lg border border-slate-100 shadow-2xs max-h-72"
        dangerouslySetInnerHTML={{ __html: responsiveSvg }}
      />

      {description && (
        <p className="mt-2 text-xs text-center text-slate-500 italic">
          {description}
        </p>
      )}

      {/* Modal Zoom */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-blue-600" />
                {description || 'Hình vẽ chi tiết'}
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className="flex justify-center items-center bg-slate-50 p-6 rounded-xl border border-slate-200"
              dangerouslySetInnerHTML={{ __html: responsiveSvg }}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
