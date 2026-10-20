import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  RotateCcw,
  ArrowUpDown
} from 'lucide-react';
import { Progress, AlertDialog } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useRearrangePdf } from '../../hooks/pdf/useRearrangePdf';
import { formatBytes, blobToUint8Array, readPdfPageCount } from '../../core/shared';

interface PageItem {
  id: string; // unique item id for React list rendering
  originalPageIndex: number; // 0-indexed page in source document
  originalPageNumber: number; // 1-indexed for display
}

interface LoadedPdfState {
  file: File;
  buffer: Uint8Array;
  pageCount: number;
}

export function RearrangePdfTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdfState | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [customFileName, setCustomFileName] = useState('pdf-com-in-rearranged');
  const [isDragOver, setIsDragOver] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    execute,
    reset,
    isProcessing,
    isSuccess,
    isError,
    error,
    result,
    objectUrl,
    progress
  } = useRearrangePdf();

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      const pageCount = await readPdfPageCount(buffer);

      const initialPages: PageItem[] = Array.from({ length: pageCount }, (_, i) => ({
        id: `page-${i}-${Date.now()}-${Math.random()}`,
        originalPageIndex: i,
        originalPageNumber: i + 1
      }));

      setLoadedPdf({ file, buffer, pageCount });
      setPages(initialPages);
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-rearranged');
    } catch {
      // Handled via error display
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const movePage = (currentIndex: number, targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    setPages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(currentIndex, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    });
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const duplicatePage = (index: number) => {
    setPages((prev) => {
      const copy = [...prev];
      const target = copy[index];
      const newItem: PageItem = {
        id: `page-${target.originalPageIndex}-${Date.now()}-${Math.random()}`,
        originalPageIndex: target.originalPageIndex,
        originalPageNumber: target.originalPageNumber
      };
      copy.splice(index + 1, 0, newItem);
      return copy;
    });
  };

  const reversePages = () => {
    setPages((prev) => [...prev].reverse());
  };

  const resetToOriginal = () => {
    if (!loadedPdf) return;
    const initialPages: PageItem[] = Array.from({ length: loadedPdf.pageCount }, (_, i) => ({
      id: `page-${i}-${Date.now()}-${Math.random()}`,
      originalPageIndex: i,
      originalPageNumber: i + 1
    }));
    setPages(initialPages);
  };

  const handleExecute = async () => {
    if (!loadedPdf || pages.length === 0) return;
    const pageOrder = pages.map((p) => p.originalPageIndex);
    await execute({
      buffer: loadedPdf.buffer,
      pageOrder,
      fileName: loadedPdf.file.name
    });
  };

  const clearAll = () => {
    reset();
    setLoadedPdf(null);
    setPages([]);
    setConfirmClearOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ToolPageHeader
        toolId="rearrange"
        action={
          loadedPdf ? (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
            >
              Clear and start over
            </button>
          ) : null
        }
      />

      {/* Success State */}
      {isSuccess && result && objectUrl && (
        <div className="mb-8 p-6 sm:p-8 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                  PDF Pages Rearranged Successfully!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  New document has <span className="font-semibold text-slate-900 dark:text-white">{result.pageCount} pages</span> ({formatBytes(result.byteLength)}). Original had {result.originalPageCount} pages.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <a
                href={objectUrl}
                download={`${customFileName || 'rearranged'}.pdf`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl font-semibold shadow-sm transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
              <a
                href={objectUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors text-sm"
                title="Preview in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors text-sm"
                title="Adjust order"
              >
                <RefreshCw className="w-4 h-4" />
                Rearrange Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {isError && error && (
        <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300">
              {error.userMessage}
            </h3>
            {Boolean(error.details) && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-mono">
                {JSON.stringify(error.details)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      {!loadedPdf ? (
        <ToolFileDropzone
          icon={Upload}
          title="Drop your PDF file here, or browse"
          description="Supports documents of any size. Processed 100% locally on your device."
          isDragOver={isDragOver}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-3xl"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />
        </ToolFileDropzone>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-[var(--primary)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate max-w-xs sm:max-w-md">
                    {loadedPdf.file.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatBytes(loadedPdf.file.size)} • Original: {loadedPdf.pageCount} pages • Output: {pages.length} pages
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={reversePages}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  Reverse Order
                </button>
                <button
                  type="button"
                  onClick={resetToOriginal}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Order
                </button>
              </div>
            </div>

            {/* Output File Name Setting */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <label htmlFor="fileNameInput" className="font-medium">Output filename:</label>
                <input
                  id="fileNameInput"
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                />
                <span className="text-slate-400 font-mono">.pdf</span>
              </div>

              <button
                type="button"
                onClick={handleExecute}
                disabled={isProcessing || pages.length === 0}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-semibold shadow-sm transition-all text-sm"
              >
                {isProcessing ? 'Processing...' : `Save Rearranged PDF (${pages.length} pages)`}
              </button>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Reordering pages...</span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <Progress.Root value={progress} className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <Progress.Track className="h-full w-full">
                    <Progress.Indicator
                      style={{ transform: `translateX(-${100 - progress}%)` }}
                      className="h-full bg-[var(--primary)] transition-transform duration-200"
                    />
                  </Progress.Track>
                </Progress.Root>
              </div>
            )}
          </div>

          {/* Page Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {pages.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === pages.length - 1;

              return (
                <div
                  key={item.id}
                  className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Sequence Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[var(--primary)]">
                      #{index + 1}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Orig: p.{item.originalPageNumber}
                    </span>
                  </div>

                  {/* Page Visual Placeholder */}
                  <div className="aspect-[3/4] bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center p-3 text-center my-1 select-none">
                    <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-1" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Page {item.originalPageNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Position {index + 1}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => movePage(index, index - 1)}
                        disabled={isFirst || isProcessing}
                        title="Move left / up"
                        className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5 rotate-[-90deg]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePage(index, index + 1)}
                        disabled={isLast || isProcessing}
                        title="Move right / down"
                        className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5 rotate-[-90deg]" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => duplicatePage(index)}
                        disabled={isProcessing}
                        title="Duplicate this page"
                        className="p-1 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePage(index)}
                        disabled={pages.length <= 1 || isProcessing}
                        title={pages.length <= 1 ? "At least 1 page required" : "Delete page"}
                        className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Clear All */}
      <AlertDialog.Root open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity z-50" />
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl z-50">
            <AlertDialog.Title className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Clear Current Document?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              This will discard the currently loaded document and any page reordering changes.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Close className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                Cancel
              </AlertDialog.Close>
              <button
                type="button"
                onClick={clearAll}
                className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors"
              >
                Clear Everything
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
