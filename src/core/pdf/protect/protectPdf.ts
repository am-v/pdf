/**
 * Standalone Functional Core Module: Protect PDF
 * Framework-independent pure TypeScript operation using pdf-lib and @pdfsmaller/pdf-encrypt-lite.
 */

import { PDFDocument } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt-lite';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError
} from '../../shared';
import type { ProtectPdfOptions, ProtectPdfResult } from './protectPdf.types';

/**
 * Encrypts a PDF document with a user password.
 *
 * @param options ProtectPdfOptions containing the PDF buffer and target password.
 * @returns Promise resolving to ProtectPdfResult containing encrypted buffer.
 * @throws {PdfValidationError} If buffer is invalid or password is empty.
 * @throws {PdfCorruptError} If document cannot be parsed or encrypted.
 */
export async function protectPdf(options: ProtectPdfOptions): Promise<ProtectPdfResult> {
  const {
    buffer,
    password,
    fileName = 'document',
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Protect operation was cancelled.');
  }

  // 1. Validate inputs
  validatePdfBuffer(buffer, fileName);

  if (!password || password.trim().length === 0) {
    throw new PdfValidationError('Password cannot be empty.');
  }

  if (onProgress) onProgress(15);

  // 2. Load PDF document to verify structure and get page count
  let sourceDoc: PDFDocument;
  try {
    sourceDoc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new PdfCorruptError(`"${fileName}" could not be opened (${msg}).`, err);
  }

  let pageCount: number;
  try {
    pageCount = sourceDoc.getPageCount();
  } catch (err: unknown) {
    throw new PdfCorruptError(`"${fileName}" pages could not be read.`, err);
  }

  if (pageCount === 0) {
    throw new PdfValidationError(`"${fileName}" contains no readable pages.`);
  }

  if (onProgress) onProgress(40);

  // 3. Create fresh document copy with object streams disabled for encryption engine
  let newPdf: PDFDocument;
  let pdfBytes: Uint8Array;
  try {
    newPdf = await PDFDocument.create();
    const pages = await newPdf.copyPages(sourceDoc, sourceDoc.getPageIndices());
    pages.forEach((page) => newPdf.addPage(page));
    pdfBytes = await newPdf.save({ useObjectStreams: false });
  } catch (err: unknown) {
    throw new PdfCorruptError('Failed to prepare document for encryption.', err);
  }

  if (signal?.aborted) {
    throw new PdfValidationError('Protect operation was cancelled.');
  }

  if (onProgress) onProgress(65);

  // 4. Encrypt binary data
  let encryptedBytes: Uint8Array;
  try {
    encryptedBytes = await encryptPDF(pdfBytes, password);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Encryption failed';
    throw new PdfCorruptError(`Failed to encrypt document (${msg}).`, err);
  }

  if (onProgress) onProgress(100);

  return {
    buffer: encryptedBytes,
    pageCount,
    byteLength: encryptedBytes.byteLength,
    isEncrypted: true
  };
}
