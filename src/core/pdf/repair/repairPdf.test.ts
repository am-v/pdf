import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { repairPdf } from './repairPdf';
import { PdfValidationError, PdfCorruptError } from '../../shared';

const sample4PagesPath = path.resolve(
  __dirname,
  '../../../../test-files/004-pdflatex-4-pages/pdflatex-4-pages.pdf'
);
const sample4PagesBytes = new Uint8Array(fs.readFileSync(sample4PagesPath));

describe('repairPdf (Core Operation)', () => {
  it('reconstructs PDF structure and returns verified repaired document', async () => {
    const result = await repairPdf({
      buffer: sample4PagesBytes,
      fileName: 'test-doc.pdf'
    });

    expect(result.pageCount).toBe(4);
    expect(result.repairedSize).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Uint8Array);
    expect(['qpdf-wasm', 'pdf-lib']).toContain(result.engineUsed);
    expect(result.repairNotes.length).toBeGreaterThan(10);

    // Verify output can be loaded and inspected
    const doc = await PDFDocument.load(result.buffer);
    expect(doc.getPageCount()).toBe(4);
  });

  it('tracks progress callbacks through all stages', async () => {
    const progressSpy = vi.fn();

    await repairPdf({
      buffer: sample4PagesBytes,
      onProgress: progressSpy
    });

    expect(progressSpy).toHaveBeenCalledWith(15);
    expect(progressSpy).toHaveBeenCalledWith(100);
    expect(progressSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects empty buffers with validation error', async () => {
    const emptyBuf = new Uint8Array([]);
    await expect(repairPdf({ buffer: emptyBuf })).rejects.toThrow(PdfValidationError);
  });

  it('throws PdfCorruptError for corrupted PDF document body', async () => {
    // Starts with valid %PDF- header but contains irrecoverable corrupt garbage body
    const header = new TextEncoder().encode('%PDF-1.4\n');
    const garbageBody = new Uint8Array(Array.from({ length: 256 }, (_, i) => (i * 37) % 256));
    const corruptPdf = new Uint8Array(header.length + garbageBody.length);
    corruptPdf.set(header, 0);
    corruptPdf.set(garbageBody, header.length);

    await expect(
      repairPdf({
        buffer: corruptPdf,
        fileName: 'corrupt.pdf'
      })
    ).rejects.toThrow(PdfCorruptError);
  });

  it('cancels processing when abort signal is triggered', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      repairPdf({
        buffer: sample4PagesBytes,
        signal: controller.signal
      })
    ).rejects.toThrow('Repair operation was cancelled.');
  });
});
