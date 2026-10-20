import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { splitPdf } from './splitPdf';
import { createSamplePdf } from '../../../test-utils/pdf-generator';
import { PdfValidationError } from '../../shared';

describe('splitPdf (Core Operation)', () => {
  it('extracts specific pages into a single PDF document', async () => {
    const sample = await createSamplePdf({ pageCount: 4, title: '4-Page Document' });

    const result = await splitPdf({
      buffer: sample,
      selectedPages: [2, 4],
      mode: 'single',
      fileName: 'test-doc'
    });

    expect(result.mode).toBe('single');
    if (result.mode === 'single') {
      expect(result.pageCount).toBe(2);
      expect(result.originalPageCount).toBe(4);
      expect(result.buffer).toBeInstanceOf(Uint8Array);

      const verified = await PDFDocument.load(result.buffer);
      expect(verified.getPageCount()).toBe(2);
    }
  });

  it('extracts pages into individual PDF documents and bundles them in a ZIP archive', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    const result = await splitPdf({
      buffer: sample,
      selectedPages: [1, 3],
      mode: 'individual',
      fileName: 'extracted'
    });

    expect(result.mode).toBe('individual');
    if (result.mode === 'individual') {
      expect(result.files.length).toBe(2);
      expect(result.files[0].pageNumber).toBe(1);
      expect(result.files[1].pageNumber).toBe(3);
      expect(result.zipBuffer).toBeInstanceOf(Uint8Array);
      expect(result.zipBuffer?.byteLength).toBeGreaterThan(0);

      // Verify each individual file is a valid 1-page PDF
      const doc1 = await PDFDocument.load(result.files[0].buffer);
      expect(doc1.getPageCount()).toBe(1);
      const doc2 = await PDFDocument.load(result.files[1].buffer);
      expect(doc2.getPageCount()).toBe(1);
    }
  });

  it('automatically sorts and deduplicates requested page numbers', async () => {
    const sample = await createSamplePdf({ pageCount: 4 });

    const result = await splitPdf({
      buffer: sample,
      selectedPages: [3, 1, 3, 1],
      mode: 'single'
    });

    expect(result.mode).toBe('single');
    if (result.mode === 'single') {
      expect(result.pageCount).toBe(2);
      const verified = await PDFDocument.load(result.buffer);
      expect(verified.getPageCount()).toBe(2);
    }
  });

  it('rejects when requested page numbers are out of range', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    await expect(
      splitPdf({
        buffer: sample,
        selectedPages: [1, 4]
      })
    ).rejects.toThrowError(PdfValidationError);

    await expect(
      splitPdf({
        buffer: sample,
        selectedPages: [0]
      })
    ).rejects.toThrowError(PdfValidationError);
  });

  it('rejects when no pages are selected', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });

    await expect(
      splitPdf({
        buffer: sample,
        selectedPages: []
      })
    ).rejects.toThrowError(PdfValidationError);
  });

  it('rejects an empty or corrupt input buffer', async () => {
    await expect(
      splitPdf({
        buffer: new Uint8Array(0),
        selectedPages: [1]
      })
    ).rejects.toThrowError(PdfValidationError);
  });

  it('tracks execution progress via onProgress callback', async () => {
    const sample = await createSamplePdf({ pageCount: 4 });
    const progressValues: number[] = [];

    const result = await splitPdf({
      buffer: sample,
      selectedPages: [1, 2, 3],
      mode: 'individual',
      onProgress: (p) => progressValues.push(p)
    });

    expect(result.pageCount).toBe(3);
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[progressValues.length - 1]).toBe(100);
  });

  it('cancels immediately when AbortSignal is triggered', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });
    const controller = new AbortController();
    controller.abort();

    await expect(
      splitPdf({
        buffer: sample,
        selectedPages: [1, 2],
        signal: controller.signal
      })
    ).rejects.toThrowError('Split operation was cancelled.');
  });
});
