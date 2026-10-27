import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { Progress, AlertDialog } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useUnlockPdf } from '../../hooks/pdf/useUnlockPdf';
import { useMobileResultScroll } from '../../hooks/useMobileResultScroll';
import { formatBytes, blobToUint8Array, readPdfPageCount } from '../../core/shared';

interface LoadedPdfState {
  file: File;
  buffer: Uint8Array;
  isLocked: boolean;
  pageCount?: number;
}

export function UnlockTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdfState | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [customFileName, setCustomFileName] = useState('pdf-com-in-unlocked');
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
  } = useUnlockPdf();
  const resultRef = useMobileResultScroll(isSuccess && Boolean(result));

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      let isLocked = false;
      let pageCount: number | undefined;

      try {
        pageCount = await readPdfPageCount(buffer);
        isLocked = false;
      } catch {
        // Document is encrypted or locked
        isLocked = true;
      }

      setLoadedPdf({ file, buffer, isLocked, pageCount });
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-unlocked');
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

  const handleExecute = async () => {
    if (!loadedPdf) return;
    await execute({
      buffer: loadedPdf.buffer,
      password: loadedPdf.isLocked ? password : '',
      fileName: loadedPdf.file.name
    });
  };

  const clearAll = () => {
    reset();
    setLoadedPdf(null);
    setPassword('');
    setConfirmClearOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ToolPageHeader
        toolId="unlock"
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
        <div ref={resultRef} className="mb-8 p-6 sm:p-8 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {result.wasEncrypted ? 'PDF Unlocked Successfully!' : 'File Was Already Unlocked'}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {result.wasEncrypted
                    ? `Encryption removed. The new PDF will open without any password (${result.pageCount} pages, ${formatBytes(result.byteLength)}).`
                    : `This file has no password protection. Clean copy ready for download (${result.pageCount} pages).`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <a
                href={objectUrl}
                download={`${customFileName || 'unlocked'}.pdf`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:opacity-90 text-accent-foreground rounded-xl font-semibold shadow-sm transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Download Unlocked PDF
              </a>
              <a
                href={objectUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors text-sm"
                title="Preview unlocked file"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors text-sm"
                title="Unlock another document"
              >
                <RefreshCw className="w-4 h-4" />
                Unlock Another
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

      {/* Dropzone or Unlock Form */}
      {!loadedPdf ? (
        <ToolFileDropzone
          icon={Upload}
          title="Drop your protected PDF here, or browse"
          description="Decrypted client-side via WebAssembly. Fast, private, and zero server uploads."
          buttonLabel="Select PDF File"
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
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-6 border-b border-gray-100 dark:border-gray-800">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-gray-900 dark:text-gray-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                {loadedPdf.file.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatBytes(loadedPdf.file.size)} • {loadedPdf.isLocked ? 'Protected PDF' : `${loadedPdf.pageCount} pages (unlocked)`}
              </p>
            </div>
          </div>

          {/* Status Message & Password Field */}
          {loadedPdf.isLocked ? (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <p className="font-semibold">This document is protected with a password.</p>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-400">
                    Enter the password once to decrypt and permanently remove password security.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="unlockPasswordInput" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Document Password
                </label>
                <div className="relative">
                  <input
                    id="unlockPasswordInput"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter current password..."
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -trangray-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                <p className="font-semibold">This document does not have password protection.</p>
                <p className="mt-0.5 text-emerald-700 dark:text-emerald-400">
                  It can be viewed and shared freely without entering any credentials.
                </p>
              </div>
            </div>
          )}

          {/* Filename input */}
          <div>
            <label htmlFor="customFileName" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Output Filename
            </label>
            <div className="flex items-center">
              <input
                id="customFileName"
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-l-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <span className="px-3 py-2 text-xs border border-l-0 border-gray-200 dark:border-gray-700 rounded-r-xl bg-gray-50 dark:bg-gray-800 text-gray-500 font-mono">
                .pdf
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Decrypting PDF via WebAssembly...</span>
                <span className="font-mono">{progress}%</span>
              </div>
              <Progress.Root value={progress} className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <Progress.Track className="h-full w-full">
                  <Progress.Indicator
                    style={{ transform: `trangrayX(-${100 - progress}%)` }}
                    className="h-full bg-accent transition-transform duration-200"
                  />
                </Progress.Track>
              </Progress.Root>
            </div>
          )}

          {/* Action button */}
          <button
            type="button"
            onClick={handleExecute}
            disabled={isProcessing || (loadedPdf.isLocked && !password)}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:opacity-90 disabled:opacity-50 text-accent-foreground rounded-xl font-semibold shadow-sm transition-all text-sm"
          >
            {isProcessing ? 'Unlocking...' : loadedPdf.isLocked ? 'Unlock PDF' : 'Save Unlocked Copy'}
          </button>
        </div>
      )}

      {/* Confirmation Dialog for Clear All */}
      <AlertDialog.Root open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity z-50" />
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 -trangray-x-1/2 -trangray-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl z-50">
            <AlertDialog.Title className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Clear Current Document?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will discard the currently loaded document.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Close className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
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
