/**
 * Standalone Functional Core Module: Sign PDF
 * Framework-independent pure TypeScript operation using pdf-lib.
 */

import { PDFDocument, PDFImage } from 'pdf-lib';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError
} from '../../shared';
import type { SignPdfOptions, SignPdfResult } from './signPdf.types';

/**
 * Embeds one or more signature images onto specific pages at visual coordinates.
 * Properly maps rotated page coordinates back to PDF user space and centers the stamp.
 *
 * @param options SignPdfOptions containing the PDF buffer and list of signature placements.
 * @returns Promise resolving to SignPdfResult.
 * @throws {PdfValidationError} If buffer is invalid or placements array is empty.
 * @throws {PdfCorruptError} If document cannot be opened, embedded, or serialized.
 */
export async function signPdf(options: SignPdfOptions): Promise<SignPdfResult> {
  const {
    buffer,
    placements,
    fileName = 'document',
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Sign operation was cancelled.');
  }

  // 1. Validate binary inputs
  validatePdfBuffer(buffer, fileName);

  if (!placements || placements.length === 0) {
    throw new PdfValidationError('At least one signature placement is required.');
  }

  if (onProgress) onProgress(10);

  // 2. Load PDF document
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new PdfCorruptError(`"${fileName}" could not be opened (${msg}).`, err);
  }

  let totalDocPages: number;
  try {
    totalDocPages = pdfDoc.getPageCount();
  } catch (err: unknown) {
    throw new PdfCorruptError(`"${fileName}" pages could not be read (document index may be damaged).`, err);
  }

  if (totalDocPages === 0) {
    throw new PdfValidationError(`"${fileName}" contains no readable pages.`);
  }

  if (onProgress) onProgress(25);

  // 3. Cache embedded images to prevent duplicate embedding inflation
  const imageCache = new Map<string, PDFImage>();

  const getEmbeddedImage = async (imgBuffer: Uint8Array, key?: string): Promise<PDFImage> => {
    const cacheKey = key || imgBuffer.length.toString();
    const existing = imageCache.get(cacheKey);
    if (existing) {
      return existing;
    }

    if (imgBuffer.length < 4) {
      throw new PdfValidationError('Signature image buffer is invalid or empty.');
    }

    const isJpg = imgBuffer[0] === 0xff && imgBuffer[1] === 0xd8 && imgBuffer[2] === 0xff;
    let embedded: PDFImage;
    try {
      if (isJpg) {
        embedded = await pdfDoc.embedJpg(imgBuffer);
      } else {
        embedded = await pdfDoc.embedPng(imgBuffer);
      }
    } catch (err) {
      throw new PdfCorruptError('Failed to embed signature image into PDF.', err);
    }

    imageCache.set(cacheKey, embedded);
    return embedded;
  };

  const pages = pdfDoc.getPages();
  let placedCount = 0;

  // 4. Iterate placements and stamp onto pages
  for (let i = 0; i < placements.length; i++) {
    if (signal?.aborted) {
      throw new PdfValidationError('Sign operation was cancelled.');
    }

    const p = placements[i];
    const targetIndex = Math.min(Math.max(p.page - 1, 0), totalDocPages - 1);
    const page = pages[targetIndex];

    const sigImage = await getEmbeddedImage(p.imageBuffer, p.imageKey);
    const { width, height } = page.getSize();
    const rot = ((Math.round(page.getRotation().angle) % 360) + 360) % 360;

    // Coordinate mapping from rendered preview (with rotation) to unrotated PDF space
    const xv = Math.max(0, Math.min(100, p.x)) / 100;
    const yv = Math.max(0, Math.min(100, p.y)) / 100;
    let xu = xv;
    let yu = yv;

    if (rot === 90) {
      xu = yv;
      yu = 1 - xv;
    } else if (rot === 180) {
      xu = 1 - xv;
      yu = 1 - yv;
    } else if (rot === 270) {
      xu = 1 - yv;
      yu = xv;
    }

    const visualW = (rot === 90 || rot === 270) ? height : width;
    const sizePct = Math.max(2, Math.min(100, p.size));
    const w = (sizePct / 100) * visualW;
    const h = w * (sigImage.height / sigImage.width);

    // Center stamp on tap point
    const pdfX = (xu * width) - w / 2;
    const pdfY = (height - (yu * height)) - h / 2;

    page.drawImage(sigImage, {
      x: pdfX,
      y: pdfY,
      width: w,
      height: h
    });

    placedCount++;

    if (onProgress) {
      const pct = Math.round(25 + ((i + 1) / placements.length) * 60);
      onProgress(pct);
    }
  }

  if (onProgress) onProgress(85);

  // 5. Serialize output document
  let outputBytes: Uint8Array;
  try {
    outputBytes = await pdfDoc.save({ useObjectStreams: true });
  } catch (err) {
    throw new PdfCorruptError('Failed to serialize signed PDF document.', err);
  }

  if (onProgress) onProgress(100);

  return {
    buffer: outputBytes,
    pageCount: totalDocPages,
    placedSignatureCount: placedCount,
    byteLength: outputBytes.byteLength
  };
}
