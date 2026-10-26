import {
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak,
} from 'docx';
import { Resvg } from '@resvg/resvg-js';
import type { GeneratedExam, ExamQuestion } from '../src/types/exam.js';

export interface DocxExportOptions {
  includeAnswers: boolean;
  includeExplanations: boolean;
  mode: 'single' | 'all_combined' | 'answers_only' | 'exam_and_answers' | 'exam_only' | 'all_exams_only';
}

export class DocxGenerator {
  /**
   * Sinh file Word DOCX cho một hoặc nhiều đề kiểm tra
   */
  public static async generateExamsDocx(
    exams: GeneratedExam[],
    options: DocxExportOptions
  ): Promise<Buffer> {
    const docChildren: (Paragraph | Table)[] = [];

    const isExamOnly =
      options.mode === 'exam_only' ||
      options.mode === 'all_exams_only' ||
      options.includeAnswers === false;

    exams.forEach((exam, index) => {
      // Add page break between multiple exams
      if (index > 0) {
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
      }

      if (options.mode === 'answers_only') {
        // Chỉ xuất Đáp án & Hướng dẫn giải
        this.appendAnswersSection(docChildren, exam, options);
      } else {
        // Xuất Đề kiểm tra
        this.appendExamSection(docChildren, exam);

        // Kèm đáp án ở cuối đề nếu được yêu cầu (và không phải chế độ chỉ xuất đề riêng)
        if (!isExamOnly && (options.includeAnswers || options.mode === 'exam_and_answers')) {
          docChildren.push(new Paragraph({ children: [new PageBreak()] }));
          this.appendAnswersSection(docChildren, exam, options);
        }
      }
    });

    const doc = new Document({
      creator: 'AI Tạo Đề Tương Tự',
      title: exams[0]?.title || 'Đề kiểm tra',
      description: 'Đề kiểm tra được tạo tự động chuẩn cấu trúc',
      styles: {
        default: {
          document: {
            run: {
              font: 'Times New Roman',
              size: 26, // 13pt
              color: '000000',
            },
            paragraph: {
              spacing: {
                line: 276, // 1.15 line spacing
                after: 120, // 6pt after
              },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1134, // ~2.0 cm
                bottom: 1134,
                left: 1417, // ~2.5 cm
                right: 1134,
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Tạo phần Đề thi theo tiêu chuẩn Bộ GD&ĐT
   */
  private static appendExamSection(
    children: (Paragraph | Table)[],
    exam: GeneratedExam
  ) {
    const subjectUpper = exam.subject.toUpperCase();
    const gradeUpper = exam.grade.toUpperCase();

    // 13.1 TIÊU ĐỀ BẮT BUỘC: ĐỀ KIỂM TRA MÔN [TÊN MÔN] – LỚP [TÊN LỚP]
    // Căn giữa, in đậm, viết hoa, Times New Roman, cỡ 16pt (size: 32)
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 80 },
        children: [
          new TextRun({
            text: `ĐỀ KIỂM TRA MÔN ${subjectUpper} – ${gradeUpper}`,
            bold: true,
            size: 32, // 16pt
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Dòng phụ: Mã đề thi, Thời gian làm bài
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [
          new TextRun({
            text: `Mã đề: ${exam.examCode}   |   Thời gian làm bài: ${exam.durationMinutes || 45} phút (không kể thời gian giao đề)`,
            italics: true,
            size: 24, // 12pt
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Đường gạch ngang phân cách nhẹ
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 240 },
        children: [
          new TextRun({
            text: '---------------------------- * ----------------------------',
            size: 20,
            color: '666666',
          }),
        ],
      })
    );

    // Nhóm câu hỏi theo phần nếu có
    let currentPart = '';

    exam.questions.forEach((q) => {
      if (q.partTitle && q.partTitle !== currentPart) {
        currentPart = q.partTitle;
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: currentPart.toUpperCase(),
                bold: true,
                size: 26, // 13pt
                color: '1A365D',
              }),
            ],
          })
        );
      }

      // Làm sạch triệt để nội dung câu hỏi để không bao giờ bị lặp từ "Câu..."
      const cleanedContent = DocxGenerator.cleanQuestionContent(q.content, q.order);
      const scoreLabel = q.score ? `(${q.score} điểm)` : '';
      const questionPrefix = scoreLabel ? `Câu ${q.order} ${scoreLabel}: ` : `Câu ${q.order}: `;

      const questionRuns: TextRun[] = [
        new TextRun({
          text: questionPrefix,
          bold: true,
          font: 'Times New Roman',
        }),
        new TextRun({
          text: cleanedContent,
          font: 'Times New Roman',
        }),
      ];

      children.push(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: questionRuns,
        })
      );

      // Nếu có hình vẽ SVG, render thành ảnh PNG thực tế và nhúng trực tiếp vào văn bản Word
      if (q.figureSvg) {
        const imageResult = this.renderSvgToPngBuffer(q.figureSvg);
        if (imageResult) {
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 120, after: 60 },
              children: [
                new ImageRun({
                  type: 'png',
                  data: imageResult.buffer,
                  transformation: {
                    width: imageResult.width,
                    height: imageResult.height,
                  },
                }),
              ],
            })
          );

          if (q.figureDescription) {
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 100 },
                children: [
                  new TextRun({
                    text: `Hình vẽ: ${q.figureDescription}`,
                    italics: true,
                    size: 20, // 10pt
                    color: '4A5568',
                    font: 'Times New Roman',
                  }),
                ],
              })
            );
          }
        } else if (q.figureDescription) {
          // Fallback chú thích nếu cú pháp SVG lỗi
          children.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 60, after: 80 },
              children: [
                new TextRun({
                  text: `[Hình vẽ: ${q.figureDescription}]`,
                  italics: true,
                  size: 22,
                  color: '4A5568',
                  font: 'Times New Roman',
                }),
              ],
            })
          );
        }
      }

      // Các phương án trắc nghiệm nếu có
      if (q.options && q.options.length > 0) {
        // Sắp xếp các phương án và loại bỏ tiền tố A., B., C., D. bị lặp
        q.options.forEach((opt) => {
          const cleanText = DocxGenerator.cleanOptionText(opt.text, opt.key);
          children.push(
            new Paragraph({
              indent: { left: 400 },
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: `${opt.key}. `,
                  bold: true,
                  font: 'Times New Roman',
                }),
                new TextRun({
                  text: cleanText,
                  font: 'Times New Roman',
                }),
              ],
            })
          );
        });
      }
    });

    // Cuối đề: HẾT
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 100 },
        children: [
          new TextRun({
            text: '---------- HẾT ----------',
            bold: true,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      })
    );
  }

  /**
   * Tạo phần Đáp án và Hướng dẫn chấm
   */
  private static appendAnswersSection(
    children: (Paragraph | Table)[],
    exam: GeneratedExam,
    options: DocxExportOptions
  ) {
    const subjectUpper = exam.subject.toUpperCase();
    const gradeUpper = exam.grade.toUpperCase();

    // 13.1 TIÊU ĐỀ BẮT BUỘC KHI XUẤT ĐÁP ÁN:
    // ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI – MÔN [TÊN MÔN] – LỚP [TÊN LỚP]
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 80 },
        children: [
          new TextRun({
            text: `ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI – MÔN ${subjectUpper} – ${gradeUpper}`,
            bold: true,
            size: 30, // 15pt
            font: 'Times New Roman',
          }),
        ],
      })
    );

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [
          new TextRun({
            text: `(Áp dụng cho Mã đề: ${exam.examCode})`,
            italics: true,
            size: 24,
            font: 'Times New Roman',
          }),
        ],
      })
    );

    // Bảng tóm tắt đáp án nhanh cho các câu trắc nghiệm
    const mcQuestions = exam.questions.filter((q) => q.type === 'multiple_choice');
    if (mcQuestions.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({
              text: 'I. BẢNG ĐÁP ÁN TRẮC NGHIỆM',
              bold: true,
              font: 'Times New Roman',
            }),
          ],
        })
      );

      // Create a neat table for MC answers
      const chunked: ExamQuestion[][] = [];
      for (let i = 0; i < mcQuestions.length; i += 10) {
        chunked.push(mcQuestions.slice(i, i + 10));
      }

      chunked.forEach((rowChunk) => {
        const headerCells = rowChunk.map(
          (q) =>
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `Câu ${q.order}`, bold: true, size: 22 })],
                }),
              ],
            })
        );

        const answerCells = rowChunk.map(
          (q) =>
            new TableCell({
              width: { size: 10, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({ text: q.correctAnswer || '-', bold: true, size: 24, color: 'C53030' }),
                  ],
                }),
              ],
            })
        );

        const table = new Table({
          rows: [new TableRow({ children: headerCells }), new TableRow({ children: answerCells })],
        });

        children.push(table);
        children.push(new Paragraph({ spacing: { after: 120 } }));
      });
    }

    // Lời giải và hướng dẫn chấm chi tiết
    if (options.includeExplanations) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 100 },
          children: [
            new TextRun({
              text: 'II. HƯỚNG DẪN GIẢI CHI TIẾT VÀ BIỂU ĐIỂM',
              bold: true,
              font: 'Times New Roman',
            }),
          ],
        })
      );

      exam.questions.forEach((q) => {
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({
                text: `Câu ${q.order}: `,
                bold: true,
                font: 'Times New Roman',
              }),
              new TextRun({
                text: `Đáp án: ${q.correctAnswer} (${q.score || 0} điểm)`,
                bold: true,
                color: '2B6CB0',
                font: 'Times New Roman',
              }),
            ],
          })
        );

        if (q.explanation) {
          const cleanExpl = DocxGenerator.cleanExplanationText(q.explanation, q.order);
          children.push(
            new Paragraph({
              indent: { left: 400 },
              spacing: { before: 40, after: 80 },
              children: [
                new TextRun({
                  text: cleanExpl,
                  font: 'Times New Roman',
                }),
              ],
            })
          );
        }

        // Nếu câu hỏi có hình vẽ, cũng chèn hình vào phần hướng dẫn giải chi tiết
        if (q.figureSvg) {
          const imageResult = this.renderSvgToPngBuffer(q.figureSvg);
          if (imageResult) {
            children.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 100 },
                children: [
                  new ImageRun({
                    type: 'png',
                    data: imageResult.buffer,
                    transformation: {
                      width: Math.round(imageResult.width * 0.85),
                      height: Math.round(imageResult.height * 0.85),
                    },
                  }),
                ],
              })
            );
          }
        }
      });
    }
  }

  /**
   * Chuyển đổi mã SVG thành PNG buffer và kích thước tương thích với file Word DOCX
   */
  private static renderSvgToPngBuffer(svgString?: string): {
    buffer: Buffer;
    width: number;
    height: number;
  } | null {
    if (!svgString || typeof svgString !== 'string') return null;

    try {
      let clean = svgString.trim();
      // Loại bỏ markdown code fence nếu có
      clean = clean.replace(/^```(xml|svg)?/i, '').replace(/```$/g, '').trim();

      const match = clean.match(/<svg[\s\S]*<\/svg>/i);
      if (match) {
        clean = match[0];
      } else if (!clean.startsWith('<svg')) {
        return null;
      }

      // Đảm bảo xmlns hợp lệ
      if (!clean.includes('xmlns=')) {
        clean = clean.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // Đảm bảo có nền trắng để khi in ấn hoặc đọc trên Word nét vẽ rõ ràng
      if (!clean.includes('<rect') && !clean.includes('fill="white"') && !clean.includes('background')) {
        clean = clean.replace(
          /(<svg[^>]*>)/i,
          '$1<rect width="100%" height="100%" fill="white"/>'
        );
      }

      const resvg = new Resvg(clean, {
        background: 'white',
        fitTo: { mode: 'width', value: 650 },
        font: {
          loadSystemFonts: true,
          defaultFontFamily: 'Times New Roman',
        },
      });

      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      const naturalWidth = resvg.width || 400;
      const naturalHeight = resvg.height || 260;
      const aspect = naturalHeight / naturalWidth;

      // Chiều rộng hiển thị trong văn bản Word A4 (khổ in chuẩn 220 - 340pt)
      let width = 310;
      if (naturalWidth > 0) {
        width = Math.min(340, Math.max(220, Math.round(naturalWidth * 0.75)));
      }
      let height = Math.round(width * aspect);

      // Giới hạn chiều cao tối đa tránh chiếm quá nhiều trang đề thi
      if (height > 240) {
        height = 240;
        width = Math.round(height / aspect);
      }

      return {
        buffer: Buffer.from(pngBuffer),
        width,
        height,
      };
    } catch (err) {
      console.warn('[DocxGenerator] Không thể render SVG sang PNG cho Word:', err);
      return null;
    }
  }

  /**
   * Làm sạch nội dung câu hỏi, loại bỏ hoàn toàn các tiền tố lặp như "Câu 1:", "Câu 1.", "Câu 1 (0.5 điểm):", "Bài 1:"
   */
  public static cleanQuestionContent(content?: string, order?: number): string {
    if (!content || typeof content !== 'string') return '';
    let cleaned = content.trim();

    // Vòng lặp loại bỏ triệt để các tiền tố lặp lại ở đầu chuỗi (ví dụ: "Câu 1: Câu 1: Cho...")
    let changed = true;
    let loops = 0;
    while (changed && loops < 5) {
      loops++;
      const prev = cleaned;

      // 1. Loại bỏ "Câu X", "Bài X", "Question X", "Câu hỏi X", có thể kèm theo điểm "(0.5 điểm)" và dấu ":", ".", "-", ")"
      cleaned = cleaned
        .replace(/^(?:câu|bài|question|câu\s*hỏi)\s*\d*(?:\s*\([^)]*\))?[\s.:)-]*/i, '')
        .trim();

      // 2. Loại bỏ tiền tố số thứ tự đơn thuần nếu khớp với số câu (ví dụ: "1. Cho...", "1) Cho...")
      if (order !== undefined) {
        const numPattern = new RegExp(`^${order}[.:)-]\\s*`, 'i');
        cleaned = cleaned.replace(numPattern, '').trim();
      }

      // 3. Loại bỏ các phần điểm số mồ côi ở đầu như "(0.5 điểm):", "(1đ):", "(2 điểm)."
      cleaned = cleaned
        .replace(/^\(\s*\d+(?:[.,]\d+)?\s*(?:đ|điểm|pts?)\s*\)[\s.:)-]*/i, '')
        .trim();

      // 4. Loại bỏ các dấu phân cách mồ côi như ":", "-", "." ở đầu chuỗi nếu còn sót
      cleaned = cleaned.replace(/^[\s.:)-]+/, '').trim();

      changed = cleaned !== prev;
    }

    return cleaned;
  }

  /**
   * Làm sạch phương án trắc nghiệm, loại bỏ tiền tố A., B., C., D. bị lặp lại
   */
  public static cleanOptionText(text?: string, key?: string): string {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();

    // Loại bỏ tiền tố A., B., C., D., A), (A), v.v.
    cleaned = cleaned.replace(/^\(?[A-Da-d]\)?[\s.:)-]+/, '').trim();

    // Nếu truyền key cụ thể (ví dụ 'A'), kiểm tra thêm trường hợp đặc thù
    if (key) {
      const keyPattern = new RegExp(`^\\(?${key}\\)?[\\s.:)-]*`, 'i');
      cleaned = cleaned.replace(keyPattern, '').trim();
    }

    return cleaned;
  }

  /**
   * Làm sạch lời giải, loại bỏ tiền tố thừa như "Câu 1: Lời giải:", "Lời giải:" nếu có
   */
  public static cleanExplanationText(explanation?: string, order?: number): string {
    if (!explanation || typeof explanation !== 'string') return '';
    let cleaned = explanation.trim();

    // Loại bỏ "Câu X:", "Bài X:", "Câu X - Hướng dẫn giải:"
    cleaned = cleaned
      .replace(/^(?:câu|bài|question)\s*\d*[\s.:)-]*(?:lời\s*giải|hướng\s*dẫn\s*giải)?[\s.:)-]*/i, '')
      .trim();

    return cleaned;
  }
}
