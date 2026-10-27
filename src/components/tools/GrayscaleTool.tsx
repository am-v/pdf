import { useState, useRef, useCallback } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Palette,
  Droplet
} from 'lucide-react';
import { Progress } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useGrayscale } from '../../hooks/pdf/useGrayscale';
import { useMobileResultScroll } from '../../hooks/useMobileResultScroll';
import { blobToUint8Array, formatBytes } from '../../core/shared';

interface LoadedPdf {
  file: File;
  buffer: Uint8Array;
}

export function GrayscaleTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  const [scale, setScale] = useState<number>(1.5);
  const [quality, setQuality] = useState<number>(0.8);
  const [customFileName, setCustomFileName] = useState('grayscale');
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
  } = useGrayscale();
  const resultRef = useMobileResultScroll(isSuccess && Boolean(result));

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      setLoadedPdf({ file, buffer });
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-grayscale');
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

  const handleConvert = async () => {
    if (!loadedPdf) return;
    await execute({
      buffer: loadedPdf.buffer,
      scale,
      quality
    });
  };

  const clearAll = () => {
    setLoadedPdf(null);
    reset();
  };

  const downloadName = `${customFileName.trim() || 'grayscale'}.pdf`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ToolPageHeader toolId="grayscale" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input / Result */}
        <div className="lg:col-span-2 space-y-6">
          {!loadedPdf ? (
            <ToolFileDropzone
              icon={Palette}
              title="Click to select PDF or drag and drop"
              description="Desaturates all photos, illustrations, and color text directly on your device."
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
                        <span className="font-semibold text-sm">Grayscale PDF Ready!</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                        <Droplet className="w-3.5 h-3.5" />
                        {result.pageCount} Pages Desaturated
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-emerald-200/50 dark:border-emerald-800/40 flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
                      <span>Total File Size: <strong className="text-neutral-900 dark:text-neutral-100">{formatBytes(result.byteLength)}</strong></span>
                      <span>Color profile: <strong className="text-neutral-900 dark:text-neutral-100">Monochrome / Grayscale</strong></span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <a
                        href={objectUrl}
                        download={downloadName}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Grayscale PDF
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
              <Sliders className="w-5 h-5 rounded bg-accent p-0.5 text-accent-foreground" />
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Conversion Settings
              </h2>
            </div>

            {/* Resolution Scale */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Clarity & Resolution
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 1.2, label: 'Normal' },
                  { value: 1.5, label: 'High' },
                  { value: 2.0, label: 'Print' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScale(opt.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      scale === opt.value
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality setting */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Image Compression
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 0.75, label: 'Standard (75%)' },
                  { value: 0.88, label: 'Maximum (88%)' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setQuality(opt.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      quality === opt.value
                        ? 'bg-accent text-accent-foreground shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
                  placeholder="grayscale"
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
                  <span>Converting pages to grayscale...</span>
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
                  <p className="mt-1">{error?.message || 'Failed to convert to grayscale.'}</p>
                </div>
              </div>
            )}

            {/* Action Button */}
            {!isSuccess && (
              <button
                type="button"
                onClick={handleConvert}
                disabled={!loadedPdf || isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none text-accent-foreground font-semibold text-sm transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Converting ({progress}%)...
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4" />
                    Convert to Grayscale
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
                Convert Another Document
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
