import { useState, useRef, useCallback } from 'react';
import {
  Download,
  Copy,
  Check,
  FileText,
  RefreshCw,
  AlertCircle,
  Sliders,
  Lock,
  Layers,
  Hash,
  AlignLeft
} from 'lucide-react';
import { Progress } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { usePdfToText } from '../../hooks/pdf/usePdfToText';
import { useMobileResultScroll } from '../../hooks/useMobileResultScroll';
import { blobToUint8Array, formatBytes } from '../../core/shared';

interface LoadedPdf {
  file: File;
  buffer: Uint8Array;
}

export function PdfToTextTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdf | null>(null);
  const [password, setPassword] = useState('');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [customFileName, setCustomFileName] = useState('extracted-text');
  const [copied, setCopied] = useState(false);
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
  } = usePdfToText();
  const resultRef = useMobileResultScroll(isSuccess && Boolean(result));

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      setLoadedPdf({ file, buffer });
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-text');
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

  const handleExtract = async () => {
    if (!loadedPdf) return;
    await execute({
      buffer: loadedPdf.buffer,
      password: password || undefined,
      includePageHeaders: includeHeaders
    });
  };

  const handleCopy = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = result.text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customFileName.trim() || 'extracted-text'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setLoadedPdf(null);
    setPassword('');
    reset();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ToolPageHeader toolId="pdf-to-text" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Input / Result display */}
        <div className="lg:col-span-2 space-y-6">
          {!loadedPdf ? (
            <ToolFileDropzone
              icon={FileText}
              title="Click to select PDF or drag and drop"
              description="Extracts all text layers instantly on your local device."
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

              {/* Text Preview / Result */}
              {isSuccess && result && (
                <div ref={resultRef} className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Pages</span>
                      </div>
                      <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                        {result.pageCount}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <AlignLeft className="w-3.5 h-3.5" />
                        <span>Words</span>
                      </div>
                      <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                        {result.wordCount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <Hash className="w-3.5 h-3.5" />
                        <span>Characters</span>
                      </div>
                      <p className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                        {result.characterCount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="relative">
                    <textarea
                      readOnly
                      value={result.text}
                      rows={14}
                      className="w-full p-4 font-mono text-xs leading-relaxed bg-neutral-50 dark:bg-neutral-800/70 text-neutral-800 dark:text-neutral-200 rounded-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none resize-y"
                    />
                  </div>

                  {/* Quick Copy / Download Buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="py-2.5 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-2 transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          Copied to Clipboard!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Text
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="py-2.5 px-4 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download .txt
                    </button>
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
                Extraction Options
              </h2>
            </div>

            {/* Page Header Checkbox */}
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                  className="w-4 h-4 rounded text-gray-900 dark:text-gray-100 focus:ring-accent border-neutral-300 dark:border-neutral-700"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                  Include Page Markers
                </span>
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 pl-7">
                Adds header tags like "--- Page 1 ---" between document pages.
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
                htmlFor="txtFileName"
                className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
              >
                Output Filename
              </label>
              <div className="flex rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                <input
                  id="txtFileName"
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  placeholder="extracted-text"
                />
                <span className="px-3 py-2 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 font-mono flex items-center">
                  .txt
                </span>
              </div>
            </div>

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  <span>Extracting text layers...</span>
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

            {/* Error */}
            {isError && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 dark:text-rose-300">
                  <p className="font-semibold">{error?.name || 'Error'}</p>
                  <p className="mt-1">{error?.message || 'Failed to extract text.'}</p>
                </div>
              </div>
            )}

            {/* Trigger Extract Button */}
            {!isSuccess && (
              <button
                type="button"
                onClick={handleExtract}
                disabled={!loadedPdf || isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none text-accent-foreground font-semibold text-sm transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Extracting Text ({progress}%)...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Extract Text
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
                Extract Another Document
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
