import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const renderedContent = useMemo(() => {
    if (!content) return '';

    // Regex to detect $$...$$ (display math) or $...$ (inline math)
    // Note: avoid matching simple currency like $100 if followed immediately by numbers without closing $
    const parts: { type: 'text' | 'inline' | 'display'; text: string }[] = [];
    let remaining = content;

    while (remaining.length > 0) {
      // Check for display math $$...$$
      const displayMatch = remaining.match(/\$\$([\s\S]*?)\$\$/);
      // Check for inline math $...$
      const inlineMatch = remaining.match(/\$([^\$\n]+?)\$/);

      let firstMatch: { index: number; length: number; type: 'inline' | 'display'; math: string } | null = null;

      if (displayMatch && displayMatch.index !== undefined) {
        firstMatch = {
          index: displayMatch.index,
          length: displayMatch[0].length,
          type: 'display',
          math: displayMatch[1],
        };
      }

      if (inlineMatch && inlineMatch.index !== undefined) {
        if (!firstMatch || inlineMatch.index < firstMatch.index) {
          firstMatch = {
            index: inlineMatch.index,
            length: inlineMatch[0].length,
            type: 'inline',
            math: inlineMatch[1],
          };
        }
      }

      if (!firstMatch) {
        parts.push({ type: 'text', text: remaining });
        break;
      }

      // Add text before the math match
      if (firstMatch.index > 0) {
        parts.push({ type: 'text', text: remaining.slice(0, firstMatch.index) });
      }

      // Add math part
      parts.push({ type: firstMatch.type, text: firstMatch.math });

      remaining = remaining.slice(firstMatch.index + firstMatch.length);
    }

    return parts.map((part, index) => {
      if (part.type === 'text') {
        // preserve newlines
        return (
          <span key={index} className="whitespace-pre-line">
            {part.text}
          </span>
        );
      }

      try {
        const html = katex.renderToString(part.text, {
          displayMode: part.type === 'display',
          throwOnError: false,
          output: 'htmlAndMathml',
        });
        return (
          <span
            key={index}
            className={`inline-block px-0.5 ${part.type === 'display' ? 'my-2 block text-center' : ''}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (err) {
        return (
          <code key={index} className="bg-red-50 text-red-600 px-1 py-0.5 rounded text-xs">
            ${part.text}$
          </code>
        );
      }
    });
  }, [content]);

  return <div className={`leading-relaxed text-slate-800 ${className}`}>{renderedContent}</div>;
};
