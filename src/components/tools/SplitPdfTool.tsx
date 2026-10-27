import { useState, useRef, useCallback } from 'react';
import {
  Scissors,
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Square,
  FileArchive
} from 'lucide-react';
import { Tabs, Progress, AlertDialog } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useSplitPdf } from '../../hooks/pdf/useSplitPdf';
import { useMobileResultScroll } from '../../hooks/useMobileResultScroll';
import { formatBytes, blobToUint8Array, validatePageRange, readPdfPageCount } from '../../core/shared';
import type { SplitMode } from '../../core/pdf/split/splitPdf.types';

interface LoadedPdfState {
  file: File;
  buffer: Uint8Array;
  pageCount: number;
}

export function SplitPdfTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdfState | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [mode, setMode] = useState<SplitMode>('single');
  const [customFileName, setCustomFileName] = useState('pdf-com-in-split');
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
  } = useSplitPdf();
  const resultRef = useMobileResultScroll(isSuccess && Boolean(result));

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      const pageCount = await readPdfPageCount(buffer);

      setLoadedPdf({ file, buffer, pageCount });
      // Default: select all pages
      const all = new Set<number>();
      for (let i = 1; i <= pageCount; i++) all.add(i);
      setSelectedPages(all);
      setRangeInput(`1-${pageCount}`);
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-split');
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

  const togglePage = (pageNum: number) => {
    const next = new Set(selectedPages);
    if (next.has(pageNum)) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    setSelectedPages(next);
    setRangeInput(Array.from(next).sort((a, b) => a - b).join(', '));
  };

  const selectAll = () => {
    if (!loadedPdf) return;
    const all = new Set<number>();
    for (let i = 1; i <= loadedPdf.pageCount; i++) all.add(i);
    setSelectedPages(all);
    setRangeInput(`1-${loadedPdf.pageCount}`);
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
    setRangeInput('');
  };

  const handleRangeInputChange = (text: string) => {
    setRangeInput(text);
    if (!loadedPdf) return;
    try {
      const parsed = validatePageRange(text, loadedPdf.pageCount);
      setSelectedPages(new Set(parsed));
    } catch {
      // Invalid partial input while typing; retain typed string
    }
  };

  const handleSplit = async () => {
    if (!loadedPdf || selectedPages.size === 0) return;
    await execute({
      buffer: loadedPdf.buffer,
      selectedPages: Array.from(selectedPages),
      mode,
      fileName: customFileName
    });
  };

  const handleStartOver = () => {
    reset();
    setLoadedPdf(null);
    setSelectedPages(new Set());
    setRangeInput('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <ToolPageHeader toolId="split" />

      {/* SUCCESS STATE */}
      {isSuccess && result && objectUrl && (
        <div ref={resultRef} className="p-8 rounded-3xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">
            {result.mode === 'single' ? 'Pages Extracted Successfully!' : 'Pages Separated into ZIP!'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            {result.mode === 'single'
              ? `Extracted ${result.pageCount} page(s) into a new document (${formatBytes(result.byteLength)}).`
              : `Created ${result.files.length} individual PDFs inside archive (${formatBytes(result.byteLength)}).`}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-8">
            <a
              href={objectUrl}
              download={result.mode === 'single' ? `${customFileName || 'split'}.pdf` : `${customFileName || 'split'}.zip`}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm shadow-md shadow-accent/20 hover:bg-accent/90 active:scale-98 transition-all"
            >
              {result.mode === 'single' ? <Download className="w-4 h-4" /> : <FileArchive className="w-4 h-4" />}
              {result.mode === 'single' ? 'Download Extracted PDF' : 'Download ZIP Archive'}
            </a>
            {result.mode === 'single' && (
              <a
                href={objectUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Preview
              </a>
            )}
          </div>

          <button
            onClick={handleStartOver}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Split Another Document
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {isError && error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-900/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">Split Error</h4>
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
              description="Extract specific pages or separate all pages. 100% private in-browser processing."
              isDragOver={isDragOver}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className="p-8 sm:p-14 rounded-3xl"
            />
          ) : (
            <div className="p-6 rounded-3xl bg-white border border-gray-200/90 dark:bg-gray-900 dark:border-gray-800 shadow-xs space-y-6">
              {/* Document Overview Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800/80">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {loadedPdf.file.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {loadedPdf.pageCount} Pages • {formatBytes(loadedPdf.file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConfirmClearOpen(true)}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  Change File
                </button>
              </div>

              {/* Extraction Mode Tabs (Base UI Tabs) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Output Format
                </label>
                <Tabs.Root
                  value={mode}
                  onValueChange={(val) => setMode(val as SplitMode)}
                  className="w-full"
                >
                  <Tabs.List className="inline-flex w-full sm:w-auto p-1 rounded-xl bg-gray-100 dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
                    <Tabs.Tab
                      value="single"
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 data-[state=active]:shadow-xs transition-all cursor-pointer"
                    >
                      Single PDF (Combined)
                    </Tabs.Tab>
                    <Tabs.Tab
                      value="individual"
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 data-[state=active]:shadow-xs transition-all cursor-pointer"
                    >
                      Separate Pages (ZIP)
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.Root>
              </div>

              {/* Page Selection Controls */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Page Selection ({selectedPages.size} of {loadedPdf.pageCount} selected)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs font-bold text-gray-900 dark:text-gray-100 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300 dark:text-gray-700">•</span>
                    <button
                      onClick={clearSelection}
                      className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Range input */}
                <input
                  type="text"
                  value={rangeInput}
                  onChange={(e) => handleRangeInputChange(e.target.value)}
                  placeholder="e.g. 1-3, 5, 8-10"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:border-accent mb-3"
                />

                {/* Visual Page Chips */}
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                  {Array.from({ length: loadedPdf.pageCount }, (_, i) => i + 1).map((pageNum) => {
                    const isSelected = selectedPages.has(pageNum);
                    return (
                      <button
                        key={pageNum}
                        onClick={() => togglePage(pageNum)}
                        className={`
                          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none
                          ${isSelected
                            ? 'bg-accent text-accent-foreground shadow-xs'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
                        `}
                      >
                        {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        <span>Page {pageNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filename & Progress */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 max-w-sm">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Output Filename
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={customFileName}
                      onChange={(e) => setCustomFileName(e.target.value)}
                      placeholder="pdf-com-in-split"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:border-accent"
                    />
                    <span className="ml-2 text-xs text-gray-400 font-bold">
                      {mode === 'single' ? '.pdf' : '.zip'}
                    </span>
                  </div>
                </div>

                {isProcessing && (
                  <div className="flex-1 max-w-xs space-y-1">
                    <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                      <span>Extracting Pages...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress.Root value={progress} className="w-full">
                      <Progress.Track className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <Progress.Indicator
                          style={{ width: `${progress}%` }}
                          className="h-full bg-accent transition-all duration-200 rounded-full"
                        />
                      </Progress.Track>
                    </Progress.Root>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={handleSplit}
                disabled={selectedPages.size === 0 || isProcessing}
                className="w-full py-3.5 rounded-2xl bg-accent text-accent-foreground font-bold text-sm shadow-md shadow-accent/20 hover:bg-accent/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting {selectedPages.size} Page(s)...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>
                      Extract {selectedPages.size} Page(s) {mode === 'single' ? 'into PDF' : 'into ZIP'}
                    </span>
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
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 -trangray-x-1/2 -trangray-y-1/2 w-full max-w-sm p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 focus:outline-none">
            <AlertDialog.Title className="text-base font-bold text-gray-900 dark:text-white mb-2">
              Change document?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              This will discard your current document and page selection.
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Close className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                Cancel
              </AlertDialog.Close>
              <button
                onClick={() => {
                  setLoadedPdf(null);
                  setSelectedPages(new Set());
                  setRangeInput('');
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
