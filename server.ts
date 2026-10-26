import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import { GeminiModelManager } from './server/geminiModelManager.js';
import { DocxGenerator } from './server/docxGenerator.js';
import type {
  OriginalExamBlueprint,
  GeneratedExam,
  AdvancedOptions,
  ExamQuestion,
  QuestionBlueprint,
} from './src/types/exam.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set request timeout to 4 minutes (240000ms) to prevent 504 Gateway Timeout during heavy LLM exam generation
app.use((req, res, next) => {
  req.setTimeout(240000);
  res.setTimeout(240000);
  if (req.path.length > 1 && req.path.endsWith('/')) {
    const newPath = req.path.slice(0, -1);
    const query = req.url.slice(req.path.length);
    req.url = newPath + query;
  }
  next();
});

const modelManager = new GeminiModelManager();

// API Health & Model status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    activeModel: modelManager.getActiveModel(),
    candidates: ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'],
    logs: modelManager.getLogs(),
  });
});

// API: Sample Exam for 1-click teacher test
app.get('/api/exam/sample', (req: Request, res: Response) => {
  const sampleBlueprint: OriginalExamBlueprint = {
    title: 'ĐỀ KIỂM TRA HỌC KỲ I - TOÁN 8',
    detectedSubject: 'Toán',
    detectedGrade: 'Lớp 8',
    durationMinutes: 45,
    totalScore: 10,
    sections: [
      {
        id: 'sec_1',
        title: 'PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (3,0 điểm)',
        description: 'Chọn chữ cái đứng trước câu trả lời đúng:',
        questionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
      },
      {
        id: 'sec_2',
        title: 'PHẦN II. TỰ LUẬN (7,0 điểm)',
        description: 'Trình bày lời giải chi tiết cho các bài toán sau:',
        questionIds: ['q7', 'q8', 'q9'],
      },
    ],
    questions: [
      {
        id: 'q1',
        order: 1,
        partTitle: 'PHẦN I. TRẮC NGHIỆM KHÁCH QUAN',
        originalContent: 'Điều kiện xác định của phân thức $P = \\frac{2x - 1}{x - 3}$ là:',
        type: 'multiple_choice',
        options: [
          { key: 'A', text: '$x \\ne 3$' },
          { key: 'B', text: '$x \\ne -3$' },
          { key: 'C', text: '$x \\ne \\frac{1}{2}$' },
          { key: 'D', text: '$x > 3$' },
        ],
        correctAnswer: 'A',
        score: 0.5,
        topic: 'Phân thức đại số',
        difficulty: 'nhan_biet',
        variables: ['mẫu số x - 3', 'tử số 2x - 1'],
        invariants: ['Mẫu số khác 0: ax + b \\ne 0'],
      },
      {
        id: 'q2',
        order: 2,
        partTitle: 'PHẦN I. TRẮC NGHIỆM KHÁCH QUAN',
        originalContent: 'Khai triển hằng đẳng thức $(2x - 3)^2$ ta được kết quả là:',
        type: 'multiple_choice',
        options: [
          { key: 'A', text: '$4x^2 - 12x + 9$' },
          { key: 'B', text: '$4x^2 - 6x + 9$' },
          { key: 'C', text: '$4x^2 + 12x + 9$' },
          { key: 'D', text: '$4x^2 - 9$' },
        ],
        correctAnswer: 'A',
        score: 0.5,
        topic: 'Những hằng đẳng thức đáng nhớ',
        difficulty: 'thong_hieu',
        variables: ['hệ số 2x', 'hằng số 3'],
        invariants: ['$(a-b)^2 = a^2 - 2ab + b^2$'],
      },
      {
        id: 'q3',
        order: 3,
        partTitle: 'PHẦN I. TRẮC NGHIỆM KHÁCH QUAN',
        originalContent: 'Tam giác $ABC$ vuông tại $A$ có $AB = 6\\text{ cm}, AC = 8\\text{ cm}$. Độ dài cạnh huyền $BC$ là:',
        type: 'multiple_choice',
        options: [
          { key: 'A', text: '$10\\text{ cm}$' },
          { key: 'B', text: '$14\\text{ cm}$' },
          { key: 'C', text: '$2\\sqrt{7}\\text{ cm}$' },
          { key: 'D', text: '$12\\text{ cm}$' },
        ],
        correctAnswer: 'A',
        score: 0.5,
        topic: 'Định lý Pythagore',
        difficulty: 'thong_hieu',
        variables: ['AB = 6, AC = 8'],
        invariants: ['Bộ ba số Pythagore nguyên dương: $a^2 + b^2 = c^2$'],
        hasFigure: true,
        figureDescription: 'Tam giác ABC vuông tại A có hai cạnh góc vuông AB = 6cm, AC = 8cm',
        figureSvg: `<svg viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">
  <polygon points="50,170 50,50 250,170" fill="#EBF8FF" stroke="#2B6CB0" stroke-width="2.5" />
  <polyline points="50,150 70,150 70,170" fill="none" stroke="#C53030" stroke-width="2" />
  <text x="30" y="180" font-family="Times New Roman" font-size="16" font-weight="bold" fill="#1A202C">A</text>
  <text x="35" y="45" font-family="Times New Roman" font-size="16" font-weight="bold" fill="#1A202C">B</text>
  <text x="260" y="180" font-family="Times New Roman" font-size="16" font-weight="bold" fill="#1A202C">C</text>
  <text x="18" y="115" font-family="Times New Roman" font-size="13" fill="#4A5568">6 cm</text>
  <text x="140" y="195" font-family="Times New Roman" font-size="13" fill="#4A5568">8 cm</text>
  <text x="160" y="100" font-family="Times New Roman" font-size="13" font-style="italic" fill="#2B6CB0">BC = ?</text>
</svg>`,
      },
      {
        id: 'q4',
        order: 4,
        partTitle: 'PHẦN I. TRẮC NGHIỆM KHÁCH QUAN',
        originalContent: 'Đa thức $x^2 - 25$ được phân tích thành nhân tử là:',
        type: 'multiple_choice',
        options: [
          { key: 'A', text: '$(x - 5)(x + 5)$' },
          { key: 'B', text: '$(x - 5)^2$' },
          { key: 'C', text: '$(x + 5)^2$' },
          { key: 'D', text: '$(x - 25)(x + 1)$' },
        ],
        correctAnswer: 'A',
        score: 0.5,
        topic: 'Phân tích đa thức thành nhân tử',
        difficulty: 'nhan_biet',
      },
      {
        id: 'q5',
        order: 5,
        partTitle: 'PHẦN I. TRẮC NGHIỆM KHÁCH QUAN',
        originalContent: 'Hình thang có hai đường chéo bằng nhau là:',
        type: 'multiple_choice',
        options: [
          { key: 'A', text: 'Hình thang cân' },
          { key: 'B', text: 'Hình bình hành' },
          { key: 'C', text: 'Hình thoi' },
          { key: 'D', text: 'Hình vuông' },
        ],
        correctAnswer: 'A',
        score: 0.5,
        topic: 'Tứ giác - Hình thang cân',
        difficulty: 'nhan_biet',
      },
      {
        id: 'q6',
        order: 6,
        partTitle: 'PHẦN I. TRẮC NGHIỆM KHÁCH QUAN',
        originalContent: 'Giá trị của biểu thức $M = x^3 - 3x^2 + 3x - 1$ tại $x = 101$ là:',
        type: 'multiple_choice',
        options: [
          { key: 'A', text: '$1\\,000\\,000$' },
          { key: 'B', text: '$100\\,000$' },
          { key: 'C', text: '$10\\,000$' },
          { key: 'D', text: '$1\\,000$' },
        ],
        correctAnswer: 'A',
        score: 0.5,
        topic: 'Hằng đẳng thức lập phương',
        difficulty: 'van_dung',
      },
      {
        id: 'q7',
        order: 7,
        partTitle: 'PHẦN II. TỰ LUẬN',
        originalContent: 'Cho biểu thức: $A = \\left( \\frac{x}{x^2 - 4} + \\frac{2}{x - 2} - \\frac{1}{x + 2} \\right) : \\frac{2x + 6}{x^2 - 4}$.\na) Tìm điều kiện xác định và rút gọn biểu thức $A$.\nb) Tính giá trị của $A$ khi $x = 4$.\nc) Tìm giá trị nguyên của $x$ để $A$ nhận giá trị nguyên.',
        type: 'essay',
        score: 2.5,
        topic: 'Rút gọn phân thức đại số',
        difficulty: 'van_dung',
        variables: ['các hệ số phân thức', 'giá trị x = 4'],
        invariants: ['Điều kiện xác định $x \\ne \\pm 2, x \\ne -3$', 'Phân thức rút gọn được thành dạng tối giản'],
      },
      {
        id: 'q8',
        order: 8,
        partTitle: 'PHẦN II. TỰ LUẬN',
        originalContent: 'Cho tam giác $ABC$ nhọn ($AB < AC$), đường cao $AH$. Gọi $M$ là trung điểm của $AC$. Kẻ $MN \\perp BC$ tại $N$.\na) Chứng minh tứ giác $ABNH$ là hình thang vuông.\nb) Gọi $K$ là điểm đối xứng với $H$ qua $M$. Chứng minh tứ giác $AHCK$ là hình chữ nhật.\nc) Tìm điều kiện của tam giác $ABC$ để tứ giác $AHCK$ là hình vuông.',
        type: 'proof',
        score: 3.5,
        topic: 'Hình học phẳng - Hình chữ nhật, hình vuông',
        difficulty: 'van_dung_cao',
        invariants: ['Tam giác nhọn', 'AH đường cao', 'Đối xứng qua tâm M tạo hình chữ nhật'],
        hasFigure: true,
        figureDescription: 'Tam giác ABC có đường cao AH, M là trung điểm AC, điểm K đối xứng với H qua M',
        figureSvg: `<svg viewBox="0 0 400 280" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">
  <polygon points="120,60 40,220 320,220" fill="#F7FAFC" stroke="#2D3748" stroke-width="2" />
  <line x1="120" y1="60" x2="120" y2="220" stroke="#E53E3E" stroke-width="2" stroke-dasharray="4" />
  <polyline points="120,200 140,200 140,220" fill="none" stroke="#E53E3E" stroke-width="1.5" />
  <line x1="120" y1="220" x2="320" y2="60" stroke="#3182CE" stroke-width="1.5" stroke-dasharray="3" />
  <circle cx="220" cy="140" r="4" fill="#3182CE" />
  <polygon points="120,60 320,60 320,220 120,220" fill="rgba(49, 130, 206, 0.08)" stroke="#3182CE" stroke-width="1.8" />
  <text x="115" y="45" font-family="Times New Roman" font-size="16" font-weight="bold">A</text>
  <text x="20" y="235" font-family="Times New Roman" font-size="16" font-weight="bold">B</text>
  <text x="330" y="235" font-family="Times New Roman" font-size="16" font-weight="bold">C</text>
  <text x="115" y="242" font-family="Times New Roman" font-size="16" font-weight="bold" fill="#E53E3E">H</text>
  <text x="228" y="135" font-family="Times New Roman" font-size="16" font-weight="bold" fill="#3182CE">M</text>
  <text x="330" y="55" font-family="Times New Roman" font-size="16" font-weight="bold" fill="#3182CE">K</text>
</svg>`,
      },
      {
        id: 'q9',
        order: 9,
        partTitle: 'PHẦN II. TỰ LUẬN',
        originalContent: 'Cho hai số thực dương $a, b$ thỏa mãn $a + b = 2$. Tìm giá trị nhỏ nhất của biểu thức: $P = \\frac{1}{a^2 + b^2} + \\frac{2}{ab}$.',
        type: 'essay',
        score: 1.0,
        topic: 'Bất đẳng thức và cực trị',
        difficulty: 'van_dung_cao',
        invariants: ['Điều kiện $a+b=2, a>0, b>0$', 'Đẳng thức xảy ra khi $a=b=1$'],
      },
    ],
  };

  res.json({ blueprint: sampleBlueprint });
});

