import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  LayoutGrid
} from 'lucide-react';
import { Progress, AlertDialog } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { usePageNumbers } from '../../hooks/pdf/usePageNumbers';
import type { PageNumberPosition } from '../../core/pdf/page-numbers/pageNumbers.types';
import { formatBytes, blobToUint8Array, readPdfPageCount } from '../../core/shared';

interface LoadedPdfState {
  file: File;
  buffer: Uint8Array;
  pageCount: number;
}

const PRESET_FORMATS = [
  'Page {n} of {total}',
  '{n} / {total}',
  'Page {n}',
  '{n}'
];

const POSITIONS: { id: PageNumberPosition; label: string; gridCol: string; gridRow: string }[] = [
  { id: 'top-left', label: 'Top Left', gridCol: 'col-start-1', gridRow: 'row-start-1' },
  { id: 'top-center', label: 'Top Center', gridCol: 'col-start-2', gridRow: 'row-start-1' },
  { id: 'top-right', label: 'Top Right', gridCol: 'col-start-3', gridRow: 'row-start-1' },
  { id: 'bottom-left', label: 'Bottom Left', gridCol: 'col-start-1', gridRow: 'row-start-2' },
  { id: 'bottom-center', label: 'Bottom Center', gridCol: 'col-start-2', gridRow: 'row-start-2' },
  { id: 'bottom-right', label: 'Bottom Right', gridCol: 'col-start-3', gridRow: 'row-start-2' }
];

