import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { mergePdfs } from './merge-pdfs';
import { createSamplePdf } from '../../../test-utils/pdf-generator';
import { PdfValidationError } from '../../shared';

describe('mergePdfs (Core Operation)', () => {
  it('successfully combines multiple PDF documents into one document', async () => {
    const pdf1 = await createSamplePdf({ pageCount: 2, title: 'Doc A' });
    const pdf2 = await createSamplePdf({ pageCount: 3, title: 'Doc B' });

    const result = await mergePdfs([
      { buffer: pdf1, name: 'DocA.pdf' },
      { buffer: pdf2, name: 'DocB.pdf' }
    ]);

    expect(result.documentCount).toBe(2);
    expect(result.pageCount).toBe(5);
    expect(result.buffer).toBeInstanceOf(Uint8Array);
    expect(result.byteLength).toBeGreaterThan(0);

    // Verify output can be loaded and inspected
    const verifiedDoc = await PDFDocument.load(result.buffer);
    expect(verifiedDoc.getPageCount()).toBe(5);
  });

  it('correctly applies per-document rotation offsets to pages', async () => {
    const pdf1 = await createSamplePdf({ pageCount: 1, title: 'Doc 1' });
    const pdf2 = await createSamplePdf({ pageCount: 1, title: 'Doc 2' });

    const result = await mergePdfs([
      { buffer: pdf1, rotation: 90, name: 'Doc1.pdf' },
      { buffer: pdf2, rotation: 180, name: 'Doc2.pdf' }
    ]);

    const verifiedDoc = await PDFDocument.load(result.buffer);
    const pages = verifiedDoc.getPages();
    expect(pages[0].getRotation().angle).toBe(90);
    expect(pages[1].getRotation().angle).toBe(180);
  });

  it('rejects when fewer than 2 files are provided', async () => {
    const pdf = await createSamplePdf({ pageCount: 1 });

    await expect(
      mergePdfs([{ buffer: pdf, name: 'single.pdf' }])
    ).rejects.toThrowError(PdfValidationError);

    await expect(mergePdfs([])).rejects.toThrowError(PdfValidationError);
  });

  it('rejects when an input buffer is empty or corrupted', async () => {
    const validPdf = await createSamplePdf({ pageCount: 1 });
    const emptyBuffer = new Uint8Array(0);

    await expect(
      mergePdfs([
        { buffer: validPdf, name: 'valid.pdf' },
        { buffer: emptyBuffer, name: 'corrupt.pdf' }
      ])
    ).rejects.toThrowError(PdfValidationError);

    const damagedHeader = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
    await expect(
      mergePdfs([
        { buffer: validPdf, name: 'valid.pdf' },
        { buffer: damagedHeader, name: 'damaged.pdf' }
      ])
    ).rejects.toThrowError(PdfValidationError);
  });

  it('tracks execution progress accurately via onProgress callback', async () => {
    const pdf1 = await createSamplePdf({ pageCount: 1 });
    const pdf2 = await createSamplePdf({ pageCount: 1 });

    const progressValues: number[] = [];
    const result = await mergePdfs(
      [
        { buffer: pdf1, name: 'p1.pdf' },
        { buffer: pdf2, name: 'p2.pdf' }
      ],
      {
        onProgress: (p) => progressValues.push(p)
      }
    );

    expect(result.pageCount).toBe(2);
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[progressValues.length - 1]).toBe(100);
    // Ensure monotonic increase
    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
    }
  });

  it('cancels immediately when AbortSignal is triggered', async () => {
    const pdf1 = await createSamplePdf({ pageCount: 1 });
    const pdf2 = await createSamplePdf({ pageCount: 1 });

    const controller = new AbortController();
    controller.abort();

    await expect(
      mergePdfs(
        [
          { buffer: pdf1, name: 'p1.pdf' },
          { buffer: pdf2, name: 'p2.pdf' }
        ],
        { signal: controller.signal }
      )
    ).rejects.toThrowError('Merge operation was cancelled.');
  });

  it('guarantees caller input buffers are not mutated', async () => {
    const pdf1 = await createSamplePdf({ pageCount: 2 });
    const pdf2 = await createSamplePdf({ pageCount: 2 });

    const snapshot1 = new Uint8Array(pdf1);
    const snapshot2 = new Uint8Array(pdf2);

    await mergePdfs([
      { buffer: pdf1, rotation: 90 },
      { buffer: pdf2, rotation: 270 }
    ]);

    expect(pdf1).toEqual(snapshot1);
    expect(pdf2).toEqual(snapshot2);
  });
});