// API: Analyze Exam Document (OCR + Structure Blueprint)
// API: Pre-scan exam text to detect question anchors
app.post('/api/exam/pre-scan', (req: Request, res: Response) => {
  const { text } = req.body;
  const anchors = modelManager.detectQuestionAnchors(text || '');
  res.json({
    totalDetected: anchors.length,
    anchors,
  });
});

/**
 * Trích xuất nội dung văn bản từ tài liệu Word (.doc binary format Word 97-2003 và .docx OpenXML)
 */
async function extractWordDocumentText(buffer: Buffer, fileName?: string): Promise<string> {
  const isDocLegacy = fileName?.toLowerCase().endsWith('.doc');

  // 1. Nếu là file .doc (Word 97-2003 OLE2 binary), ưu tiên dùng WordExtractor
  if (isDocLegacy) {
    try {
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      const text = [
        extracted.getHeaders(),
        extracted.getBody(),
        extracted.getFootnotes(),
      ]
        .filter(Boolean)
        .join('\n\n')
        .trim();
      if (text.length > 20) {
        console.log(`[DOC Extractor] Trích xuất thành công ${text.length} ký tự từ file .doc bằng WordExtractor`);
        return text;
      }
    } catch (err: any) {
      console.warn('[DOC Extractor Warning]:', err?.message || err);
    }
  }

  // 2. Thử mammoth (chuẩn cho file .docx XML)
  try {
    const mammothResult = await mammoth.extractRawText({ buffer });
    const text = (mammothResult.value || '').trim();
    if (text.length > 20) {
      return text;
    }
  } catch (err: any) {
    console.warn('[DOCX Mammoth Warning]:', err?.message || err);
  }

  // 3. Nếu mammoth không đọc được hoặc file là .doc đổi đuôi, thử với WordExtractor
  try {
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(buffer);
    const text = [
      extracted.getHeaders(),
      extracted.getBody(),
      extracted.getFootnotes(),
    ]
      .filter(Boolean)
      .join('\n\n')
      .trim();
    if (text.length > 20) {
      return text;
    }
  } catch (err: any) {
    console.warn('[WordExtractor Fallback Warning]:', err?.message || err);
  }

  // 4. Cứu hộ chuỗi nhị phân (quét UTF-16LE và bảng mã Unicode tiếng Việt trong file .doc)
  try {
    const salvaged = salvageTextFromBinaryBuffer(buffer);
    if (salvaged.length > 30) {
      console.log(`[DOC Salvage] Trích xuất cứu hộ thành công ${salvaged.length} ký tự từ file nhị phân.`);
      return salvaged;
    }
  } catch (err: any) {
    console.warn('[DOC Salvage Warning]:', err?.message || err);
  }

  return '';
}

