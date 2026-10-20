/**
 * Standalone Functional Core Module: PDF to Image
 * Framework-independent pure TypeScript operation using pdfjs-dist and JSZip.
 */

import JSZip from 'jszip';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError,
  PdfPasswordError,
  getPdfjs
} from '../../shared';
import type {
  PdfToImageOptions,
  PdfToImageResult,
  PdfImagePageItem,
  PdfToImageFormat
} from './pdfToImage.types';

const DPI_SCALES: Record<number, number> = {
  72: 1.0,
  150: 150 / 72,
  300: 300 / 72
};

/**
 * Default browser canvas renderer for rendering a pdfjs page to image bytes.
 */
async function defaultBrowserRenderer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  scale: number,
  format: PdfToImageFormat,
  quality: number
): Promise<{ buffer: Uint8Array; width: number; height: number }> {
  if (typeof document === 'undefined') {
    throw new PdfValidationError(
      'HTML Canvas is not available in this environment. Provide a customRenderer for headless testing.'
    );
  }

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new PdfCorruptError('Failed to obtain 2D rendering context for canvas.');
  }

  // Set white background for transparent PDFs before rendering
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport
  };

  await page.render(renderContext).promise;

  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to encode canvas to blob'));
      },
      mime,
      quality
    );
  });

  const arrayBuf = await blob.arrayBuffer();
  // Clear canvas dimensions to release GPU/RAM texture immediately
  canvas.width = 0;
  canvas.height = 0;

  return {
    buffer: new Uint8Array(arrayBuf),
    width: Math.floor(viewport.width),
    height: Math.floor(viewport.height)
  };
}

/**
 * Converts PDF pages into raster image files (PNG or JPEG) and optionally bundles them into a ZIP archive.
 *
 * @param options PdfToImageOptions configuring PDF buffer, DPI, format, quality, and output naming.
 * @returns Promise resolving to PdfToImageResult with per-page image buffers and optional ZIP archive.
 */
export async function pdfToImage(options: PdfToImageOptions): Promise<PdfToImageResult> {
  const {
    buffer,
    password,
    format = 'png',
    dpi = 150,
    quality = 0.85,
    pages: requestedPages,
    baseFileName = 'page',
    generateZip = true,
    customRenderer,
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('PDF to Image conversion was cancelled.');
  }

  validatePdfBuffer(buffer, 'PDF buffer');

  if (onProgress) onProgress(10);

  const pdfjs = await getPdfjs();
  const safeBuffer = buffer.slice(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfDoc: any;
  try {
    const loadingTask = pdfjs.getDocument({
      data: safeBuffer,
      password: password || undefined,
      disableFontFace: true,
      stopAtErrors: false
    });

    if (signal) {
      signal.addEventListener('abort', () => {
        try {
          loadingTask.destroy();
        } catch {
          // ignore
        }
      });
    }

    pdfDoc = await loadingTask.promise;
  } catch (err: unknown) {
    if (signal?.aborted) {
      throw new PdfValidationError('PDF to Image conversion was cancelled.');
    }
    const msg = String(err instanceof Error ? err.message : err);
    if (/password/i.test(msg)) {
      throw new PdfPasswordError('PASSWORD_REQUIRED', 'This PDF is password-protected or the password provided is incorrect.', err);
    }
    throw new PdfCorruptError(`Failed to parse PDF document for image conversion: ${msg}`, err);
  }

  const numPages: number = pdfDoc.numPages;
  if (numPages <= 0) {
    throw new PdfCorruptError('The document contains no readable pages.');
  }

  // Determine pages to render
  const targetPages: number[] = [];
  if (requestedPages && requestedPages.length > 0) {
    for (const p of requestedPages) {
      if (p >= 1 && p <= numPages && !targetPages.includes(p)) {
        targetPages.push(p);
      }
    }
  } else {
    for (let i = 1; i <= numPages; i++) {
      targetPages.push(i);
    }
  }

  if (targetPages.length === 0) {
    throw new PdfValidationError('No valid pages specified for conversion.');
  }

  const scale = DPI_SCALES[dpi] || 150 / 72;
  const renderer = customRenderer || defaultBrowserRenderer;
  const renderedImages: PdfImagePageItem[] = [];
  const total = targetPages.length;
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

  try {
    for (let idx = 0; idx < total; idx++) {
      if (signal?.aborted) {
        throw new PdfValidationError('PDF to Image conversion was cancelled.');
      }

      const pageNum = targetPages[idx];
      try {
        const page = await pdfDoc.getPage(pageNum);
        const rendered = await renderer(page, scale, format, quality);

        try {
          page.cleanup();
        } catch {
          // ignore
        }

        const padLen = Math.max(2, String(numPages).length);
        const paddedNum = String(pageNum).padStart(padLen, '0');
        const fileName = `${baseFileName}-${paddedNum}.${ext}`;

        renderedImages.push({
          pageNumber: pageNum,
          buffer: rendered.buffer,
          fileName,
          mimeType,
          width: rendered.width,
          height: rendered.height
        });
      } catch (err: unknown) {
        if (signal?.aborted) {
          throw new PdfValidationError('PDF to Image conversion was cancelled.');
        }
        throw new PdfCorruptError(`Failed to render page ${pageNum} to image.`, err);
      }

      if (onProgress) {
        const pct = Math.round(10 + ((idx + 1) / total) * 75);
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

  let zipBuffer: Uint8Array | undefined;
  if (generateZip && renderedImages.length > 0) {
    const zip = new JSZip();
    for (const img of renderedImages) {
      zip.file(img.fileName, img.buffer);
    }
    const zipData = await zip.generateAsync({ type: 'uint8array' });
    zipBuffer = zipData;
  }

  if (onProgress) onProgress(100);

  return {
    images: renderedImages,
    zipBuffer,
    pageCount: renderedImages.length
  };
}
