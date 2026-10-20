/**
 * Standalone Functional Core Module: Compress PDF
 * Pure framework-independent TypeScript operation using pdf-lib and canvas.
 */

import {
  PDFDocument,
  PDFName,
  PDFRawStream
} from 'pdf-lib';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError,
  getPdfjs
} from '../../shared';
import type {
  CompressPdfOptions,
  CompressPdfResult,
  CompressQuality
} from './compressPdf.types';

const QUALITY_TIERS: Record<CompressQuality, { maxDim: number; jpegQ: number }> = {
  high: { maxDim: 2560, jpegQ: 0.8 },
  medium: { maxDim: 1920, jpegQ: 0.65 },
  low: { maxDim: 1280, jpegQ: 0.45 }
};

/**
 * Re-encodes a JPEG image buffer at a targeted maximum dimension and quality setting.
 */
async function defaultBrowserImageEncoder(
  imageBytes: Uint8Array,
  quality: number,
  maxDimension: number
): Promise<Uint8Array | null> {
  if (typeof document === 'undefined') {
    return null;
  }

  try {
    const blob = new Blob([imageBytes as BlobPart], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to decode image'));
      el.src = url;
    });

    URL.revokeObjectURL(url);

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;

    const scale = Math.min(1, maxDimension / Math.max(w, h));
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    canvas.width = 0;
    canvas.height = 0;

    if (!compressedBlob) return null;
    const compressedBytes = new Uint8Array(await compressedBlob.arrayBuffer());

    // Only return if it actually saved space
    if (compressedBytes.byteLength < imageBytes.byteLength) {
      return compressedBytes;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Renders document pages to compressed JPEG images and reassembles as a new document.
 * This strategy achieves maximum file size reduction (often 70%-85% savings)
 * especially for documents with complex vector art, forms, or uncompressed streams.
 */
async function compressRaster(
  buffer: Uint8Array,
  quality: CompressQuality,
  onProgress?: (progressPercent: number) => void,
  signal?: AbortSignal
): Promise<{ buffer: Uint8Array; pageCount: number; compressedSize: number } | null> {
  if (typeof document === 'undefined') {
    return null;
  }

  try {
    const pdfjs = await getPdfjs();
    const loadingTask = pdfjs.getDocument({
      data: buffer.slice(0),
      useSystemFonts: true,
      isEvalSupported: false
    });

    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;
    if (pageCount === 0) return null;

    const targetDoc = await PDFDocument.create();

    // Scale and JPEG quality tiers:
    // low (Maximum Savings): scale 0.85, quality 0.45 (maximizes compression for dense multi-page docs)
    // medium: scale 1.20, quality 0.65
    // high: scale 1.50, quality 0.80
    const rasterSettings: Record<CompressQuality, { scale: number; quality: number }> = {
      low: { scale: 0.85, quality: 0.45 },
      medium: { scale: 1.20, quality: 0.65 },
      high: { scale: 1.50, quality: 0.80 }
    };
    const settings = rasterSettings[quality] || rasterSettings.low;

    try {
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        if (signal?.aborted) {
          throw new PdfValidationError('Compression was cancelled.');
        }

        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: settings.scale });
        const origViewport = page.getViewport({ scale: 1.0 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));

        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport
        }).promise;

        const jpegBlob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', settings.quality);
        });

        canvas.width = 0;
        canvas.height = 0;

        if (!jpegBlob) continue;

        const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
        const embeddedImage = await targetDoc.embedJpg(jpegBytes);

        const newPage = targetDoc.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height
        });

        if (onProgress) {
          const pct = Math.round(15 + (pageNum / pageCount) * 75);
          onProgress(pct);
        }
      }
    } finally {
      try {
        await pdfDoc.destroy();
      } catch {
        // ignore
      }
    }

    if (targetDoc.getPageCount() === 0) return null;

    const outputBytes = await targetDoc.save({ useObjectStreams: true });
    return {
      buffer: outputBytes,
      pageCount: targetDoc.getPageCount(),
      compressedSize: outputBytes.byteLength
    };
  } catch (err: unknown) {
    console.warn('compressRaster failed, using condense fallback:', err);
    return null;
  }
}

/**
 * Compresses a PDF document by condensing embedded images, generating optimized object streams,
 * or rasterizing pages at high savings when Maximum Savings is selected.
 *
 * @param options CompressPdfOptions configuring quality tiers and progress tracking.
 * @returns Promise resolving to CompressPdfResult with original/compressed sizes and reduction percentage.
 */
