import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  Eye
} from 'lucide-react';
import { Progress, AlertDialog } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useWatermark } from '../../hooks/pdf/useWatermark';
import { useMobileResultScroll } from '../../hooks/useMobileResultScroll';
import { formatBytes, blobToUint8Array, readPdfPageCount } from '../../core/shared';

interface LoadedPdfState {
  file: File;
  buffer: Uint8Array;
  pageCount: number;
}

const PRESET_TEXTS = ['CONFIDENTIAL', 'DRAFT', 'SAMPLE', 'TOP SECRET', 'DO NOT COPY'];
const PRESET_ANGLES = [
  { label: 'Diagonal (45°)', value: 45 },
  { label: 'Horizontal (0°)', value: 0 },
  { label: 'Reverse (-45°)', value: -45 },
  { label: 'Vertical (90°)', value: 90 }
];

export function WatermarkTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdfState | null>(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.25);
  const [fontSize, setFontSize] = useState(48);
  const [rotation, setRotation] = useState(45);
  const [colorHex, setColorHex] = useState('#dc2626');
  const [customFileName, setCustomFileName] = useState('pdf-com-in-watermarked');
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
  } = useWatermark();
  const resultRef = useMobileResultScroll(isSuccess && Boolean(result));

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      const pageCount = await readPdfPageCount(buffer);

      setLoadedPdf({ file, buffer, pageCount });
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-watermarked');
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
    if (!loadedPdf || !text.trim()) return;
    await execute({
      buffer: loadedPdf.buffer,
      text: text.trim(),
      opacity,
      fontSize,
      rotation,
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
        toolId="watermark"
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
                  Watermark Applied Successfully!
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Watermarked <span className="font-semibold text-gray-900 dark:text-white">{result.watermarkedPageCount} pages</span> in document ({formatBytes(result.byteLength)}).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <a
                href={objectUrl}
                download={`${customFileName || 'watermarked'}.pdf`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:opacity-90 text-accent-foreground rounded-xl font-semibold shadow-sm transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
              <a
                href={objectUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors text-sm"
                title="Preview in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors text-sm"
                title="Adjust settings"
              >
                <RefreshCw className="w-4 h-4" />
                Modify Watermark
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
          description="Private and secure. Entirely rendered in your browser."
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
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-gray-900 dark:text-gray-100">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                    {loadedPdf.file.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatBytes(loadedPdf.file.size)} • {loadedPdf.pageCount} pages
                  </p>
                </div>
              </div>

              {/* Text Input & Presets */}
              <div className="mt-6 space-y-3">
                <label htmlFor="watermarkText" className="block text-sm font-semibold text-gray-900 dark:text-white">
                  Watermark Text
                </label>
                <input
                  id="watermarkText"
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter watermark text..."
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_TEXTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setText(preset)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${text === preset
                          ? 'border-accent bg-blue-50/50 dark:bg-blue-950/30 text-gray-900 dark:text-gray-100 font-bold'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Angle presets & Slider */}
              <div className="mt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <label htmlFor="rotationRange" className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <RotateCw className="w-4 h-4 text-gray-400" />
                    Angle of Rotation
                  </label>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400 font-semibold">{rotation}°</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_ANGLES.map((angle) => (
                    <button
                      key={angle.value}
                      type="button"
                      onClick={() => setRotation(angle.value)}
                      className={`px-3 py-2 text-xs rounded-xl border text-center transition-all ${rotation === angle.value
                          ? 'border-accent bg-blue-50/50 dark:bg-blue-950/30 text-gray-900 dark:text-gray-100 font-bold'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      {angle.label}
                    </button>
                  ))}
                </div>

                <input
                  id="rotationRange"
                  type="range"
                  min={-90}
                  max={90}
                  step={5}
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value) || 0)}
                  className="w-full accent-accent cursor-pointer"
                />
              </div>

              {/* Opacity & Font Size & Color */}
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="opacityRange" className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Transparency
                    </label>
                    <span className="text-xs font-mono text-gray-500 font-semibold">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    id="opacityRange"
                    type="range"
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                    className="w-full accent-accent cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="fontSizeRange" className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Font Size
                    </label>
                    <span className="text-xs font-mono text-gray-500 font-semibold">{fontSize} pt</span>
                  </div>
                  <input
                    id="fontSizeRange"
                    type="range"
                    min={16}
                    max={100}
                    step={2}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value) || 48)}
                    className="w-full accent-accent cursor-pointer"
                  />
                </div>

                <div>
                  <label htmlFor="colorHexInput" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Watermark Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="colorHexInput"
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-8 h-9 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 font-mono text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              {isProcessing && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Applying watermark...</span>
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
            </div>
          </div>

          {/* Interactive Live Preview Box & Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 rounded bg-accent p-0.5 text-accent-foreground" />
                Real-Time Visual Preview
              </h3>

              {/* Simulated Sheet of Paper */}
              <div className="aspect-[3/4] max-w-[220px] mx-auto bg-white dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800 rounded-xl relative overflow-hidden shadow-inner flex flex-col justify-between p-4 select-none">
                {/* Simulated document lines in background */}
                <div className="space-y-2 opacity-25">
                  <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full w-2/3" />
                  <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full w-full" />
                  <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full w-5/6" />
                  <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full w-4/5" />
                  <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full w-full" />
                  <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full w-3/4" />
                </div>

                {/* Live Watermark Overlay (Centered and Rotated) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-2 overflow-hidden">
                  <span
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      opacity: opacity,
                      color: colorHex,
                      fontSize: `${Math.max(12, Math.min(32, fontSize * 0.4))}px`,
                      fontWeight: 800,
                      letterSpacing: '0.05em',
                      lineHeight: 1.1
                    }}
                    className="text-center transition-transform duration-150 select-none whitespace-normal break-words max-w-[90%]"
                  >
                    {text || 'WATERMARK'}
                  </span>
                </div>

                <div className="space-y-2 opacity-25">
                  <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full w-full" />
                  <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full w-4/5" />
                  <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded-full w-1/2" />
                </div>
              </div>

              {/* Output File Name */}
              <div className="mt-6">
                <label htmlFor="customFileNameInput" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Output Filename
                </label>
                <div className="flex items-center">
                  <input
                    id="customFileNameInput"
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

              {/* Action Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isProcessing || !text.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:opacity-90 disabled:opacity-50 text-accent-foreground rounded-xl font-semibold shadow-sm transition-all text-sm"
                >
                  {isProcessing ? 'Applying Watermark...' : `Apply Watermark (${loadedPdf.pageCount} Pages)`}
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
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 -trangray-x-1/2 -trangray-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl z-50">
            <AlertDialog.Title className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Clear Current Document?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will discard the currently loaded document and any watermark settings.
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
