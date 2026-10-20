/**
 * Standalone Functional Core Module: Rotate PDF
 * Framework-independent pure TypeScript operation using pdf-lib.
 */

import { PDFDocument, degrees } from 'pdf-lib';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError,
  normalizeAngle
} from '../../shared';
import type { RotatePdfOptions, RotatePdfResult } from './rotatePdf.types';

/**
 * Permanently rotates specific or all pages of a PDF document.
 *
 * @param options Rotate configuration including buffer, rotations map, and progress callback.
 * @returns Promise resolving to RotatePdfResult.
 * @throws {PdfValidationError} If buffer is empty or inputs invalid.
 * @throws {PdfCorruptError} If document cannot be parsed or saved.
 */
export async function rotatePdf(options: RotatePdfOptions): Promise<RotatePdfResult> {
  const {
    buffer,
    rotations = {},
    globalRotation = 0,
    fileName = 'document',
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Rotate operation was cancelled.');
  }

  // 1. Validate binary input
  validatePdfBuffer(buffer, fileName);

  if (onProgress) onProgress(10);

  // 2. Load PDF document
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new PdfCorruptError(`"${fileName}" could not be opened (${msg}).`, err);
  }

  const pages = pdfDoc.getPages();
  const pageCount = pages.length;

  if (pageCount === 0) {
    throw new PdfValidationError(`"${fileName}" contains no readable pages.`);
  }

  if (onProgress) onProgress(30);

  let rotatedCount = 0;

  // 3. Iterate through pages and apply rotations
  for (let idx = 0; idx < pageCount; idx++) {
    if (signal?.aborted) {
      throw new PdfValidationError('Rotate operation was cancelled.');
    }

    const pageNum = idx + 1; // 1-indexed
    const pageAngle = rotations[pageNum] || 0;
    const angleToAdd = pageAngle + globalRotation;

    if (angleToAdd !== 0) {
      const page = pages[idx];
      const currentAngle = page.getRotation().angle;
      const normalizedAdd = normalizeAngle(angleToAdd);
      page.setRotation(degrees((currentAngle + normalizedAdd) % 360));
      rotatedCount++;
    }

    if (onProgress) {
      const progress = 30 + Math.round(((idx + 1) / pageCount) * 55);
      onProgress(Math.min(progress, 85));
    }
  }

  if (onProgress) onProgress(90);

  // 4. Save and return updated bytes
  let outputBytes: Uint8Array;
  try {
    outputBytes = await pdfDoc.save({ useObjectStreams: true });
  } catch (err) {
    throw new PdfCorruptError('Failed to serialize rotated PDF document.', err);
  }

  if (onProgress) onProgress(100);

  return {
    buffer: outputBytes,
    pageCount,
    rotatedPageCount: rotatedCount,
    byteLength: outputBytes.byteLength
  };
}
