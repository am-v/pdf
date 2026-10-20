import { useState, useRef, useCallback } from 'react';
import {
  RotateCw,
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Progress, AlertDialog } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useRotatePdf } from '../../hooks/pdf/useRotatePdf';
import { formatBytes, blobToUint8Array, readPdfPageCount } from '../../core/shared';

interface LoadedRotatePdfState {
  file: File;
  buffer: Uint8Array;
  pageCount: number;
}

export function RotatePdfTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedRotatePdfState | null>(null);
  const [rotations, setRotations] = useState<Record<number, number>>({});
  const [customFileName, setCustomFileName] = useState('pdf-com-in-rotated');
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
  } = useRotatePdf();

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      const pageCount = await readPdfPageCount(buffer);

      setLoadedPdf({ file, buffer, pageCount });
      setRotations({});
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-rotated');
    } catch {
      // Handled via error states
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const rotateSinglePage = (pageNum: number) => {
    setRotations((prev) => {
      const current = prev[pageNum] || 0;
      const next = (current + 90) % 360;
      return { ...prev, [pageNum]: next };
    });
  };

  const rotateAllPages = () => {
    if (!loadedPdf) return;
    setRotations((prev) => {
      const next: Record<number, number> = {};
      for (let i = 1; i <= loadedPdf.pageCount; i++) {
        const current = prev[i] || 0;
        next[i] = (current + 90) % 360;
      }
      return next;
    });
  };

  const resetAllRotations = () => {
    setRotations({});
  };

  const handleSave = async () => {
    if (!loadedPdf) return;
    await execute({
      buffer: loadedPdf.buffer,
      rotations,
      fileName: customFileName
    });
  };

  const handleStartOver = () => {
    reset();
    setLoadedPdf(null);
    setRotations({});
  };

  const hasRotations = Object.values(rotations).some((r) => r !== 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <ToolPageHeader toolId="rotate" />

      {/* SUCCESS STATE */}
      {isSuccess && result && objectUrl && (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">
            PDF Rotated Successfully!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Applied rotation to {result.rotatedPageCount} of {result.pageCount} page(s) ({formatBytes(result.byteLength)}).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-8">
            <a
              href={objectUrl}
              download={`${customFileName || 'rotated'}.pdf`}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-98 transition-all"
            >
              <Download className="w-4 h-4" />
              Download Rotated PDF
            </a>
            <a
              href={objectUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Preview
            </a>
          </div>

          <button
            onClick={handleStartOver}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-primary transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rotate Another Document
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {isError && error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-900/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">Rotation Error</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300">{error.userMessage}</p>
          </div>
        </div>
      )}

      {/* MAIN WORKFLOW */}
      {!isSuccess && (
        <div className="space-y-6">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            accept="application/pdf,.pdf"
            className="hidden"
          />

          {!loadedPdf ? (
            <ToolFileDropzone
              icon={Upload}
              title="Select or Drop a PDF File Here"
              description="Select a PDF to adjust page orientations. Fast client-side processing."
              isDragOver={isDragOver}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className="p-8 sm:p-14 rounded-3xl"
            />
          ) : (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-6">
              {/* Document Overview Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {loadedPdf.file.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {loadedPdf.pageCount} Pages • {formatBytes(loadedPdf.file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={rotateAllPages}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-light text-primary text-xs font-bold hover:bg-primary-light/80 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Rotate All 90°
                  </button>
                  {hasRotations && (
                    <button
                      onClick={resetAllRotations}
                      className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmClearOpen(true)}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Page Grid */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Document Pages (Click any page or button to rotate 90°)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-1 scrollbar-thin">
                  {Array.from({ length: loadedPdf.pageCount }, (_, i) => i + 1).map((pageNum) => {
                    const rot = rotations[pageNum] || 0;
                    return (
                      <div
                        key={pageNum}
                        onClick={() => rotateSinglePage(pageNum)}
                        className={`
                          p-4 rounded-2xl border text-center cursor-pointer select-none transition-all duration-200 group relative
                          ${rot !== 0
                            ? 'border-primary bg-primary-light/30 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-primary/50'}
                        `}
                      >
                        <div className="w-16 h-20 mx-auto mb-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-transform duration-300 shadow-xs"
                             style={{ transform: `rotate(${rot}deg)` }}>
                          <span className="text-xs font-black text-slate-400 group-hover:text-primary">
                            {pageNum}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Page {pageNum}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            rot !== 0 ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {rot}°
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filename & Progress */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 max-w-sm">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Output Filename
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="pdf-com-in-rotated"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                    <span className="ml-2 text-xs text-slate-400 font-bold">.pdf</span>
                  </div>
                </div>

                {isProcessing && (
                  <div className="flex-1 max-w-xs space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Applying Rotations...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress.Root value={progress} className="w-full">
                      <Progress.Track className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <Progress.Indicator
                          style={{ width: `${progress}%` }}
                          className="h-full bg-primary transition-all duration-200 rounded-full"
                        />
                      </Progress.Track>
                    </Progress.Root>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleSave}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Rotated PDF...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4" />
                    <span>Save Rotations & Download PDF</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog.Root open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 animate-in fade-in-0 duration-150" />
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 focus:outline-none">
            <AlertDialog.Title className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Change document?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              This will discard your current document and rotation changes.
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Close className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                Cancel
              </AlertDialog.Close>
              <button
                onClick={() => {
                  setLoadedPdf(null);
                  setRotations({});
                  setConfirmClearOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
              >
                Change Document
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