export function PageNumberTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdfState | null>(null);
  const [format, setFormat] = useState('Page {n} of {total}');
  const [position, setPosition] = useState<PageNumberPosition>('bottom-center');
  const [startFrom, setStartFrom] = useState(1);
  const [fontSize, setFontSize] = useState(12);
  const [margin, setMargin] = useState(30);
  const [colorHex, setColorHex] = useState('#6B7280');
  const [customFileName, setCustomFileName] = useState('pdf-com-in-numbered');
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
  } = usePageNumbers();

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      const pageCount = await readPdfPageCount(buffer);

      setLoadedPdf({ file, buffer, pageCount });
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-numbered');
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
      format,
      position,
      startFrom,
      fontSize,
      margin,
      colorHex,
      fileName: loadedPdf.file.name
    });
  };

  const clearAll = () => {
    reset();
    setLoadedPdf(null);
    setConfirmClearOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <ToolPageHeader
        toolId="page-numbers"
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
                  Page Numbers Added Successfully!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Numbered <span className="font-semibold text-slate-900 dark:text-white">{result.numberedPageCount} pages</span> in document ({formatBytes(result.byteLength)}).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <a
                href={objectUrl}
                download={`${customFileName || 'numbered'}.pdf`}
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
                title="Change settings"
              >
                <RefreshCw className="w-4 h-4" />
                Modify Numbers
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

      {/* Dropzone or Settings Form */}
      {!loadedPdf ? (
        <ToolFileDropzone
          icon={Upload}
          title="Drop your PDF file here, or browse"
          description="Processed 100% locally on your browser."
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Configuration Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-[var(--primary)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                    {loadedPdf.file.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatBytes(loadedPdf.file.size)} • {loadedPdf.pageCount} pages
                  </p>
                </div>
              </div>

              {/* Format selection */}
              <div className="mt-6 space-y-4">
                <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Numbering Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_FORMATS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormat(preset)}
                      className={`px-3 py-2 text-xs rounded-xl border font-mono transition-all text-left ${
                        format === preset
                          ? 'border-[var(--primary)] bg-blue-50/50 dark:bg-blue-950/30 text-[var(--primary)] font-bold'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div>
                  <label htmlFor="customFormat" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Custom Template (use <code className="text-xs font-mono">{'{n}'}</code> for page number, <code className="text-xs font-mono">{'{total}'}</code> for total pages):
                  </label>
                  <input
                    id="customFormat"
                    type="text"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-mono"
                  />
                </div>
              </div>

              {/* Position selector 3x2 grid */}
              <div className="mt-6 space-y-3">
                <label className="block text-sm font-semibold text-slate-900 dark:text-white">
                  Position on Page
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {POSITIONS.map((pos) => {
                    const isSelected = position === pos.id;
                    return (
                      <button
                        key={pos.id}
                        type="button"
                        onClick={() => setPosition(pos.id)}
                        className={`p-3 text-xs rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-[var(--primary)] bg-blue-50/50 dark:bg-blue-950/30 text-[var(--primary)] font-bold shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed options: startFrom, fontSize, margin, color */}
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="startFrom" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Start From
                  </label>
                  <input
                    id="startFrom"
                    type="number"
                    min={1}
                    value={startFrom}
                    onChange={(e) => setStartFrom(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label htmlFor="fontSize" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Font Size (pt)
                  </label>
                  <input
                    id="fontSize"
                    type="number"
                    min={6}
                    max={72}
                    value={fontSize}
                    onChange={(e) => setFontSize(Math.max(6, parseInt(e.target.value) || 12))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label htmlFor="margin" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Margin (pt)
                  </label>
                  <input
                    id="margin"
                    type="number"
                    min={0}
                    max={150}
                    value={margin}
                    onChange={(e) => setMargin(Math.max(0, parseInt(e.target.value) || 30))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label htmlFor="colorHex" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="colorHex"
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-8 h-9 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {isProcessing && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Numbering pages...</span>
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
          </div>

          {/* Interactive Preview & Action Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[var(--primary)]" />
                Live Placement Preview
              </h3>

              {/* Simulated Page Box */}
              <div className="aspect-[3/4] max-w-[200px] mx-auto bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl relative p-3 shadow-inner flex flex-col justify-between">
                {/* Top slots */}
                <div className="flex justify-between items-start text-[10px] font-mono leading-none">
                  <span className={`transition-all ${position === 'top-left' ? 'text-[var(--primary)] font-bold scale-110' : 'text-slate-300 dark:text-slate-700'}`}>
                    {position === 'top-left' ? format.replace('{n}', `${startFrom}`).replace('{total}', `${loadedPdf.pageCount + startFrom - 1}`) : '•'}
                  </span>
                  <span className={`transition-all ${position === 'top-center' ? 'text-[var(--primary)] font-bold scale-110' : 'text-slate-300 dark:text-slate-700'}`}>
                    {position === 'top-center' ? format.replace('{n}', `${startFrom}`).replace('{total}', `${loadedPdf.pageCount + startFrom - 1}`) : '•'}
                  </span>
                  <span className={`transition-all ${position === 'top-right' ? 'text-[var(--primary)] font-bold scale-110' : 'text-slate-300 dark:text-slate-700'}`}>
                    {position === 'top-right' ? format.replace('{n}', `${startFrom}`).replace('{total}', `${loadedPdf.pageCount + startFrom - 1}`) : '•'}
                  </span>
                </div>

                {/* Simulated document lines */}
                <div className="space-y-2 opacity-20 px-2">
                  <div className="h-1.5 bg-slate-400 rounded-full w-3/4 mx-auto" />
                  <div className="h-1.5 bg-slate-400 rounded-full w-full" />
                  <div className="h-1.5 bg-slate-400 rounded-full w-5/6" />
                  <div className="h-1.5 bg-slate-400 rounded-full w-2/3" />
                </div>

                {/* Bottom slots */}
                <div className="flex justify-between items-end text-[10px] font-mono leading-none">
                  <span className={`transition-all ${position === 'bottom-left' ? 'text-[var(--primary)] font-bold scale-110' : 'text-slate-300 dark:text-slate-700'}`}>
                    {position === 'bottom-left' ? format.replace('{n}', `${startFrom}`).replace('{total}', `${loadedPdf.pageCount + startFrom - 1}`) : '•'}
                  </span>
                  <span className={`transition-all ${position === 'bottom-center' ? 'text-[var(--primary)] font-bold scale-110' : 'text-slate-300 dark:text-slate-700'}`}>
                    {position === 'bottom-center' ? format.replace('{n}', `${startFrom}`).replace('{total}', `${loadedPdf.pageCount + startFrom - 1}`) : '•'}
                  </span>
                  <span className={`transition-all ${position === 'bottom-right' ? 'text-[var(--primary)] font-bold scale-110' : 'text-slate-300 dark:text-slate-700'}`}>
                    {position === 'bottom-right' ? format.replace('{n}', `${startFrom}`).replace('{total}', `${loadedPdf.pageCount + startFrom - 1}`) : '•'}
                  </span>
                </div>
              </div>

              {/* Output File Name */}
              <div className="mt-6">
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

              {/* Action Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isProcessing}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-semibold shadow-sm transition-all text-sm"
                >
                  {isProcessing ? 'Numbering Pages...' : `Add Page Numbers (${loadedPdf.pageCount} Pages)`}
                </button>
              </div>
            </div>
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
              This will discard the currently loaded document and any numbering settings.
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
