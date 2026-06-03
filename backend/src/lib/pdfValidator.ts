import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

export interface PDFValidationResult {
  valid: boolean;
  reason?: string;
  pageCount?: number;
  textLength?: number;
}

export const validateUploadedPDF = async (buffer: Buffer): Promise<PDFValidationResult> => {
  // Check 1: Parse with pdf-lib — catches corrupt/malformed PDFs
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
  } catch (err) {
    return { 
      valid: false, 
      reason: 'PDF is corrupt or password-protected.',
      pageCount: 0,
      textLength: 0
    };
  }

  const pageCount = pdfDoc.getPageCount();

  // Check 2: Page count
  if (pageCount === 0) {
    return { 
      valid: false, 
      reason: 'PDF has 0 pages.',
      pageCount: 0,
      textLength: 0
    };
  }

  // Check 3: Text extraction via pdfjs-dist (legacy build for Node compatibility)
  let totalText = '';
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    const pagesToCheck = Math.min(pdf.numPages, 3);
    
    for (let i = 1; i <= pagesToCheck; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      totalText += content.items.map((item: any) => item.str).join(' ');
    }
  } catch (err: any) {
    console.error('Error during text extraction:', err);
    return { 
      valid: false, 
      reason: 'Failed to extract text from PDF. The file may be corrupt or encrypted.',
      pageCount,
      textLength: 0
    };
  }

  const textLength = totalText.trim().length;

  if (textLength < 50) {
    return { 
      valid: false, 
      reason: 'PDF has insufficient extractable text (less than 50 characters). Likely blank or scanned image.',
      pageCount,
      textLength
    };
  }

  return { 
    valid: true, 
    pageCount, 
    textLength 
  };
};
export default validateUploadedPDF;
