/**
 * Standalone Functional Core Module: Image to PDF
 * Framework-independent pure TypeScript operation using pdf-lib.
 */

import { PDFDocument, PDFImage } from 'pdf-lib';
import {
  PdfValidationError,
  PdfCorruptError
} from '../../shared';
import type { ImageToPdfOptions, ImageToPdfResult } from './imageToPdf.types';

const PAGE_SIZES: Record<'a4' | 'letter', [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612.0, 792.0]
};

/**
 * Converts one or more images (JPEG, PNG) into a clean, multi-page PDF document.
 *
 * @param options ImageToPdfOptions configuring images, page sizing, orientation, and margins.
 * @returns Promise resolving to ImageToPdfResult containing PDF binary data.
 * @throws {PdfValidationError} If images array is empty or buffers are invalid.
 * @throws {PdfCorruptError} If images cannot be embedded or PDF cannot be created.
 */
export async function imageToPdf(options: ImageToPdfOptions): Promise<ImageToPdfResult> {
  const {
    images,
    pageSize = 'fit-image',
    orientation = 'auto',
    margin = 0,
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Image to PDF conversion was cancelled.');
  }

  if (!images || images.length === 0) {
    throw new PdfValidationError('At least one image is required for conversion.');
  }

  if (onProgress) onProgress(10);

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.create();
  } catch (err) {
    throw new PdfCorruptError('Failed to initialize PDF document.', err);
  }

  const total = images.length;

  for (let idx = 0; idx < total; idx++) {
    if (signal?.aborted) {
      throw new PdfValidationError('Image to PDF conversion was cancelled.');
    }

    const item = images[idx];
    const label = item.fileName || `Image ${idx + 1}`;

    if (!item.buffer || item.buffer.byteLength < 4) {
      throw new PdfValidationError(`"${label}" is empty or too small to be a valid image.`);
    }

    // Detect format
    const b = item.buffer;
    const isJpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const isPng = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

    let embeddedImg: PDFImage;
    try {
      if (isJpg) {
        embeddedImg = await pdfDoc.embedJpg(item.buffer);
      } else if (isPng) {
        embeddedImg = await pdfDoc.embedPng(item.buffer);
      } else {
        // Fallback: try PNG then JPG
        try {
          embeddedImg = await pdfDoc.embedPng(item.buffer);
        } catch {
          embeddedImg = await pdfDoc.embedJpg(item.buffer);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unsupported or corrupted image format';
      throw new PdfCorruptError(`Could not embed "${label}" (${msg}). Expected JPG or PNG.`, err);
    }

    const { width: imgW, height: imgH } = embeddedImg;

    if (pageSize === 'fit-image') {
      const pWidth = imgW + margin * 2;
      const pHeight = imgH + margin * 2;
      const page = pdfDoc.addPage([pWidth, pHeight]);
      page.drawImage(embeddedImg, {
        x: margin,
        y: margin,
        width: imgW,
        height: imgH
      });
    } else {
      // Standard A4 or Letter
      const [baseW, baseH] = PAGE_SIZES[pageSize];
      const isLandscape =
        orientation === 'landscape' ||
        (orientation === 'auto' && imgW > imgH);

      const pWidth = isLandscape ? baseH : baseW;
      const pHeight = isLandscape ? baseW : baseH;

      const availW = Math.max(10, pWidth - margin * 2);
      const availH = Math.max(10, pHeight - margin * 2);

      const scale = Math.min(availW / imgW, availH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;

      const drawX = margin + (availW - drawW) / 2;
      const drawY = margin + (availH - drawH) / 2;

      const page = pdfDoc.addPage([pWidth, pHeight]);
      page.drawImage(embeddedImg, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH
      });
    }

    if (onProgress) {
      const pct = Math.round(10 + ((idx + 1) / total) * 75);
      onProgress(pct);
    }
  }

  if (onProgress) onProgress(85);

  let outputBytes: Uint8Array;
  try {
    outputBytes = await pdfDoc.save({ useObjectStreams: true });
  } catch (err) {
    throw new PdfCorruptError('Failed to serialize generated PDF document.', err);
  }

  if (onProgress) onProgress(100);

  return {
    buffer: outputBytes,
    pageCount: total,
    byteLength: outputBytes.byteLength
  };
}