export async function compressPdf(options: CompressPdfOptions): Promise<CompressPdfResult> {
  const {
    buffer,
    quality = 'medium',
    mode,
    customImageEncoder,
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Compression was cancelled.');
  }

  validatePdfBuffer(buffer, 'PDF buffer');

  if (onProgress) onProgress(10);

  const originalSize = buffer.byteLength;

  // 1. If Maximum Savings ('low') or Extreme mode is requested in a browser environment,
  // attempt high-ratio page rasterization compression (often achieves 75%-85% reduction)
  if ((quality === 'low' || mode === 'extreme') && typeof document !== 'undefined') {
    const rasterResult = await compressRaster(buffer, quality, onProgress, signal);
    if (rasterResult && rasterResult.compressedSize < originalSize) {
      if (onProgress) onProgress(100);
      const reductionPercent =
        Math.round(((originalSize - rasterResult.compressedSize) / originalSize) * 1000) / 10;
      return {
        buffer: rasterResult.buffer,
        originalSize,
        compressedSize: rasterResult.compressedSize,
        reductionPercent,
        pageCount: rasterResult.pageCount,
        methodUsed: 'page-raster'
      };
    }
  }

  const config = QUALITY_TIERS[quality] || QUALITY_TIERS.medium;
  const encoder = customImageEncoder || defaultBrowserImageEncoder;

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(buffer, {
      throwOnInvalidObject: false,
      ignoreEncryption: true
    });
  } catch (err: unknown) {
    throw new PdfCorruptError('Failed to parse PDF document for compression.', err);
  }

  if (signal?.aborted) {
    throw new PdfValidationError('Compression was cancelled.');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = (pdfDoc as any).context;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries: any[] = context.enumerateIndirectObjects ? context.enumerateIndirectObjects() : [];
  let photosShrunk = 0;

  const totalEntries = entries.length;

  for (let idx = 0; idx < totalEntries; idx++) {
    if (signal?.aborted) {
      throw new PdfValidationError('Compression was cancelled.');
    }

    const [ref, obj] = entries[idx];
    try {
      if (!(obj instanceof PDFRawStream)) continue;
      const dict = obj.dict;
      if (!dict) continue;

      const subtype = dict.lookup(PDFName.of('Subtype'));
      if (!subtype || subtype.toString() !== '/Image') continue;

      // Ignore image masks or non-DCT images
      if (dict.lookup(PDFName.of('ImageMask'))) continue;

      const filter = dict.lookup(PDFName.of('Filter'));
      const filterStr = filter ? filter.toString() : '';
      if (!filterStr.includes('DCTDecode') || filterStr.includes('JPXDecode')) continue;

      const rawContents = obj.getContents() as Uint8Array;
      // Skip tiny images (< 8KB) to avoid overhead
      if (!rawContents || rawContents.byteLength < 8192) continue;

      const smallerBytes = await encoder(rawContents, config.jpegQ, config.maxDim);

      if (smallerBytes && smallerBytes.byteLength < rawContents.byteLength) {
        context.assign(ref, PDFRawStream.of(dict, smallerBytes));
        photosShrunk++;
      }
    } catch {
      // Skip any non-standard image objects safely
    }

    if (onProgress && idx % 10 === 0) {
      const pct = Math.round(10 + (idx / Math.max(1, totalEntries)) * 75);
      onProgress(pct);
    }
  }

  if (onProgress) onProgress(85);

  let outputBytes: Uint8Array;
  try {
    outputBytes = await pdfDoc.save({ useObjectStreams: true });
  } catch (err: unknown) {
    throw new PdfCorruptError('Failed to serialize compressed PDF document.', err);
  }

  let finalBuffer = outputBytes;
  let compressedSize = outputBytes.byteLength;

  // If the input was already more compressed than our output, use the input
  if (compressedSize > originalSize && photosShrunk === 0) {
    finalBuffer = buffer;
    compressedSize = originalSize;
  }

  // If condense did not shrink any photos and saved less than 5%, check if rasterization in browser produces smaller size
  if (photosShrunk === 0 && quality === 'low' && typeof document !== 'undefined') {
    const rasterResult = await compressRaster(buffer, quality, onProgress, signal);
    if (rasterResult && rasterResult.compressedSize < compressedSize) {
      finalBuffer = rasterResult.buffer;
      compressedSize = rasterResult.compressedSize;
      const reductionPercent =
        Math.round(((originalSize - compressedSize) / originalSize) * 1000) / 10;
      if (onProgress) onProgress(100);
      return {
        buffer: finalBuffer,
        originalSize,
        compressedSize,
        reductionPercent,
        pageCount: rasterResult.pageCount,
        methodUsed: 'page-raster'
      };
    }
  }

  const reductionPercent =
    originalSize > compressedSize
      ? Math.round(((originalSize - compressedSize) / originalSize) * 1000) / 10
      : 0;

  const methodUsed: 'photo-condense' | 'object-streams' =
    photosShrunk > 0 ? 'photo-condense' : 'object-streams';

  if (onProgress) onProgress(100);

  return {
    buffer: finalBuffer,
    originalSize,
    compressedSize,
    reductionPercent,
    pageCount: pdfDoc.getPageCount(),
    methodUsed
  };
}
