import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker source using CDN matching the package version
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface PDFPreValidationResult {
  valid: boolean;
  reason?: string;
  textLength?: number;
}

export const validatePDF = async (file: File): Promise<PDFPreValidationResult> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Check 1: Page count
    if (pdf.numPages === 0) {
      return { 
        valid: false, 
        reason: 'PDF has 0 pages. Please upload a valid document.',
        textLength: 0
      };
    }

    // Check 2: Text content across first 3 pages (or fewer if less than 3)
    let totalText = '';
    const pagesToCheck = Math.min(pdf.numPages, 3);
    
    for (let i = 1; i <= pagesToCheck; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      totalText += content.items.map((item: any) => (item as any).str || '').join(' ');
    }

    const textLength = totalText.trim().length;

    if (textLength < 50) {
      return { 
        valid: false, 
        reason: 'PDF appears to be empty or a scanned image with no extractable text. Please upload a text-based PDF.',
        textLength
      };
    }

    return { 
      valid: true,
      textLength
    };
  } catch (err: any) {
    console.error('Error pre-validating PDF:', err);
    return {
      valid: false,
      reason: 'Failed to read PDF file. The file may be corrupt or encrypted.',
      textLength: 0
    };
  }
};
