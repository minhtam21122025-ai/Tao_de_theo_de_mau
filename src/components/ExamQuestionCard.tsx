import React, { useState } from 'react';
import {
  RotateCcw,
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Lightbulb,
  CheckCircle,
  Eye,
  X,
} from 'lucide-react';
import type { ExamQuestion, QuestionBlueprint } from '../types/exam.js';
import { MathRenderer } from './MathRenderer.js';
import { SvgViewer } from './SvgViewer.js';

interface ExamQuestionCardProps {
  question: ExamQuestion;
  originalQuestion?: QuestionBlueprint;
  onUpdateQuestion: (updated: ExamQuestion) => void;
  onRegenerateQuestion: (question: ExamQuestion) => Promise<void>;
  isRegenerating?: boolean;
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string }> = {
  nhan_biet: { label: 'Nhận biết', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  thong_hieu: { label: 'Thông hiểu', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  van_dung: { label: 'Vận dụng', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  van_dung_cao: { label: 'Vận dụng cao', color: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const TYPE_MAP: Record<string, string> = {
  multiple_choice: 'Trắc nghiệm',
  true_false: 'Đúng / Sai',
  fill_in_blank: 'Điền khuyết',
  short_answer: 'Trả lời ngắn',
  essay: 'Tự luận',
  proof: 'Chứng minh',
  other: 'Khác',
};

export const ExamQuestionCard: React.FC<ExamQuestionCardProps> = ({
  question,
  originalQuestion,
  onUpdateQuestion,
  onRegenerateQuestion,
  isRegenerating = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showOriginalModal, setShowOriginalModal] = useState(false);

  // Editable local state
  const [editContent, setEditContent] = useState(question.content);
  const [editAnswer, setEditAnswer] = useState(question.correctAnswer);
  const [editExplanation, setEditExplanation] = useState(question.explanation);
  const [editScore, setEditScore] = useState(question.score);

  const handleSaveEdit = () => {
    onUpdateQuestion({
      ...question,
      content: editContent,
      correctAnswer: editAnswer,
      explanation: editExplanation,
      score: editScore,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(question.content);
    setEditAnswer(question.correctAnswer);
    setEditExplanation(question.explanation);
    setEditScore(question.score);
    setIsEditing(false);
  };

  const diffBadge = DIFFICULTY_MAP[question.difficulty] || DIFFICULTY_MAP.thong_hieu;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="bg-slate-50/70 px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              {question.order}
            </span>
            Câu {question.order}
          </span>

          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
            {TYPE_MAP[question.type] || 'Câu hỏi'}
          </span>

          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${diffBadge.color}`}>
            {diffBadge.label}
          </span>

          {question.topic && (
            <span className="text-xs text-slate-500 hidden md:inline truncate max-w-xs">
              • {question.topic}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            {question.score ? `${question.score} điểm` : '1.0 điểm'}
          </span>

          {originalQuestion && (
            <button
              onClick={() => setShowOriginalModal(true)}
              className="text-xs text-slate-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition flex items-center gap-1 border border-slate-200/60"
              title="So sánh với câu hỏi trong đề mẫu"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">So với đề mẫu</span>
            </button>
          )}

          <button
            onClick={() => onRegenerateQuestion(question)}
            disabled={isRegenerating}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2.5 py-1 rounded-lg hover:bg-blue-50 transition flex items-center gap-1 border border-blue-200 disabled:opacity-50"
            title="Tạo lại câu hỏi này với số liệu mới"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Tạo lại câu</span>
          </button>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1 rounded-lg hover:bg-slate-200/60 transition flex items-center gap-1 border border-slate-200"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Sửa
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleSaveEdit}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1 rounded-lg transition flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Lưu
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-xs text-slate-600 hover:bg-slate-100 font-medium px-2 py-1 rounded-lg transition"
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1 block">
                Nội dung câu hỏi (Công thức toán đặt trong $...$):
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="w-full text-sm font-sans p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Đáp án đúng:</label>
                <input
                  type="text"
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Điểm số:</label>
                <input
                  type="number"
                  step="0.25"
                  value={editScore}
                  onChange={(e) => setEditScore(parseFloat(e.target.value) || 0)}
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <MathRenderer content={question.content} className="text-base text-slate-900 leading-relaxed font-serif" />
          </div>
        )}

        {/* SVG Diagram if present */}
        {question.figureSvg && (
          <SvgViewer svgMarkup={question.figureSvg} description={question.figureDescription} />
        )}

        {/* Multiple Choice Options */}
        {question.options && question.options.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {question.options.map((opt) => {
              const isCorrect = opt.key === question.correctAnswer;
              return (
                <div
                  key={opt.key}
                  className={`p-3 rounded-xl border text-sm flex items-start gap-2.5 transition ${
                    isCorrect && showExplanation
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                      : 'bg-slate-50/50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isCorrect && showExplanation
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300'
                    }`}
                  >
                    {opt.key}
                  </span>
                  <div className="flex-1 min-w-0 font-serif">
                    <MathRenderer content={opt.text} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Collapsible Answer & Explanation */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-blue-600 py-1 transition"
          >
            <span className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              {showExplanation ? 'Ẩn đáp án & hướng dẫn giải' : 'Xem đáp án & hướng dẫn giải chi tiết'}
            </span>
            {showExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showExplanation && (
            <div className="mt-3 p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-2 mb-2 font-bold text-blue-900">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Đáp án chính xác: {question.correctAnswer}</span>
              </div>
              <div className="text-slate-800 text-sm font-serif">
                <MathRenderer content={question.explanation} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compare Modal */}
      {showOriginalModal && originalQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-blue-600" />
                Đối chiếu Câu {question.order} với Đề mẫu
              </h3>
              <button
                onClick={() => setShowOriginalModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Đề mẫu gốc
                </div>
                <div className="font-serif text-sm text-slate-800">
                  <MathRenderer content={originalQuestion.originalContent} />
                </div>
                {originalQuestion.figureSvg && (
                  <SvgViewer svgMarkup={originalQuestion.figureSvg} description="Hình vẽ đề mẫu" />
                )}
                {originalQuestion.invariants && (
                  <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-slate-600">
                    <span className="font-semibold">Điều kiện bất biến: </span>
                    {originalQuestion.invariants.join(', ')}
                  </div>
                )}
              </div>

              {/* Generated */}
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                  Đề mới tương đương
                </div>
                <div className="font-serif text-sm text-slate-900">
                  <MathRenderer content={question.content} />
                </div>
                {question.figureSvg && (
                  <SvgViewer svgMarkup={question.figureSvg} description={question.figureDescription} />
                )}
                <div className="mt-3 pt-2 border-t border-blue-200 text-xs text-blue-900">
                  <span className="font-semibold">Đáp án mới: </span>
                  {question.correctAnswer}
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowOriginalModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
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
