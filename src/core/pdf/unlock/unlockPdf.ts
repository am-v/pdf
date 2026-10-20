/**
 * Standalone Functional Core Module: Unlock PDF
 * Framework-independent pure TypeScript operation using QPDF WebAssembly and pdf-lib.
 */

import { PDFDocument } from 'pdf-lib';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError
} from '../../shared';
import type { UnlockPdfOptions, UnlockPdfResult } from './unlockPdf.types';

let qpdfRunnerPromise: Promise<unknown> | null = null;

async function getQpdfRunner() {
  if (typeof Worker === 'undefined') {
    return null;
  }
  if (!qpdfRunnerPromise) {
    qpdfRunnerPromise = (async () => {
      const { createQpdfRunner } = await import('qpdf-run');
      return createQpdfRunner({
        qpdfJsUrl: '/qpdf/qpdf.js',
        wasmUrl: '/qpdf/qpdf.wasm',
        workerUrl: '/qpdf/worker.js',
        timeoutMs: 60000
      });
    })();
  }
  return qpdfRunnerPromise;
}

/**
 * Checks if a PDF document is locked, and removes password encryption if locked.
 *
 * @param options UnlockPdfOptions containing buffer, password, and callbacks.
 * @returns Promise resolving to UnlockPdfResult.
 * @throws {PdfValidationError} If password is required or incorrect.
 * @throws {PdfCorruptError} If document cannot be parsed or decrypted.
 */
export async function unlockPdf(options: UnlockPdfOptions): Promise<UnlockPdfResult> {
  const {
    buffer,
    password,
    fileName = 'document',
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Unlock operation was cancelled.');
  }

  // 1. Validate binary input
  validatePdfBuffer(buffer, fileName);

  if (onProgress) onProgress(15);

  // 2. Check if the document is already unlocked
  try {
    const probeDoc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
    const pageCount = probeDoc.getPageCount();
    if (pageCount > 0) {
      if (onProgress) onProgress(100);
      return {
        buffer,
        pageCount,
        byteLength: buffer.byteLength,
        wasEncrypted: false
      };
    }
  } catch {
    // Document is encrypted or requires password
  }

  if (signal?.aborted) {
    throw new PdfValidationError('Unlock operation was cancelled.');
  }

  // 3. Document is locked: ensure password was supplied
  if (!password || password.trim().length === 0) {
    throw new PdfValidationError(`Password required to unlock "${fileName}".`);
  }

  if (onProgress) onProgress(40);

  // 4. Decrypt via QPDF WASM
  const runner = await getQpdfRunner() as {
    runOne: (config: { input: Uint8Array; inputName: string; outputName: string; args: string[] }) => Promise<Uint8Array>;
  } | null;

  if (!runner) {
    throw new PdfCorruptError('Client-side WebAssembly unlock engine is unavailable in this environment.');
  }

  let decryptedBytes: Uint8Array;
  try {
    decryptedBytes = await runner.runOne({
      input: buffer,
      inputName: 'input.pdf',
      outputName: 'output.pdf',
      args: [`--password=${password}`, '--decrypt', '--', 'input.pdf', 'output.pdf']
    });
  } catch (err: unknown) {
    const errorMsg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (errorMsg.includes('password') || errorMsg.includes('invalid password')) {
      throw new PdfValidationError(`Incorrect password for "${fileName}".`);
    }
    throw new PdfCorruptError(`Failed to unlock "${fileName}" (${errorMsg}).`, err);
  }

  if (onProgress) onProgress(80);

  // 5. Verify unlocked PDF
  let verifiedDoc: PDFDocument;
  try {
    verifiedDoc = await PDFDocument.load(decryptedBytes, { throwOnInvalidObject: false });
  } catch (err) {
    throw new PdfCorruptError(`"${fileName}" unlocked copy failed verification.`, err);
  }

  const pageCount = verifiedDoc.getPageCount();
  if (pageCount === 0) {
    throw new PdfCorruptError(`"${fileName}" contains no readable pages after decryption.`);
  }

  if (onProgress) onProgress(100);

  return {
    buffer: decryptedBytes,
    pageCount,
    byteLength: decryptedBytes.byteLength,
    wasEncrypted: true
  };
}
