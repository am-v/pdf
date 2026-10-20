/**
 * Core PDF Validation Utilities
 * Pure validation functions independent of React or browser UI.
 */

import { PdfValidationError } from './errors';

// PDF header signature "%PDF-" in ASCII bytes
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d];

/**
 * Validates that binary data has content and starts with the %PDF- magic signature.
 */
export function validatePdfBuffer(buffer: Uint8Array, label = 'PDF document'): void {
  if (!buffer || buffer.byteLength === 0) {
    throw new PdfValidationError(`"${label}" is empty (0 bytes).`, { bufferLength: 0 });
  }

  if (buffer.byteLength < PDF_MAGIC_BYTES.length) {
    throw new PdfValidationError(`"${label}" is too small to be a valid PDF file.`, { bufferLength: buffer.byteLength });
  }

  // Check magic bytes %PDF-
  for (let i = 0; i < PDF_MAGIC_BYTES.length; i++) {
    if (buffer[i] !== PDF_MAGIC_BYTES[i]) {
      throw new PdfValidationError(`"${label}" does not appear to be a valid PDF (invalid file header).`, {
        expected: '%PDF-',
        actualBytes: Array.from(buffer.slice(0, 5))
      });
    }
  }
}

/**
 * Validates that an array of files satisfies minimum count and each is non-empty.
 */
export function validateNonEmptyFiles(
  files: readonly { buffer: Uint8Array; name?: string }[],
  minCount = 1
): void {
  if (!files || files.length < minCount) {
    throw new PdfValidationError(
      `At least ${minCount} file${minCount > 1 ? 's are' : ' is'} required (received ${files?.length || 0}).`
    );
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const label = file.name || `File ${i + 1}`;
    validatePdfBuffer(file.buffer, label);
  }
}

/**
 * Validates a single 1-indexed page number against document total pages.
 */
export function validatePageNumber(page: number, maxPages: number): void {
  if (!Number.isInteger(page) || page < 1 || page > maxPages) {
    throw new PdfValidationError(
      `Page ${page} is out of bounds (document has ${maxPages} page${maxPages === 1 ? '' : 's'}).`,
      { page, maxPages }
    );
  }
}

/**
 * Parses and validates page range syntax (e.g. "1-3, 5, 8-10").
 * Returns sorted, unique, 1-indexed page numbers.
 */
export function validatePageRange(rangeStr: string, maxPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    throw new PdfValidationError('Page range cannot be empty.');
  }

  const selected = new Set<number>();
  const tokens = rangeStr.split(',').map(s => s.trim()).filter(Boolean);

  if (tokens.length === 0) {
    throw new PdfValidationError('Page range contains no valid expressions.');
  }

  for (const token of tokens) {
    if (token.includes('-')) {
      const parts = token.split('-').map(s => s.trim());
      if (parts.length !== 2) {
        throw new PdfValidationError(`Invalid range syntax: "${token}". Use format like "1-5".`);
      }
      const start = Number(parts[0]);
      const end = Number(parts[1]);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new PdfValidationError(`Range numbers must be integers in: "${token}".`);
      }
      if (start > end) {
        throw new PdfValidationError(`Range start cannot be greater than end: "${token}".`);
      }
      if (start < 1) {
        throw new PdfValidationError(`Page numbers start at 1, found ${start} in: "${token}".`);
      }
      if (end > maxPages) {
        throw new PdfValidationError(`Page ${end} exceeds total pages (${maxPages}) in: "${token}".`);
      }

      for (let p = start; p <= end; p++) {
        selected.add(p);
      }
    } else {
      const page = Number(token);
      if (!Number.isInteger(page)) {
        throw new PdfValidationError(`"${token}" is not a valid page number.`);
      }
      validatePageNumber(page, maxPages);
      selected.add(page);
    }
  }

  if (selected.size === 0) {
    throw new PdfValidationError('No valid pages selected.');
  }

  return Array.from(selected).sort((a, b) => a - b);
}
