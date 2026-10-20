/**
 * Standalone Functional Core Module: Split PDF
 * Framework-independent pure TypeScript operation using pdf-lib and jszip.
 */

import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError,
  toPdfError
} from '../../shared';
import type { SplitPdfOptions, SplitPdfResult } from './splitPdf.types';

/**
 * Splits or extracts pages from a PDF document.
 * Supports extracting pages into a single new PDF or individual PDFs per page bundled in a ZIP archive.
 *
 * @param options Split configuration including buffer, selectedPages, mode, and progress callbacks.
 * @returns Promise resolving to SplitPdfResult.
 * @throws {PdfValidationError} If page numbers are out of range or no pages selected.
 * @throws {PdfCorruptError} If document is corrupt or unreadable.
 */
export async function splitPdf(options: SplitPdfOptions): Promise<SplitPdfResult> {
  const {
    buffer,
    selectedPages,
    mode = 'single',
    fileName = 'split',
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Split operation was cancelled.');
  }

  // 1. Validate binary input
  validatePdfBuffer(buffer, fileName);

  if (!selectedPages || selectedPages.length === 0) {
    throw new PdfValidationError('No pages selected to split.');
  }

  if (onProgress) onProgress(5);

  // 2. Load source document
  let sourceDoc: PDFDocument;
  try {
    sourceDoc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new PdfCorruptError(`"${fileName}" could not be opened (${msg}).`, err);
  }

  const originalPageCount = sourceDoc.getPageCount();
  if (originalPageCount === 0) {
    throw new PdfValidationError(`"${fileName}" contains no readable pages.`);
  }

  // 3. Validate and deduplicate selected pages (1-indexed)
  const sortedPages = Array.from(new Set(selectedPages)).sort((a, b) => a - b);
  const outOfBounds = sortedPages.filter(p => !Number.isInteger(p) || p < 1 || p > originalPageCount);
  if (outOfBounds.length > 0) {
    throw new PdfValidationError(
      `Pages ${outOfBounds.join(', ')} are out of range (document has ${originalPageCount} pages).`,
      { outOfBounds, originalPageCount }
    );
  }

  if (onProgress) onProgress(15);

  // 4. Handle Mode: 'single' (all selected pages into one PDF)
  if (mode === 'single') {
    let targetDoc: PDFDocument;
    try {
      targetDoc = await PDFDocument.create();
    } catch (err) {
      throw toPdfError(err, 'Failed to create target document.');
    }

    const indicesToCopy = sortedPages.map(p => p - 1);
    let copiedPages;
    try {
      copiedPages = await targetDoc.copyPages(sourceDoc, indicesToCopy);
    } catch (err) {
      throw new PdfCorruptError('Failed to copy selected pages into the target document.', err);
    }

    copiedPages.forEach(page => targetDoc.addPage(page));

    if (onProgress) onProgress(80);

    let outputBytes: Uint8Array;
    try {
      outputBytes = await targetDoc.save({ useObjectStreams: true });
    } catch (err) {
      throw new PdfCorruptError('Failed to serialize split document.', err);
    }

    if (onProgress) onProgress(100);

    return {
      mode: 'single',
      buffer: outputBytes,
      pageCount: copiedPages.length,
      originalPageCount,
      byteLength: outputBytes.byteLength
    };
  }

  // 5. Handle Mode: 'individual' (each page as a separate PDF, bundled into ZIP)
  const resultFiles: Array<{ name: string; buffer: Uint8Array; pageNumber: number }> = [];
  const zip = new JSZip();
  const total = sortedPages.length;
  const padLength = Math.max(2, String(originalPageCount).length);

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) {
      throw new PdfValidationError('Split operation was cancelled.');
    }

    const pageNum = sortedPages[i];
    const pageIndex = pageNum - 1;

    let singleDoc: PDFDocument;
    try {
      singleDoc = await PDFDocument.create();
      const [copiedPage] = await singleDoc.copyPages(sourceDoc, [pageIndex]);
      singleDoc.addPage(copiedPage);
      const pageBytes = await singleDoc.save({ useObjectStreams: true });

      const paddedNum = String(pageNum).padStart(padLength, '0');
      const pageFileName = `${fileName}-page-${paddedNum}.pdf`;

      resultFiles.push({
        name: pageFileName,
        buffer: pageBytes,
        pageNumber: pageNum
      });

      zip.file(pageFileName, pageBytes);
    } catch (err) {
      throw new PdfCorruptError(`Failed to process page ${pageNum}.`, err);
    }

    if (onProgress) {
      const progress = 15 + Math.round(((i + 1) / total) * 70);
      onProgress(Math.min(progress, 85));
    }
  }

  if (onProgress) onProgress(90);

  // Generate zip bundle
  const zipArrayBuffer = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  if (onProgress) onProgress(100);

  return {
    mode: 'individual',
    files: resultFiles,
    zipBuffer: zipArrayBuffer,
    pageCount: resultFiles.length,
    originalPageCount,
    byteLength: zipArrayBuffer.byteLength
  };
}
