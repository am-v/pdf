/**
 * Standalone Functional Core Module: Grayscale PDF
 * Pure framework-independent TypeScript operation using pdfjs-dist and pdf-lib.
 */

import { PDFDocument } from 'pdf-lib';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError,
  PdfPasswordError,
  getPdfjs
} from '../../shared';
import type {
  GrayscalePdfOptions,
  GrayscalePdfResult
} from './grayscalePdf.types';

/**
 * Default browser canvas renderer that renders and desaturates a PDF page.
 */
async function defaultBrowserGrayscaleRenderer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  scale: number,
  quality: number
): Promise<{ buffer: Uint8Array; width: number; height: number }> {
  if (typeof document === 'undefined') {
    throw new PdfValidationError(
      'HTML Canvas is not available in this environment. Provide customRenderer for headless testing.'
    );
  }

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new PdfCorruptError('Failed to obtain 2D canvas context for grayscale conversion.');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const len = data.length;

  for (let j = 0; j < len; j += 4) {
    // ITU-R BT.601 standard luminance weights
    const gray = Math.round(data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114);
    data[j] = gray;
    data[j + 1] = gray;
    data[j + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to encode grayscale page to JPEG blob'));
      },
      'image/jpeg',
      quality
    );
  });

  const arrayBuf = await blob.arrayBuffer();
  canvas.width = 0;
  canvas.height = 0;

  return {
    buffer: new Uint8Array(arrayBuf),
    width: Math.floor(viewport.width),
    height: Math.floor(viewport.height)
  };
}

/**
 * Converts a colored PDF document into clean, desaturated monochrome/grayscale pages.
 *
 * @param options GrayscalePdfOptions configuring scale, quality, and callbacks.
 * @returns Promise resolving to GrayscalePdfResult with the generated grayscale PDF buffer.
 */
export async function grayscalePdf(options: GrayscalePdfOptions): Promise<GrayscalePdfResult> {
  const {
    buffer,
    password,
    scale = 1.5,
    quality = 0.8,
    customRenderer,
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Grayscale conversion was cancelled.');
  }

  validatePdfBuffer(buffer, 'PDF buffer');

  if (onProgress) onProgress(10);

  const pdfjs = await getPdfjs();
  const safeBuffer = buffer.slice(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sourceDoc: any;
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

    sourceDoc = await loadingTask.promise;
  } catch (err: unknown) {
    if (signal?.aborted) {
      throw new PdfValidationError('Grayscale conversion was cancelled.');
    }
    const msg = String(err instanceof Error ? err.message : err);
    if (/password/i.test(msg)) {
      throw new PdfPasswordError('PASSWORD_REQUIRED', 'This PDF is password-protected or the password provided is incorrect.', err);
    }
    throw new PdfCorruptError(`Failed to parse PDF document for grayscale conversion: ${msg}`, err);
  }

  const numPages: number = sourceDoc.numPages;
  if (numPages <= 0) {
    throw new PdfCorruptError('The document contains no readable pages.');
  }

  let outDoc: PDFDocument;
  try {
    outDoc = await PDFDocument.create();
  } catch (err: unknown) {
    throw new PdfCorruptError('Failed to create output PDF document.', err);
  }

  const renderer = customRenderer || defaultBrowserGrayscaleRenderer;

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (signal?.aborted) {
        throw new PdfValidationError('Grayscale conversion was cancelled.');
      }

      try {
        const page = await sourceDoc.getPage(pageNum);
        const rendered = await renderer(page, scale, quality);

        try {
          page.cleanup();
        } catch {
          // ignore
        }

        const embeddedImg = await outDoc.embedJpg(rendered.buffer);
        const newPage = outDoc.addPage([rendered.width, rendered.height]);
        newPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: rendered.width,
          height: rendered.height
        });
      } catch (err: unknown) {
        if (signal?.aborted) {
          throw new PdfValidationError('Grayscale conversion was cancelled.');
        }
        throw new PdfCorruptError(`Failed to convert page ${pageNum} to grayscale.`, err);
      }

      if (onProgress) {
        const pct = Math.round(10 + (pageNum / numPages) * 75);
        onProgress(pct);
      }
    }
  } finally {
    try {
      await sourceDoc.destroy();
    } catch {
      // ignore
    }
  }

  if (onProgress) onProgress(85);

  let outputBytes: Uint8Array;
  try {
    outputBytes = await outDoc.save({ useObjectStreams: true });
  } catch (err: unknown) {
    throw new PdfCorruptError('Failed to serialize grayscale PDF.', err);
  }

  if (onProgress) onProgress(100);

  return {
    buffer: outputBytes,
    pageCount: numPages,
    byteLength: outputBytes.byteLength
  };
}
