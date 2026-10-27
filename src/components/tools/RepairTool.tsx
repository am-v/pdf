import { useState, useRef, useCallback } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Cpu,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import { Progress } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useRepairPdf } from '../../hooks/pdf/useRepairPdf';
import { useMobileResultScroll } from '../../hooks/useMobileResultScroll';
import { blobToUint8Array, formatBytes } from '../../core/shared';

interface LoadedPdf {
  file: File;
  buffer: Uint8Array;
}

export function RepairTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  const [password, setPassword] = useState('');
  const [customFileName, setCustomFileName] = useState('repaired');
  const [isDragOver, setIsDragOver] = useState(false);
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
  } = useRepairPdf();
  const resultRef = useMobileResultScroll(isSuccess && Boolean(result));

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      setLoadedPdf({ file, buffer });
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-repaired');
    } catch {
      // Ignored
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRepair = async () => {
    if (!loadedPdf) return;
    await execute({
      buffer: loadedPdf.buffer,
      fileName: loadedPdf.file.name,
      password: password || undefined
    });
  };

  const clearAll = () => {
    setLoadedPdf(null);
    setPassword('');
    reset();
  };

  const downloadName = `${customFileName.trim() || 'repaired'}.pdf`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ToolPageHeader toolId="repair" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input / Result */}
        <div className="lg:col-span-2 space-y-6">
          {!loadedPdf ? (
            <ToolFileDropzone
              icon={Wrench}
              title="Click to select damaged PDF or drag and drop"
              description="Powered by high-performance QPDF WebAssembly and resilient tree recovery."
              isDragOver={isDragOver}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                accept="application/pdf"
                className="hidden"
              />
            </ToolFileDropzone>
          ) : (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 shadow-sm">
              {/* Selected File Card */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {loadedPdf.file.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatBytes(loadedPdf.file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium px-2 py-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                >
                  Change file
                </button>
              </div>

              {/* Success Result */}
              {isSuccess && result && objectUrl && (
                <div ref={resultRef} className="space-y-6">
                  <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold text-sm">PDF Successfully Repaired!</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Recovered
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-emerald-200/50 dark:border-emerald-800/40 text-xs text-neutral-700 dark:text-neutral-300">
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400 block">Pages Recovered</span>
                        <strong className="text-sm text-neutral-900 dark:text-neutral-100">{result.pageCount} Pages</strong>
                      </div>
                      <div>
                        <span className="text-neutral-500 dark:text-neutral-400 block">Engine Used</span>
                        <strong className="text-sm text-neutral-900 dark:text-neutral-100 uppercase">{result.engineUsed}</strong>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed bg-white/50 dark:bg-neutral-900/50 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      {result.repairNotes}
                    </p>

                    <div className="flex gap-2 pt-2">
                      <a
                        href={objectUrl}
                        download={downloadName}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Repaired PDF
                      </a>
                      <a
                        href={objectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Settings & Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <Cpu className="w-5 h-5 rounded bg-accent p-0.5 text-accent-foreground" />
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Repair Engine
              </h2>
            </div>

            {/* Engine Info */}
            <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                <Layers className="w-4 h-4 rounded bg-accent p-0.5 text-accent-foreground" />
                <span>Multi-Tier Reconstruction</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Applies QPDF WebAssembly to rebuild damaged XRef pointers, repair corrupted flate streams, and linearize object catalogs.
              </p>
            </div>

            {/* Optional Password */}
            <div className="space-y-2">
              <label
                htmlFor="passwordInput"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                Password (if encrypted)
              </label>
              <input
                id="passwordInput"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank if not protected"
                className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Output Filename */}
            <div className="space-y-2">
              <label
                htmlFor="fileNameInput"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              >
                Output Filename
              </label>
              <div className="flex rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <input
                  id="fileNameInput"
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  placeholder="repaired"
                />
                <span className="px-3 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-mono flex items-center">
                  .pdf
                </span>
              </div>
            </div>

            {/* Progress Display */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  <span>Reconstructing document...</span>
                  <span>{progress}%</span>
                </div>
                <Progress.Root
                  value={progress}
                  className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                >
                  <Progress.Track className="h-full w-full">
                    <Progress.Indicator
                      style={{ width: `${progress}%` }}
                      className="h-full bg-accent transition-all duration-200"
                    />
                  </Progress.Track>
                </Progress.Root>
              </div>
            )}

            {/* Error Message */}
            {isError && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 dark:text-rose-300">
                  <p className="font-semibold">{error?.name || 'Error'}</p>
                  <p className="mt-1">{error?.message || 'Failed to repair document.'}</p>
                </div>
              </div>
            )}

            {/* Repair Button */}
            {!isSuccess && (
              <button
                type="button"
                onClick={handleRepair}
                disabled={!loadedPdf || isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none text-accent-foreground font-semibold text-sm transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Repairing ({progress}%)...
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4" />
                    Repair PDF
                  </>
                )}
              </button>
            )}

            {isSuccess && (
              <button
                type="button"
                onClick={clearAll}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs transition-colors"
              >
                Repair Another Document
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
