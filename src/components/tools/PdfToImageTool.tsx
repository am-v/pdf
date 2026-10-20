import { useState, useRef, useCallback } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  RefreshCw,
  AlertCircle,
  Sliders,
  Lock,
  ImageIcon,
  Archive,
  CheckCircle2
} from 'lucide-react';
import { Progress } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { usePdfToImage } from '../../hooks/pdf/usePdfToImage';
import type { PdfToImageDpi, PdfToImageFormat } from '../../core/pdf/pdf-to-image/pdfToImage.types';
import { blobToUint8Array, formatBytes } from '../../core/shared';

interface LoadedPdf {
  file: File;
  buffer: Uint8Array;
}

export function PdfToImageTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  const [password, setPassword] = useState('');
  const [dpi, setDpi] = useState<PdfToImageDpi>(150);
  const [format, setFormat] = useState<PdfToImageFormat>('png');
  const [customFileName, setCustomFileName] = useState('pdf-pages');
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
    progress
  } = usePdfToImage();

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      setLoadedPdf({ file, buffer });
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-images');
    } catch {
      // Handled in UI
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
      password: password || undefined,
      format,
      dpi,
      baseFileName: customFileName.trim() || 'page',
      generateZip: true
    });
  };

  const clearAll = () => {
    setLoadedPdf(null);
    setPassword('');
    reset();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ToolPageHeader toolId="pdf-to-image" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input / Result Gallery */}
        <div className="lg:col-span-2 space-y-6">
          {!loadedPdf ? (
            <ToolFileDropzone
              icon={ImageIcon}
              title="Click to upload or drag & drop PDF"
              description="All pages will be rendered directly on your local device."
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
              {/* Loaded Document Card */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
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

              {/* Rendered Images Grid */}
              {isSuccess && result && (
                <div className="space-y-6">
                  {/* Top Bar with ZIP Download */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">
                          Converted {result.pageCount} Page{result.pageCount > 1 ? 's' : ''}!
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          {format.toUpperCase()} images ready to save or open.
                        </p>
                      </div>
                    </div>
                    {result.zipUrl && (
                      <a
                        href={result.zipUrl}
                        download={`${customFileName.trim() || 'pdf-images'}.zip`}
                        className="py-2 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
                      >
                        <Archive className="w-4 h-4" />
                        Download All (ZIP)
                      </a>
                    )}
                  </div>

                  {/* Thumbnail Previews */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
                    {result.images.map((img) => (
                      <div
                        key={img.pageNumber}
                        className="group relative rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-800/50 flex flex-col"
                      >
                        <div className="relative aspect-[3/4] bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
                          <img
                            src={img.url}
                            alt={img.fileName}
                            className="w-full h-full object-contain"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-sm">
                            Page {img.pageNumber}
                          </span>
                        </div>
                        <div className="p-3 flex items-center justify-between gap-2 border-t border-neutral-200 dark:border-neutral-700">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                              {img.fileName}
                            </p>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                              {img.width} × {img.height} px
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={img.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                              title="Preview"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={img.url}
                              download={img.fileName}
                              className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
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
              <Sliders className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Conversion Settings
              </h2>
            </div>

            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Image Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'png', label: 'PNG', desc: 'Lossless & sharp' },
                  { id: 'jpeg', label: 'JPEG', desc: 'Smaller file size' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setFormat(opt.id as PdfToImageFormat)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      format === opt.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <p className="text-xs font-bold">{opt.label}</p>
                    <p
                      className={`text-[10px] ${
                        format === opt.id ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* DPI Quality */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Resolution (DPI)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 72, label: '72 DPI', desc: 'Draft' },
                  { value: 150, label: '150 DPI', desc: 'Standard' },
                  { value: 300, label: '300 DPI', desc: 'Print' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDpi(opt.value as PdfToImageDpi)}
                    className={`py-2 px-2 text-center rounded-xl transition-all ${
                      dpi === opt.value
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <p className="text-xs font-bold">{opt.label}</p>
                    <p
                      className={`text-[10px] ${
                        dpi === opt.value ? 'text-white/80' : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
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
                className="w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Output File Base Name */}
            <div className="space-y-2">
              <label
                htmlFor="baseFileName"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              >
                Output Filename
              </label>
              <div className="flex rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <input
                  id="baseFileName"
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  placeholder="pdf-pages"
                />
                <span className="px-3 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-mono flex items-center">
                  -01.{format === 'jpeg' ? 'jpg' : 'png'}
                </span>
              </div>
            </div>

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  <span>Rendering document pages...</span>
                  <span>{progress}%</span>
                </div>
                <Progress.Root
                  value={progress}
                  className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
                >
                  <Progress.Track className="h-full w-full">
                    <Progress.Indicator
                      style={{ width: `${progress}%` }}
                      className="h-full bg-primary transition-all duration-200"
                    />
                  </Progress.Track>
                </Progress.Root>
              </div>
            )}

            {/* Error */}
            {isError && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 dark:text-rose-300">
                  <p className="font-semibold">{error?.name || 'Error'}</p>
                  <p className="mt-1">{error?.message || 'Failed to render PDF pages.'}</p>
                </div>
              </div>
            )}

            {/* Trigger Button */}
            {!isSuccess && (
              <button
                type="button"
                onClick={handleConvert}
                disabled={!loadedPdf || isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-sm transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Rendering Pages ({progress}%)...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    Convert to Images
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