/**
 * Trích xuất chuỗi có nghĩa từ file nhị phân Word .doc (hỗ trợ UTF-16LE và ký tự tiếng Việt)
 */
function salvageTextFromBinaryBuffer(buffer: Buffer): string {
  const strings: string[] = [];
  let current = '';
  for (let i = 0; i < buffer.length - 1; i += 2) {
    const charCode = buffer.readUInt16LE(i);
    // Ký tự ASCII in được, ký tự xuống dòng và bảng mã Unicode tiếng Việt
    if (
      (charCode >= 32 && charCode <= 126) ||
      charCode === 10 ||
      charCode === 13 ||
      (charCode >= 0x00c0 && charCode <= 0x1ef9)
    ) {
      current += String.fromCharCode(charCode);
    } else {
      if (current.trim().length >= 4) {
        strings.push(current.trim());
      }
      current = '';
    }
  }
  if (current.trim().length >= 4) {
    strings.push(current.trim());
  }
  return strings.join(' ').replace(/\s+/g, ' ').trim();
}

// API: Bước 1 - Chuyển đổi nội dung đề mẫu sang văn bản chuẩn LaTeX ($...$)
app.post('/api/exam/transcribe-latex', async (req: Request, res: Response) => {
  try {
    const { base64Data, mimeType, fileName, textContent, subject, grade } = req.body;

    if (!subject || !grade) {
      return res.status(400).json({ error: 'Vui lòng cung cấp thông tin Môn học và Lớp.' });
    }

    let finalBase64 = base64Data;
    let finalMimeType = mimeType;
    let extractedText = (textContent || '').trim();

    const isWordFile =
      mimeType?.includes('wordprocessingml') ||
      mimeType?.includes('msword') ||
      mimeType?.includes('officedocument') ||
      fileName?.toLowerCase().endsWith('.docx') ||
      fileName?.toLowerCase().endsWith('.doc');

    if (base64Data && isWordFile) {
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const text = await extractWordDocumentText(buffer, fileName);
        if (text) extractedText = text;
        finalBase64 = undefined;
        finalMimeType = undefined;
      } catch (err: any) {
        console.warn('Word file text extraction error:', err);
      }
    } else if (
      base64Data &&
      (mimeType?.includes('text/plain') ||
        fileName?.toLowerCase().endsWith('.txt') ||
        fileName?.toLowerCase().endsWith('.md'))
    ) {
      try {
        extractedText = Buffer.from(base64Data, 'base64').toString('utf-8').trim();
        finalBase64 = undefined;
        finalMimeType = undefined;
      } catch (err: any) {
        console.warn('TXT text extraction error:', err);
      }
    }

    const latexText = await modelManager.transcribeDocumentToLatex({
      base64Data: finalBase64,
      mimeType: finalMimeType,
      textContent: extractedText,
      subject,
      grade,
    });

    res.json({
      latexText,
      logs: modelManager.getLogs(),
      activeModel: modelManager.getActiveModel(),
    });
  } catch (err: any) {
    console.error('Error transcribing to LaTeX:', err);
    res.status(500).json({
      error: err.message || 'Lỗi khi chuyển đổi sang chuẩn LaTeX.',
      logs: modelManager.getLogs(),
      activeModel: modelManager.getActiveModel(),
    });
  }
});

