import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  ImageIcon,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Plus
} from 'lucide-react';
import { Progress } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useImageToPdf } from '../../hooks/pdf/useImageToPdf';
import type { ImageToPdfPageSize, ImageToPdfOrientation } from '../../core/pdf/image-to-pdf/imageToPdf.types';
import { formatBytes, blobToUint8Array } from '../../core/shared';

interface ImageFileItem {
  id: string;
  file: File;
  buffer: Uint8Array;
  previewUrl: string;
  name: string;
  size: number;
}

export function ImageToPdfTool() {
  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [pageSize, setPageSize] = useState<ImageToPdfPageSize>('fit-image');
  const [orientation, setOrientation] = useState<ImageToPdfOrientation>('auto');
  const [margin, setMargin] = useState<number>(0);
  const [customFileName, setCustomFileName] = useState('images-converted');
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
  } = useImageToPdf();

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lower = file.name.toLowerCase();
      if (
        file.type === 'image/jpeg' ||
        file.type === 'image/png' ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png')
      ) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    const newItems: ImageFileItem[] = [];
    for (const f of validFiles) {
      try {
        const buffer = await blobToUint8Array(f);
        const previewUrl = URL.createObjectURL(f);
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          file: f,
          buffer,
          previewUrl,
          name: f.name,
          size: f.size
        });
      } catch {
        // Skip unreadable files
      }
    }

    setImages((prev) => [...prev, ...newItems]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const target = prev[index];
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    setImages((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    reset();
  };

  const handleConvert = async () => {
    if (images.length === 0) return;

    await execute({
      images: images.map((img) => ({
        buffer: img.buffer,
        fileName: img.name,
        mimeType: img.file.type
      })),
      pageSize,
      orientation,
      margin
    });
  };

  const downloadName = `${customFileName.trim() || 'images-converted'}.pdf`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ToolPageHeader toolId="image-to-pdf" />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Image Selection & Sequence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Dropzone */}
          <ToolFileDropzone
            icon={Upload}
            title="Click to upload or drag & drop images"
            description="Supports JPEG and PNG formats. Add multiple images to merge into one PDF."
            isDragOver={isDragOver}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="p-8"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              accept="image/jpeg,image/png"
              multiple
              className="hidden"
            />
          </ToolFileDropzone>

          {/* Image List */}
          {images.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Selected Images ({images.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-300 shrink-0">
                        {idx + 1}
                      </span>
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="w-12 h-12 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                          {img.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {formatBytes(img.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, 'down')}
                        disabled={idx === images.length - 1}
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-primary text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add More Images
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Settings & Actions */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <Sliders className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Page Settings
              </h2>
            </div>

            {/* Page Size */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Page Sizing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'fit-image', label: 'Fit Image' },
                    { id: 'a4', label: 'A4' },
                    { id: 'letter', label: 'Letter' }
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPageSize(opt.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      pageSize === opt.id
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {pageSize === 'fit-image'
                  ? 'Each page automatically matches the original dimensions of each image.'
                  : `Formats images onto standard ${pageSize.toUpperCase()} document pages.`}
              </p>
            </div>

            {/* Orientation (only for A4 / Letter) */}
            {pageSize !== 'fit-image' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Orientation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'auto', label: 'Auto' },
                      { id: 'portrait', label: 'Portrait' },
                      { id: 'landscape', label: 'Landscape' }
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOrientation(opt.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                        orientation === opt.id
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Margins */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Page Margins
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 0, label: 'None' },
                  { value: 20, label: 'Normal' },
                  { value: 40, label: 'Large' }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMargin(opt.value)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                      margin === opt.value
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* File Name */}
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
                  placeholder="images-converted"
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
                  <span>Converting images to PDF...</span>
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

            {/* Error Message */}
            {isError && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 dark:text-rose-300">
                  <p className="font-semibold">{error?.name || 'Error'}</p>
                  <p className="mt-1">{error?.message || 'Failed to convert images.'}</p>
                </div>
              </div>
            )}

            {/* Success State */}
            {isSuccess && result && objectUrl && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold text-sm">PDF Ready!</span>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Created a {result.pageCount}-page PDF document ({formatBytes(result.byteLength)}).
                </p>
                <div className="flex gap-2">
                  <a
                    href={objectUrl}
                    download={downloadName}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
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
            )}

            {/* Convert Button */}
            {!isSuccess && (
              <button
                type="button"
                onClick={handleConvert}
                disabled={images.length === 0 || isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-sm transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Converting {images.length} Image{images.length > 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Convert to PDF ({images.length})
                  </>
                )}
              </button>
            )}

            {isSuccess && (
              <button
                type="button"
                onClick={reset}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs transition-colors"
              >
                Convert Another Batch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
