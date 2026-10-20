/**
 * Standalone Functional Core Module: Rearrange PDF
 * Framework-independent pure TypeScript operation using pdf-lib.
 */

import { PDFDocument } from 'pdf-lib';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError,
  toPdfError
} from '../../shared';
import type { RearrangePdfOptions, RearrangePdfResult } from './rearrangePdf.types';

/**
 * Reorders, removes, or duplicates pages in a PDF document according to pageOrder.
 *
 * @param options Rearrange configuration including buffer, pageOrder (0-indexed), and progress callback.
 * @returns Promise resolving to RearrangePdfResult.
 * @throws {PdfValidationError} If pageOrder is empty or contains out-of-bounds indices.
 * @throws {PdfCorruptError} If document is corrupt or pages cannot be copied.
 */
export async function rearrangePdf(options: RearrangePdfOptions): Promise<RearrangePdfResult> {
  const {
    buffer,
    pageOrder,
    fileName = 'document',
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Rearrange operation was cancelled.');
  }

  // 1. Validate binary input
  validatePdfBuffer(buffer, fileName);

  if (!pageOrder || pageOrder.length === 0) {
    throw new PdfValidationError('Page order cannot be empty (at least 1 page must be retained).');
  }

  if (onProgress) onProgress(10);

  // 2. Load source PDF
  let sourceDoc: PDFDocument;
  try {
    sourceDoc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new PdfCorruptError(`"${fileName}" could not be opened (${msg}).`, err);
  }

  let originalPageCount: number;
  try {
    originalPageCount = sourceDoc.getPageCount();
  } catch (err: unknown) {
    throw new PdfCorruptError(`"${fileName}" pages could not be read (document index may be damaged).`, err);
  }

  if (originalPageCount === 0) {
    throw new PdfValidationError(`"${fileName}" contains no readable pages.`);
  }

  // 3. Validate 0-indexed page indices in pageOrder
  const invalidIndices = pageOrder.filter(idx => !Number.isInteger(idx) || idx < 0 || idx >= originalPageCount);
  if (invalidIndices.length > 0) {
    throw new PdfValidationError(
      `Invalid page indices [${invalidIndices.join(', ')}]. Document has ${originalPageCount} pages (indices 0 to ${originalPageCount - 1}).`,
      { invalidIndices, originalPageCount }
    );
  }

  if (onProgress) onProgress(30);

  // 4. Create target PDF and copy pages in specified order
  let targetDoc: PDFDocument;
  try {
    targetDoc = await PDFDocument.create();
  } catch (err) {
    throw toPdfError(err, 'Failed to create target PDF document.');
  }

  let copiedPages;
  try {
    copiedPages = await targetDoc.copyPages(sourceDoc, pageOrder);
  } catch (err) {
    throw new PdfCorruptError('Failed to copy pages into rearranged document.', err);
  }

  copiedPages.forEach(page => targetDoc.addPage(page));

  if (onProgress) onProgress(80);

  // 5. Serialize output document
  let outputBytes: Uint8Array;
  try {
    outputBytes = await targetDoc.save({ useObjectStreams: true });
  } catch (err) {
    throw new PdfCorruptError('Failed to serialize rearranged PDF document.', err);
  }

  if (onProgress) onProgress(100);

  return {
    buffer: outputBytes,
    pageCount: copiedPages.length,
    originalPageCount,
    byteLength: outputBytes.byteLength
  };
}