// API: Bước 2 - Phân tích cấu trúc & OCR đề gốc từ văn bản LaTeX chuẩn
app.post('/api/exam/analyze', async (req: Request, res: Response) => {
  try {
    const { base64Data, mimeType, fileName, textContent, latexText, subject, grade } = req.body;

    if (!subject || !grade) {
      return res.status(400).json({ error: 'Vui lòng cung cấp thông tin Môn học và Lớp.' });
    }

    let finalBase64 = base64Data;
    let finalMimeType = mimeType;
    let extractedText = (textContent || '').trim();

    // If it's a Word file (.doc or .docx), extract text with WordExtractor/mammoth and clear binary
    const isWordFile =
      mimeType?.includes('wordprocessingml') ||
      mimeType?.includes('msword') ||
      mimeType?.includes('officedocument') ||
      fileName?.toLowerCase().endsWith('.docx') ||
      fileName?.toLowerCase().endsWith('.doc');

    if (base64Data && isWordFile) {
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        const text = await extractWordDocumentText(buffer, fileName);
        if (text) {
          extractedText = text;
        }
        finalBase64 = undefined;
        finalMimeType = undefined;
      } catch (err: any) {
        console.warn('Word file text extraction error:', err);
      }
    } else if (
      base64Data &&
      (mimeType?.includes('text/plain') ||
        fileName?.toLowerCase().endsWith('.txt') ||
        fileName?.toLowerCase().endsWith('.md'))
    ) {
      try {
        extractedText = Buffer.from(base64Data, 'base64').toString('utf-8').trim();
        finalBase64 = undefined;
        finalMimeType = undefined;
      } catch (err: any) {
        console.warn('TXT text extraction error:', err);
      }
    }

    const preAnchors = modelManager.detectQuestionAnchors(latexText || extractedText);
    if (preAnchors.length > 0) {
      console.log(`[API Analyze] Nhận diện sơ bộ ${preAnchors.length} câu: ${preAnchors.map(a => a.label).join(', ')}`);
    }

    const blueprint = await modelManager.analyzeExamDocument({
      base64Data: finalBase64,
      mimeType: finalMimeType,
      textContent: extractedText,
      latexText,
      subject,
      grade,
    });

    res.json({
      blueprint,
      transcribedLatexText: blueprint.transcribedLatexText,
      detectedCount: blueprint.questions.length,
      preDetectedCount: preAnchors.length,
      logs: modelManager.getLogs(),
      activeModel: modelManager.getActiveModel(),
    });
  } catch (err: any) {
    console.error('Error analyzing exam:', err);
    res.status(500).json({
      error: err.message || 'Lỗi khi phân tích đề mẫu.',
      logs: modelManager.getLogs(),
      activeModel: modelManager.getActiveModel(),
    });
  }
});

