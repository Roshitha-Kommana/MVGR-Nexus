import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ZoomIn, ZoomOut, FileWarning } from 'lucide-react';
import ElephantLoader from './ElephantLoader.js';

// Configure pdfjs worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// CSS fixes for react-pdf text layers
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

interface PDFViewerProps {
  fileUrl: string;
}

export const PDFViewer = ({ fileUrl }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState<number>(1.0);
  const [loadError, setLoadError] = useState<boolean>(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoadError(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF in viewer:', error);
    setLoadError(true);
  }

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 2.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  // We display at most 3 pages as a preview
  const previewPageCount = numPages ? Math.min(numPages, 3) : 0;
  const pageNumbers = Array.from({ length: previewPageCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-col h-full bg-background-cardLight dark:bg-background-cardDark border border-background-borderLight dark:border-background-borderDark rounded-xl overflow-hidden shadow-xl">
      {/* Viewer controls */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-background-borderLight dark:border-background-borderDark bg-background-light/50 dark:bg-background-dark/50 backdrop-blur-md">
        <span className="text-xs font-semibold text-text-lightMuted dark:text-text-darkMuted uppercase tracking-wider">
          Preview ({previewPageCount} of {numPages || '?'} pages)
        </span>
        <div className="flex gap-2">
          <button 
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 rounded-lg border border-background-borderLight dark:border-background-borderDark hover:bg-primary/10 text-text-light dark:text-text-dark transition disabled:opacity-50"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <button 
            onClick={zoomIn}
            disabled={scale >= 2.0}
            className="p-1.5 rounded-lg border border-background-borderLight dark:border-background-borderDark hover:bg-primary/10 text-text-light dark:text-text-dark transition disabled:opacity-50"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* PDF Scroll Canvas */}
      <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-gray-100 dark:bg-background-dark min-h-[500px]">
        {loadError ? (
          <div className="flex flex-col items-center justify-center text-red-500 gap-2 p-8 text-center max-w-sm m-auto">
            <FileWarning size={48} />
            <h3 className="font-heading font-semibold text-lg">Error Loading Preview</h3>
            <p className="text-sm text-text-lightMuted dark:text-text-darkMuted">
              We couldn't render this PDF preview. You can still download the full file directly.
            </p>
          </div>
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<ElephantLoader size="md" text="Loading document preview..." />}
            className="flex flex-col gap-6"
          >
            {pageNumbers.map((pageNumber) => (
              <div 
                key={pageNumber} 
                className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 border border-gray-200 dark:border-gray-800"
                style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
              >
                <Page
                  pageNumber={pageNumber}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  width={550}
                  className="max-w-full"
                />
                <div className="text-center py-1 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400 font-semibold select-none">
                  Page {pageNumber}
                </div>
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
