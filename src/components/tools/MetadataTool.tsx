import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { Progress, AlertDialog } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useMetadata } from '../../hooks/pdf/useMetadata';
import { formatBytes, blobToUint8Array } from '../../core/shared';

interface LoadedPdfState {
  file: File;
  buffer: Uint8Array;
}

export function MetadataTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdfState | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [creator, setCreator] = useState('');
  const [producer, setProducer] = useState('');
  const [customFileName, setCustomFileName] = useState('pdf-com-in-metadata');
  const [isDragOver, setIsDragOver] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    execute,
    loadMetadata,
    reset,
    isProcessing,
    isSuccess,
    isError,
    error,
    result,
    objectUrl,
    progress
  } = useMetadata();

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      setLoadedPdf({ file, buffer });
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-metadata');

      const read = await loadMetadata(buffer, file.name);
      if (read) {
        setTitle(read.metadata.title || '');
        setAuthor(read.metadata.author || '');
        setSubject(read.metadata.subject || '');
        setKeywords(read.metadata.keywords || '');
        setCreator(read.metadata.creator || '');
        setProducer(read.metadata.producer || '');
      }
    } catch {
      // Handled in UI
    }
  }, [loadMetadata]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async () => {
    if (!loadedPdf) return;
    await execute({
      buffer: loadedPdf.buffer,
      metadata: {
        title,
        author,
        subject,
        keywords,
        creator,
        producer
      },
      wipe: false,
      fileName: loadedPdf.file.name
    });
  };

  const handleDeepWipe = async () => {
    if (!loadedPdf) return;
    setConfirmWipeOpen(false);
    await execute({
      buffer: loadedPdf.buffer,
      wipe: true,
      fileName: loadedPdf.file.name
    });
  };

  const clearAll = () => {
    reset();
    setLoadedPdf(null);
    setTitle('');
    setAuthor('');
    setSubject('');
    setKeywords('');
    setCreator('');
    setProducer('');
    setConfirmClearOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ToolPageHeader
        toolId="metadata"
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
                  {result.isWiped ? 'Metadata Deep-Cleaned & Wiped!' : 'Metadata Updated Successfully!'}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {result.isWiped
                    ? `All author info, keywords, and hidden XML metadata streams have been stripped (${result.pageCount} pages, ${formatBytes(result.byteLength)}).`
                    : `Saved updated tags (${result.pageCount} pages, ${formatBytes(result.byteLength)}).`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <a
                href={objectUrl}
                download={`${customFileName || 'metadata'}.pdf`}
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
                title="Preview modified file"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors text-sm"
                title="Modify again"
              >
                <RefreshCw className="w-4 h-4" />
                Edit Again
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

      {/* Dropzone or Metadata Form */}
      {!loadedPdf ? (
        <ToolFileDropzone
          icon={Upload}
          title="Drop your PDF file here, or browse"
          description="Processed 100% locally on your computer. Private and secure."
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-[var(--primary)]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                  {loadedPdf.file.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatBytes(loadedPdf.file.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setConfirmWipeOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Deep Clean Wipe
            </button>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="titleInput" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Document Title
              </label>
              <input
                id="titleInput"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Financial Report"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div>
              <label htmlFor="authorInput" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Author
              </label>
              <input
                id="authorInput"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div>
              <label htmlFor="subjectInput" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject
              </label>
              <input
                id="subjectInput"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Quarterly Audit"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div>
              <label htmlFor="keywordsInput" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Keywords (comma separated)
              </label>
              <input
                id="keywordsInput"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. report, finance, 2026"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div>
              <label htmlFor="creatorInput" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Application Creator
              </label>
              <input
                id="creatorInput"
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="e.g. pdf.com.in"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div>
              <label htmlFor="producerInput" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PDF Producer
              </label>
              <input
                id="producerInput"
                type="text"
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
                placeholder="e.g. pdf-lib"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          {/* Filename input */}
          <div>
            <label htmlFor="customFileName" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Output Filename
            </label>
            <div className="flex items-center">
              <input
                id="customFileName"
                type="text"
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-l-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
              <span className="px-3 py-2 text-xs border border-l-0 border-slate-200 dark:border-slate-700 rounded-r-xl bg-slate-50 dark:bg-slate-800 text-slate-500 font-mono">
                .pdf
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div className="pt-2">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Saving metadata changes...</span>
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

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isProcessing}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-semibold shadow-sm transition-all text-sm"
            >
              {isProcessing ? 'Processing...' : 'Save Updated Metadata'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deep Clean Wipe */}
      <AlertDialog.Root open={confirmWipeOpen} onOpenChange={setConfirmWipeOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity z-50" />
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl z-50">
            <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <AlertDialog.Title className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Deep Clean & Wipe Metadata?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              This will irreversibly remove all author information, software signatures, creation dates, and XML tracking dictionaries embedded in this PDF.
            </AlertDialog.Description>
            <div className="flex justify-end gap-3">
              <AlertDialog.Close className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                Cancel
              </AlertDialog.Close>
              <button
                type="button"
                onClick={handleDeepWipe}
                className="px-4 py-2 text-sm font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors"
              >
                Confirm Deep Wipe
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Confirmation Dialog for Clear All */}
      <AlertDialog.Root open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity z-50" />
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl z-50">
            <AlertDialog.Title className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Clear Current Document?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              This will discard the currently loaded document and any metadata changes.
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