// API: Generate Single Similar Exam
app.post('/api/exam/generate-single', async (req: Request, res: Response) => {
  try {
    const { blueprint, index, options, subject, grade } = req.body;

    if (!blueprint || !blueprint.questions || blueprint.questions.length === 0) {
      return res.status(400).json({ error: 'Cấu trúc đề mẫu không hợp lệ.' });
    }

    const examIndex = parseInt(index) || 1;
    const advancedOptions: AdvancedOptions = options || {
      examCount: 3,
      includeAnswers: true,
      includeExplanations: true,
      figureHandling: 'generate_new_svg',
      exportMode: 'individual',
      keepExactScores: true,
    };

    const exam = await modelManager.generateSingleExam({
      blueprint,
      index: examIndex,
      options: advancedOptions,
      subject: subject || blueprint.detectedSubject || 'Toán',
      grade: grade || blueprint.detectedGrade || 'Lớp 8',
    });

    res.json({
      exam,
      logs: modelManager.getLogs(),
      activeModel: modelManager.getActiveModel(),
    });
  } catch (err: any) {
    console.error(`Error generating single exam ${req.body.index}:`, err);
    res.status(500).json({
      error: err.message || 'Lỗi khi tạo đề tương tự.',
      logs: modelManager.getLogs(),
      activeModel: modelManager.getActiveModel(),
    });
  }
});

