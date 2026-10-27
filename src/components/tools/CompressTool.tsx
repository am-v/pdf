import { useState, useRef, useCallback } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  AlertCircle,
  Sliders,
  CheckCircle2,
  Minimize2,
  TrendingDown,
  Sparkles
} from 'lucide-react';
import { Progress } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useCompressPdf } from '../../hooks/pdf/useCompressPdf';
import { useMobileResultScroll } from '../../hooks/useMobileResultScroll';
import type { CompressQuality } from '../../core/pdf/compress/compressPdf.types';
import { blobToUint8Array, formatBytes } from '../../core/shared';

interface LoadedPdf {
  file: File;
  buffer: Uint8Array;
}

export function CompressTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  const [quality, setQuality] = useState<CompressQuality>('medium');
  const [customFileName, setCustomFileName] = useState('compressed');
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
  } = useCompressPdf();
  const resultRef = useMobileResultScroll(isSuccess && Boolean(result));

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      setLoadedPdf({ file, buffer });
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-compressed');
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

  const handleCompress = async () => {
    if (!loadedPdf) return;
    await execute({
      buffer: loadedPdf.buffer,
      quality
    });
  };

  const clearAll = () => {
    setLoadedPdf(null);
    reset();
  };

  const downloadName = `${customFileName.trim() || 'compressed'}.pdf`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ToolPageHeader toolId="compress" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input / Result */}
        <div className="lg:col-span-2 space-y-6">
          {!loadedPdf ? (
            <ToolFileDropzone
              icon={Minimize2}
              title="Click to select PDF or drag and drop"
              description="Optimizes images and streams locally in your browser with zero server uploads."
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
                      Original size: {formatBytes(loadedPdf.file.size)}
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

              {/* Compression Success Comparison */}
              {isSuccess && result && objectUrl && (
                <div ref={resultRef} className="space-y-6">
                  {/* Results Card */}
                  <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold text-sm">Compression Complete!</span>
                      </div>
                      {result.reductionPercent > 0 && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" />
                          {result.reductionPercent}% Saved
                        </span>
                      )}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-white/80 dark:bg-neutral-900/80 border border-emerald-200/50 dark:border-emerald-800/40">
                      <div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Original Size</p>
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mt-0.5">
                          {formatBytes(result.originalSize)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Compressed</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {formatBytes(result.compressedSize)}
                        </p>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Method</p>
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mt-0.5 capitalize">
                          {result.methodUsed.replace('-', ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <a
                        href={objectUrl}
                        download={downloadName}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Compressed PDF
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
                Compression Level
              </h2>
            </div>

            {/* Quality Tiers */}
            <div className="space-y-3">
              {[
                {
                  id: 'high',
                  title: 'High Quality',
                  desc: 'Mild compression, optimal for documents with fine detail'
                },
                {
                  id: 'medium',
                  title: 'Recommended',
                  desc: 'Balanced compression with sharp text and clear images'
                },
                {
                  id: 'low',
                  title: 'Maximum Savings',
                  desc: 'Smallest file size, ideal for email and storage limits'
                }
              ].map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setQuality(tier.id as CompressQuality)}
                  className={`w-full p-3 rounded-xl text-left border transition-all ${
                    quality === tier.id
                      ? 'border-accent bg-accent/5 shadow-sm ring-1 ring-accent'
                      : 'border-neutral-200 dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {tier.title}
                    </p>
                    {tier.id === 'medium' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent/10 text-gray-900 dark:text-gray-100">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-snug">
                    {tier.desc}
                  </p>
                </button>
              ))}
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
                  placeholder="compressed"
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
                  <span>Optimizing document...</span>
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
                  <p className="mt-1">{error?.message || 'Failed to compress document.'}</p>
                </div>
              </div>
            )}

            {/* Compress Button */}
            {!isSuccess && (
              <button
                type="button"
                onClick={handleCompress}
                disabled={!loadedPdf || isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none text-accent-foreground font-semibold text-sm transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Compressing ({progress}%)...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Compress PDF
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
                Compress Another Document
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
