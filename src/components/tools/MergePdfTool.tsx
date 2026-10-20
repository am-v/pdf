import { useState, useRef, useCallback } from 'react';
import {
  Layers,
  Upload,
  RotateCw,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { Progress, Tooltip, AlertDialog } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useMergePdfs } from '../../hooks/pdf/useMergePdfs';
import { formatBytes, blobToUint8Array } from '../../core/shared';

interface SelectedFileItem {
  id: string;
  file: File;
  buffer: Uint8Array;
  rotation: number;
}

export function MergePdfTool() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFileItem[]>([]);
  const [customFileName, setCustomFileName] = useState('pdf-com-in-merged');
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
  } = useMergePdfs();

  // Handle incoming raw files
  const handleFilesAdded = useCallback(async (files: FileList | File[]) => {
    const pdfFiles = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) return;

    const newItems: SelectedFileItem[] = [];
    for (const file of pdfFiles) {
      try {
        const buffer = await blobToUint8Array(file);
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          buffer,
          rotation: 0
        });
      } catch {
        // Skip unreadable files
      }
    }

    setSelectedFiles((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const rotateFile = (id: string) => {
    setSelectedFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    setSelectedFiles((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) return;
    const inputs = selectedFiles.map((item) => ({
      buffer: item.buffer,
      rotation: item.rotation,
      name: item.file.name
    }));
    await execute(inputs);
  };

  const handleStartOver = () => {
    reset();
    setSelectedFiles([]);
  };

  const totalInputSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <ToolPageHeader toolId="merge" />

      {/* SUCCESS STATE */}
      {isSuccess && result && objectUrl && (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">
            PDFs Merged Successfully!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Merged {result.documentCount} documents into {result.pageCount} total pages ({formatBytes(result.byteLength)}).
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-8">
            <a
              href={objectUrl}
              download={`${customFileName || 'merged'}.pdf`}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-98 transition-all"
            >
              <Download className="w-4 h-4" />
              Download Merged PDF
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
            Merge More Files
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {isError && error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-900/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">Merge Error</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300">{error.userMessage}</p>
          </div>
        </div>
      )}

      {/* MAIN WORKFLOW (When not in success state) */}
      {!isSuccess && (
        <div className="space-y-6">
          {/* File Dropzone */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
            multiple
            accept="application/pdf,.pdf"
            className="hidden"
          />

          <ToolFileDropzone
            icon={Upload}
            title="Select or Drop PDF Files Here"
            description="Select at least 2 PDF documents to combine into a single file. Processed 100% locally in your browser."
            isDragOver={isDragOver}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative p-8 sm:p-12 rounded-3xl"
          />

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 dark:bg-slate-900 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {selectedFiles.length} Documents Selected
                  </span>
                  <span className="text-xs text-slate-400">({formatBytes(totalInputSize)})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-primary hover:bg-primary-light rounded-lg transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add More
                  </button>
                  <button
                    onClick={() => setConfirmClearOpen(true)}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {selectedFiles.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-primary shrink-0 shadow-xs">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.file.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{formatBytes(item.file.size)}</span>
                          {item.rotation !== 0 && (
                            <span className="px-1.5 py-0.2 rounded font-semibold bg-primary-light text-primary">
                              {item.rotation}° rotation
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* File Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip.Provider delay={200}>
                        <Tooltip.Root>
                          <Tooltip.Trigger
                            onClick={() => rotateFile(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
                            aria-label="Rotate 90 degrees"
                          >
                            <RotateCw className="w-4 h-4" />
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Positioner side="top" sideOffset={4} className="z-50">
                              <Tooltip.Popup className="px-2 py-0.5 text-[10px] font-medium text-white bg-slate-900 dark:bg-slate-800 rounded shadow-md">
                                Rotate 90°
                              </Tooltip.Popup>
                            </Tooltip.Positioner>
                          </Tooltip.Portal>
                        </Tooltip.Root>

                        <Tooltip.Root>
                          <Tooltip.Trigger
                            onClick={() => moveFile(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                            aria-label="Move Up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Positioner side="top" sideOffset={4} className="z-50">
                              <Tooltip.Popup className="px-2 py-0.5 text-[10px] font-medium text-white bg-slate-900 dark:bg-slate-800 rounded shadow-md">
                                Move Up
                              </Tooltip.Popup>
                            </Tooltip.Positioner>
                          </Tooltip.Portal>
                        </Tooltip.Root>

                        <Tooltip.Root>
                          <Tooltip.Trigger
                            onClick={() => moveFile(index, 'down')}
                            disabled={index === selectedFiles.length - 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                            aria-label="Move Down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Positioner side="top" sideOffset={4} className="z-50">
                              <Tooltip.Popup className="px-2 py-0.5 text-[10px] font-medium text-white bg-slate-900 dark:bg-slate-800 rounded shadow-md">
                                Move Down
                              </Tooltip.Popup>
                            </Tooltip.Positioner>
                          </Tooltip.Portal>
                        </Tooltip.Root>

                        <Tooltip.Root>
                          <Tooltip.Trigger
                            onClick={() => removeFile(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            aria-label="Remove File"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Tooltip.Trigger>
                          <Tooltip.Portal>
                            <Tooltip.Positioner side="top" sideOffset={4} className="z-50">
                              <Tooltip.Popup className="px-2 py-0.5 text-[10px] font-medium text-white bg-slate-900 dark:bg-slate-800 rounded shadow-md">
                                Remove File
                              </Tooltip.Popup>
                            </Tooltip.Positioner>
                          </Tooltip.Portal>
                        </Tooltip.Root>
                      </Tooltip.Provider>
                    </div>
                  </div>
                ))}
              </div>

              {/* Output File Name Setting */}
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
                      placeholder="pdf-com-in-merged"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                    />
                    <span className="ml-2 text-xs text-slate-400 font-bold">.pdf</span>
                  </div>
                </div>

                {/* Progress bar during processing */}
                {isProcessing && (
                  <div className="flex-1 max-w-xs space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Merging Documents...</span>
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
                onClick={handleMerge}
                disabled={selectedFiles.length < 2 || isProcessing}
                className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary-hover active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing {selectedFiles.length} Documents...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    <span>Merge {selectedFiles.length} PDF Files</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Clear Confirmation Alert Dialog */}
      <AlertDialog.Root open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 animate-in fade-in-0 duration-150" />
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 focus:outline-none">
            <AlertDialog.Title className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Clear all files?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              This will remove all {selectedFiles.length} selected documents and rotations from this session.
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Close className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                Cancel
              </AlertDialog.Close>
              <button
                onClick={() => {
                  setSelectedFiles([]);
                  setConfirmClearOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
              >
                Clear Files
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}
