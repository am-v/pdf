/**
 * Standalone Functional Core Module: Merge PDFs
 * Framework-independent pure TypeScript operation using pdf-lib.
 */

import { PDFDocument, degrees } from 'pdf-lib';
import {
  validateNonEmptyFiles,
  PdfValidationError,
  PdfCorruptError,
  toPdfError,
  normalizeAngle
} from '../../shared';
import type { MergeInputItem, MergePdfsOptions, MergePdfsResult } from './merge-pdfs.types';

/**
 * Merges multiple PDF byte arrays into a single PDF document.
 * Supports per-document rotation offsets and execution progress reporting.
 *
 * @param inputs Array of at least 2 PDF inputs to merge.
 * @param options Optional configuration including progress callback and AbortSignal.
 * @returns Promise resolving to the merged PDF binary and metadata.
 * @throws {PdfValidationError} If inputs are invalid or fewer than 2 files provided.
 * @throws {PdfCorruptError} If any PDF is damaged or unreadable.
 */
export async function mergePdfs(
  inputs: readonly MergeInputItem[],
  options?: MergePdfsOptions
): Promise<MergePdfsResult> {
  const { onProgress, signal } = options || {};

  // Check abort signal before starting
  if (signal?.aborted) {
    throw new PdfValidationError('Merge operation was cancelled.');
  }

  // 1. Validate inputs (minimum 2 files, non-empty, valid %PDF- magic bytes)
  validateNonEmptyFiles(inputs, 2);

  if (onProgress) onProgress(5);

  let mergedDoc: PDFDocument;
  try {
    mergedDoc = await PDFDocument.create();
  } catch (error) {
    throw toPdfError(error, 'Failed to create target PDF document.');
  }

  let totalPages = 0;
  const count = inputs.length;

  // 2. Iterate each document, copy pages, and apply rotation
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) {
      throw new PdfValidationError('Merge operation was cancelled.');
    }

    const item = inputs[i];
    const label = item.name || `Document ${i + 1}`;

    let sourceDoc: PDFDocument;
    try {
      sourceDoc = await PDFDocument.load(item.buffer, {
        throwOnInvalidObject: false
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      throw new PdfCorruptError(`"${label}" could not be opened (${msg}).`, err);
    }

    let pageIndices: number[];
    try {
      pageIndices = sourceDoc.getPageIndices();
    } catch (err: unknown) {
      throw new PdfCorruptError(`"${label}" pages could not be read (document index may be damaged).`, err);
    }

    if (pageIndices.length === 0) {
      throw new PdfValidationError(`"${label}" contains no readable pages.`);
    }

    let copiedPages;
    try {
      copiedPages = await mergedDoc.copyPages(sourceDoc, pageIndices);
    } catch (err: unknown) {
      throw new PdfCorruptError(`Pages from "${label}" could not be copied into the merged document.`, err);
    }

    const rotationOffset = item.rotation ? normalizeAngle(item.rotation) : 0;

    for (const page of copiedPages) {
      if (rotationOffset !== 0) {
        const currentAngle = page.getRotation().angle;
        page.setRotation(degrees((currentAngle + rotationOffset) % 360));
      }
      mergedDoc.addPage(page);
    }

    totalPages += copiedPages.length;

    // Report progress proportionally (from 5% to 85% during page copying)
    if (onProgress) {
      const progress = 5 + Math.round(((i + 1) / count) * 80);
      onProgress(Math.min(progress, 85));
    }
  }

  if (totalPages === 0) {
    throw new PdfValidationError('No pages were merged.');
  }

  // 3. Serialize merged document
  if (onProgress) onProgress(90);

  let outputBytes: Uint8Array;
  try {
    outputBytes = await mergedDoc.save({ useObjectStreams: true });
  } catch (err: unknown) {
    throw new PdfCorruptError('Merged PDF could not be saved due to corrupt stream content.', err);
  }

  if (onProgress) onProgress(100);

  return {
    buffer: outputBytes,
    pageCount: totalPages,
    documentCount: count,
    byteLength: outputBytes.byteLength
  };
}