// API: Generate Similar Exams (Batch)
app.post('/api/exam/generate', async (req: Request, res: Response) => {
  try {
    const { blueprint, count, options, subject, grade } = req.body;

    if (!blueprint || !blueprint.questions || blueprint.questions.length === 0) {
      return res.status(400).json({ error: 'Cấu trúc đề mẫu không hợp lệ.' });
    }

    const examCount = Math.min(Math.max(parseInt(count) || 3, 1), 10);
    const advancedOptions: AdvancedOptions = options || {
      examCount,
      includeAnswers: true,
      includeExplanations: true,
      figureHandling: 'generate_new_svg',
      exportMode: 'individual',
      keepExactScores: true,
    };

    const exams = await modelManager.generateSimilarExams({
      blueprint,
      count: examCount,
      options: advancedOptions,
      subject: subject || blueprint.detectedSubject || 'Toán',
      grade: grade || blueprint.detectedGrade || 'Lớp 8',
    });

    res.json({
      exams,
      logs: modelManager.getLogs(),
      activeModel: modelManager.getActiveModel(),
    });
  } catch (err: any) {
    console.error('Error generating exams:', err);
    res.status(500).json({
      error: err.message || 'Lỗi khi tạo đề tương tự.',
      logs: modelManager.getLogs(),
      activeModel: modelManager.getActiveModel(),
    });
  }
});

// API: Regenerate Single Question
app.post('/api/exam/regenerate-question', async (req: Request, res: Response) => {
  try {
    const { originalQuestion, currentQuestion, subject, grade } = req.body;

    if (!originalQuestion || !currentQuestion) {
      return res.status(400).json({ error: 'Thiếu thông tin câu hỏi để tạo lại.' });
    }

    const newQuestion = await modelManager.regenerateSingleQuestion({
      originalQuestion,
      currentQuestion,
      subject,
      grade,
    });

    res.json({
      question: newQuestion,
      logs: modelManager.getLogs(),
      activeModel: modelManager.getActiveModel(),
    });
  } catch (err: any) {
    console.error('Error regenerating question:', err);
    res.status(500).json({
      error: err.message || 'Lỗi khi tạo lại câu hỏi.',
      logs: modelManager.getLogs(),
      activeModel: modelManager.getActiveModel(),
    });
  }
});

// API: Export DOCX
app.post('/api/exam/export-docx', async (req: Request, res: Response) => {
  try {
    const { exams, options, fileName } = req.body;

    if (!exams || !Array.isArray(exams) || exams.length === 0) {
      return res.status(400).json({ error: 'Không có dữ liệu đề để xuất Word.' });
    }

    const docxBuffer = await DocxGenerator.generateExamsDocx(exams, options || {
      includeAnswers: true,
      includeExplanations: true,
      mode: 'single',
    });

    const exportFileName = fileName || `De_kiem_tra_${exams[0].subject}_${exams[0].grade}.docx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(exportFileName)}"`
    );
    res.send(docxBuffer);
  } catch (err: any) {
    console.error('Error exporting DOCX:', err);
    res.status(500).json({
      error: err.message || 'Lỗi khi xuất tệp Word .docx.',
    });
  }
});

// 404 handler for any unhandled /api/* endpoint to guarantee pure JSON responses (never HTML)
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: `Đường dẫn API '${req.method} ${req.originalUrl}' không tồn tại trên máy chủ (Mã lỗi 404). Vui lòng kiểm tra lại.`,
    status: 404,
    timestamp: new Date().toISOString(),
  });
});

// Global Express error handler to guarantee pure JSON error responses and avoid HTML error leaks
app.use((err: any, req: Request, res: Response, _next: any) => {
  console.error('[Unhandled Express Error]:', err);
  const status = typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({
    error: err?.message || 'Lỗi hệ thống máy chủ nội bộ (500). Vui lòng thử lại.',
    status,
    timestamp: new Date().toISOString(),
  });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Tạo Đề Tương Tự server running at http://0.0.0.0:${PORT}`);
  });
  // Prevent 504 Gateway Timeout during heavy LLM generation
  server.timeout = 240000;
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
}

startServer();
