import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  PenTool,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Image as ImageIcon,
  Check,
  X
} from 'lucide-react';
import { Progress, AlertDialog, Tabs } from '@base-ui/react';
import { ToolPageHeader } from '../common/ToolPageHeader';
import { ToolFileDropzone } from '../common/ToolFileDropzone';
import { useSignature } from '../../hooks/pdf/useSignature';
import { trimSignatureBlob } from '../../core/pdf/signature/trimSignature';
import { formatBytes, blobToUint8Array, readPdfPageCount } from '../../core/shared';

interface LoadedPdfState {
  file: File;
  buffer: Uint8Array;
  pageCount: number;
}

interface UiPlacement {
  id: string;
  page: number; // 1-indexed
  x: number; // 0 to 100%
  y: number; // 0 to 100%
  size: number; // width %
  dataUrl: string;
  imageBuffer: Uint8Array;
}

export function SignatureTool() {
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdfState | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureBuffer, setSignatureBuffer] = useState<Uint8Array | null>(null);
  const [placements, setPlacements] = useState<UiPlacement[]>([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [penColor, setPenColor] = useState('#000000');
  const [customFileName, setCustomFileName] = useState('pdf-com-in-signed');
  const [isDragOver, setIsDragOver] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ id: string; mode: 'move' | 'resize'; startX: number; startY: number } | null>(null);

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
  } = useSignature();

  const handlePdfFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return;
    }
    try {
      const buffer = await blobToUint8Array(file);
      const pageCount = await readPdfPageCount(buffer);

      setLoadedPdf({ file, buffer, pageCount });
      setActivePage(1);
      setPlacements([]);
      setSelectedPlacementId(null);
      setCustomFileName(file.name.replace(/\.[^/.]+$/, '') + '-signed');
    } catch {
      // Handled in UI
    }
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handlePdfFile(e.dataTransfer.files[0]);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastPointRef.current = { x: clientX - rect.left, y: clientY - rect.top };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentPoint = { x: clientX - rect.left, y: clientY - rect.top };

    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const trimmed = await trimSignatureBlob(blob);
      const buffer = await blobToUint8Array(trimmed);
      const reader = new FileReader();
      reader.onload = () => {
        setSignatureDataUrl(reader.result as string);
        setSignatureBuffer(buffer);
        setSignatureModalOpen(false);
      };
      reader.readAsDataURL(trimmed);
    }, 'image/png');
  };

  const handleSignatureUpload = async (file: File) => {
    const trimmed = await trimSignatureBlob(file);
    const buffer = await blobToUint8Array(trimmed);
    const reader = new FileReader();
    reader.onload = () => {
      setSignatureDataUrl(reader.result as string);
      setSignatureBuffer(buffer);
      setSignatureModalOpen(false);
    };
    reader.readAsDataURL(trimmed);
  };

  // Stamp signature at click position on preview
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!signatureDataUrl || !signatureBuffer || dragRef.current) return;
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));

    const newPlacement: UiPlacement = {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      page: activePage,
      x,
      y,
      size: 25,
      dataUrl: signatureDataUrl,
      imageBuffer: signatureBuffer
    };

    setPlacements((prev) => [...prev, newPlacement]);
    setSelectedPlacementId(newPlacement.id);
  };

  const removePlacement = (id: string) => {
    setPlacements((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlacementId === id) setSelectedPlacementId(null);
  };

  // Dragging placement on preview
  const onPlacementMouseDown = (e: React.MouseEvent, id: string, mode: 'move' | 'resize') => {
    e.stopPropagation();
    setSelectedPlacementId(id);
    dragRef.current = { id, mode, startX: e.clientX, startY: e.clientY };
  };

  const onPreviewMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current || !previewRef.current) return;
    const { id, mode } = dragRef.current;
    const rect = previewRef.current.getBoundingClientRect();

    setPlacements((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (mode === 'move') {
          const newX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
          const newY = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
          return { ...p, x: newX, y: newY };
        } else {
          // Resize mode: change width %
          const currentLeftPx = (p.x / 100) * rect.width;
          const deltaX = e.clientX - rect.left - currentLeftPx;
          const newSize = Math.max(10, Math.min(80, (deltaX / rect.width) * 200));
          return { ...p, size: newSize };
        }
      })
    );
  };

  const onPreviewMouseUp = () => {
    dragRef.current = null;
  };

  const handleExecute = async () => {
    if (!loadedPdf || placements.length === 0) return;
    await execute({
      buffer: loadedPdf.buffer,
      placements: placements.map((p) => ({
        id: p.id,
        page: p.page,
        x: p.x,
        y: p.y,
        size: p.size,
        imageBuffer: p.imageBuffer
      })),
      fileName: loadedPdf.file.name
    });
  };

  const clearAll = () => {
    reset();
    setLoadedPdf(null);
    setPlacements([]);
    setSelectedPlacementId(null);
    setConfirmClearOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ToolPageHeader
        toolId="signature"
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
                  PDF Signed Successfully!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Applied <span className="font-semibold text-slate-900 dark:text-white">{result.placedSignatureCount} signatures</span> across {result.pageCount} pages ({formatBytes(result.byteLength)}).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <a
                href={objectUrl}
                download={`${customFileName || 'signed'}.pdf`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl font-semibold shadow-sm transition-all text-sm"
              >
                <Download className="w-4 h-4" />
                Download Signed PDF
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
                title="Adjust placements"
              >
                <RefreshCw className="w-4 h-4" />
                Sign Again
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

      {/* Dropzone or Editor */}
      {!loadedPdf ? (
        <ToolFileDropzone
          icon={Upload}
          title="Drop your PDF file here to sign"
          description="Processed 100% locally on your computer. Your signatures never leave your device."
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
                handlePdfFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />
        </ToolFileDropzone>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Signing Workspace */}
          <div className="lg:col-span-2 space-y-4">
            {/* Top Workspace Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-[var(--primary)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-xs sm:max-w-md">
                    {loadedPdf.file.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Page {activePage} of {loadedPdf.pageCount} • {placements.length} signatures placed
                  </p>
                </div>
              </div>

              {/* Page Navigator */}
              {loadedPdf.pageCount > 1 && (
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                    disabled={activePage <= 1}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
                    {activePage} / {loadedPdf.pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivePage((p) => Math.min(loadedPdf.pageCount, p + 1))}
                    disabled={activePage >= loadedPdf.pageCount}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Interactive PDF Sheet Preview */}
            <div
              ref={previewRef}
              onClick={handlePreviewClick}
              onMouseMove={onPreviewMouseMove}
              onMouseUp={onPreviewMouseUp}
              className="bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl relative min-h-[480px] sm:min-h-[580px] p-6 shadow-sm overflow-hidden select-none cursor-crosshair flex flex-col justify-between"
            >
              {/* Watermark/guideline */}
              <div className="space-y-4 opacity-15 pointer-events-none">
                <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded-full w-1/3" />
                <div className="h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full w-full" />
                <div className="h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full w-5/6" />
                <div className="h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full w-4/5" />
                <div className="h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full w-full" />
                <div className="h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full w-3/4" />
              </div>

              {!signatureDataUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-2xl text-[var(--primary)] mb-3">
                    <PenTool className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                    Create or select a signature first
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Click "Create Signature" in the sidebar to draw or upload your signature, then tap anywhere on this sheet.
                  </p>
                </div>
              )}

              {/* Placed Signatures on this Page */}
              {placements
                .filter((p) => p.page === activePage)
                .map((p) => {
                  const isSelected = selectedPlacementId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlacementId(p.id);
                      }}
                      onMouseDown={(e) => onPlacementMouseDown(e, p.id, 'move')}
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.size}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                      className={`absolute cursor-move group/sig touch-none ${
                        isSelected
                          ? 'ring-2 ring-[var(--primary)] rounded-md'
                          : 'ring-1 ring-slate-400/40 hover:ring-slate-400 rounded-md'
                      }`}
                    >
                      <img
                        src={p.dataUrl}
                        alt="Signature placement"
                        className="w-full h-auto pointer-events-none drop-shadow-xs"
                      />

                      {/* Controls when selected */}
                      {isSelected && (
                        <>
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePlacement(p.id);
                            }}
                            className="absolute -top-3 -right-3 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-700 transition-colors"
                            title="Remove signature"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          {/* Resize handle */}
                          <div
                            onMouseDown={(e) => onPlacementMouseDown(e, p.id, 'resize')}
                            className="absolute -bottom-2 -right-2 w-5 h-5 bg-[var(--primary)] border-2 border-white dark:border-slate-900 rounded-full cursor-nwse-resize shadow-md"
                            title="Drag to resize"
                          />
                        </>
                      )}
                    </div>
                  );
                })}

              <div className="space-y-4 opacity-15 pointer-events-none">
                <div className="h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full w-full" />
                <div className="h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full w-3/4" />
                <div className="h-2.5 bg-slate-300 dark:bg-slate-700 rounded-full w-1/2" />
              </div>
            </div>

            {/* Instruction footnote */}
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              💡 Tip: Click anywhere on the page to stamp your signature. Drag to reposition, use the blue corner handle to resize.
            </p>
          </div>

          {/* Sidebar Controls */}
          <div className="space-y-6">
            {/* Signature Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-4">
                Active Signature
              </h3>

              {signatureDataUrl ? (
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center min-h-[90px]">
                    <img
                      src={signatureDataUrl}
                      alt="Active signature"
                      className="max-h-16 max-w-full object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSignatureModalOpen(true)}
                      className="flex-1 px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                    >
                      Change Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSignatureDataUrl(null);
                        setSignatureBuffer(null);
                      }}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                      title="Clear active signature"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSignatureModalOpen(true)}
                  className="w-full p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[var(--primary)] rounded-xl flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-[var(--primary)] transition-colors"
                >
                  <PenTool className="w-6 h-6" />
                  <span className="text-xs font-semibold">Draw or Upload Signature</span>
                </button>
              )}

              {/* Placements Counter */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Stamps on page {activePage}:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {placements.filter((p) => p.page === activePage).length}
                </span>
              </div>
            </div>

            {/* Save & Download Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <label htmlFor="customFileName" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Output Filename
              </label>
              <div className="flex items-center mb-6">
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

              {/* Progress */}
              {isProcessing && (
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Signing document...</span>
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

              <button
                type="button"
                onClick={handleExecute}
                disabled={isProcessing || placements.length === 0}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-semibold shadow-sm transition-all text-sm"
              >
                {isProcessing ? 'Signing...' : `Sign & Save PDF (${placements.length} Signatures)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Creation Modal */}
      {signatureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Create Signature
              </h3>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <Tabs.Root defaultValue="draw">
              <Tabs.List className="flex border-b border-slate-200 dark:border-slate-800 mb-4">
                <Tabs.Tab
                  value="draw"
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 data-[selected]:text-[var(--primary)] data-[selected]:border-b-2 data-[selected]:border-[var(--primary)] transition-colors"
                >
                  Draw Signature
                </Tabs.Tab>
                <Tabs.Tab
                  value="upload"
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 data-[selected]:text-[var(--primary)] data-[selected]:border-b-2 data-[selected]:border-[var(--primary)] transition-colors"
                >
                  Upload Image
                </Tabs.Tab>
              </Tabs.List>

              {/* Draw Tab */}
              <Tabs.Panel value="draw" className="space-y-4">
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl bg-white overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={460}
                    height={180}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-[180px] touch-none cursor-crosshair"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Ink:</span>
                    {['#000000', '#1e3a8a', '#0369a1'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPenColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          penColor === c ? 'border-blue-500 scale-110' : 'border-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={saveDrawnSignature}
                      className="px-4 py-1.5 text-xs font-semibold bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Use Signature
                    </button>
                  </div>
                </div>
              </Tabs.Panel>

              {/* Upload Tab */}
              <Tabs.Panel value="upload" className="space-y-4">
                <input
                  ref={sigFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleSignatureUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <div
                  onClick={() => sigFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
                >
                  <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Upload PNG, JPG, or WebP
                  </p>
                  <p className="text-xs text-slate-500">
                    Backgrounds and margins are auto-trimmed for crisp placement.
                  </p>
                </div>
              </Tabs.Panel>
            </Tabs.Root>
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
              This will discard the currently loaded document and all placed signatures.
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
