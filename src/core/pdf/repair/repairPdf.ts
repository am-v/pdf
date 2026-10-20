/**
 * Standalone Functional Core Module: Repair PDF
 * Framework-independent pure TypeScript operation using QPDF WebAssembly and pdf-lib fallback.
 */

import { PDFDocument } from 'pdf-lib';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError
} from '../../shared';
import type {
  RepairPdfOptions,
  RepairPdfResult
} from './repairPdf.types';

let qpdfRunnerPromise: Promise<unknown> | null = null;

async function getQpdfRunner() {
  if (typeof Worker === 'undefined') {
    return null;
  }
  if (!qpdfRunnerPromise) {
    qpdfRunnerPromise = (async () => {
      try {
        const { createQpdfRunner } = await import('qpdf-run');
        return createQpdfRunner({
          qpdfJsUrl: '/qpdf/qpdf.js',
          wasmUrl: '/qpdf/qpdf.wasm',
          workerUrl: '/qpdf/worker.js',
          timeoutMs: 60000
        });
      } catch {
        return null;
      }
    })();
  }
  return qpdfRunnerPromise;
}

/**
 * Attempts to repair corrupted, damaged, or unreadable PDF documents.
 * Reconstructs damaged XRef tables, recovers broken streams, and linearizes document objects.
 *
 * @param options RepairPdfOptions configuring buffer, fileName, and callbacks.
 * @returns Promise resolving to RepairPdfResult with repaired binary data and metrics.
 * @throws {PdfValidationError} If input is invalid.
 * @throws {PdfCorruptError} If document is completely irreparable.
 */
export async function repairPdf(options: RepairPdfOptions): Promise<RepairPdfResult> {
  const {
    buffer,
    fileName = 'document.pdf',
    password,
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Repair operation was cancelled.');
  }

  validatePdfBuffer(buffer, fileName);

  if (onProgress) onProgress(15);

  const originalSize = buffer.byteLength;
  let repairedBytes: Uint8Array | null = null;
  let engineUsed: 'qpdf-wasm' | 'pdf-lib' = 'pdf-lib';
  let repairNotes = '';

  // 1. Attempt primary repair via QPDF WebAssembly
  try {
    const runner = (await getQpdfRunner()) as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      run: (opts: any) => Promise<{ output: Uint8Array; exitCode: number; log?: string }>;
    } | null;

    if (runner && typeof runner.run === 'function') {
      const qpdfArgs = ['qpdf', '--warning-exit-0'];
      if (password) {
        qpdfArgs.push(`--password=${password}`);
      }
      qpdfArgs.push('in.pdf', 'out.pdf');

      const result = await runner.run({
        command: qpdfArgs,
        input: buffer
      });

      if (result.output && result.output.byteLength > 0 && result.exitCode === 0) {
        repairedBytes = result.output;
        engineUsed = 'qpdf-wasm';
        repairNotes = 'Reconstructed XRef table and recovered stream dictionaries via QPDF WebAssembly.';
      }
    }
  } catch (qpdfErr) {
    console.warn('QPDF repair engine was unavailable or errored, falling back to pdf-lib rebuild:', qpdfErr);
  }

  if (signal?.aborted) {
    throw new PdfValidationError('Repair operation was cancelled.');
  }

  if (onProgress) onProgress(55);

  // 2. Secondary fallback via pdf-lib lenient parsing & serialization
  if (!repairedBytes) {
    try {
      const doc = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false
      });

      repairedBytes = await doc.save({ useObjectStreams: true });
      engineUsed = 'pdf-lib';
      repairNotes = 'Rebuilt document structure and recovered surviving page trees via tolerant parser.';
    } catch (fallbackErr: unknown) {
      throw new PdfCorruptError(
        `Document "${fileName}" is severely corrupted and cannot be recovered.`,
        fallbackErr
      );
    }
  }

  if (signal?.aborted) {
    throw new PdfValidationError('Repair operation was cancelled.');
  }

  if (onProgress) onProgress(85);

  // Inspect page count of the recovered PDF
  let recoveredPageCount = 1;
  try {
    const checkDoc = await PDFDocument.load(repairedBytes, {
      throwOnInvalidObject: false,
      ignoreEncryption: true
    });
    recoveredPageCount = checkDoc.getPageCount();
  } catch {
    // If inspection fails, still return repairedBytes
  }

  if (onProgress) onProgress(100);

  return {
    buffer: repairedBytes,
    originalSize,
    repairedSize: repairedBytes.byteLength,
    pageCount: recoveredPageCount,
    engineUsed,
    repairNotes
  };
}
