import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { rearrangePdf } from './rearrangePdf';
import { createSamplePdf } from '../../../test-utils/pdf-generator';
import { PdfValidationError, PdfCorruptError } from '../../shared';

describe('rearrangePdf (Core Operation)', () => {
  it('correctly reorders pages in the requested sequence', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    const result = await rearrangePdf({
      buffer: sample,
      pageOrder: [2, 0, 1]
    });

    expect(result.originalPageCount).toBe(3);
    expect(result.pageCount).toBe(3);
    expect(result.buffer).toBeInstanceOf(Uint8Array);

    const verified = await PDFDocument.load(result.buffer);
    expect(verified.getPageCount()).toBe(3);
  });

  it('allows page deletion / subset extraction', async () => {
    const sample = await createSamplePdf({ pageCount: 4 });

    const result = await rearrangePdf({
      buffer: sample,
      pageOrder: [1, 3] // Keep only page 2 and page 4
    });

    expect(result.originalPageCount).toBe(4);
    expect(result.pageCount).toBe(2);

    const verified = await PDFDocument.load(result.buffer);
    expect(verified.getPageCount()).toBe(2);
  });

  it('allows page duplication', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });

    const result = await rearrangePdf({
      buffer: sample,
      pageOrder: [0, 0, 1]
    });

    expect(result.pageCount).toBe(3);

    const verified = await PDFDocument.load(result.buffer);
    expect(verified.getPageCount()).toBe(3);
  });

  it('throws PdfValidationError if pageOrder is empty', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    await expect(
      rearrangePdf({
        buffer: sample,
        pageOrder: []
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('throws PdfValidationError if page indices are out of range', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    await expect(
      rearrangePdf({
        buffer: sample,
        pageOrder: [0, 1, 5] // index 5 is out of bounds for 3 pages (0, 1, 2)
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('throws PdfValidationError if page indices contain negative or non-integer numbers', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    await expect(
      rearrangePdf({
        buffer: sample,
        pageOrder: [-1, 1]
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('reports progress incrementally up to 100%', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });
    const progressSpy = vi.fn();

    await rearrangePdf({
      buffer: sample,
      pageOrder: [1, 0, 2],
      onProgress: progressSpy
    });

    expect(progressSpy).toHaveBeenCalled();
    const calls = progressSpy.mock.calls.map(c => c[0]);
    expect(calls).toContain(100);
    expect(calls[calls.length - 1]).toBe(100);
  });

  it('respects AbortSignal cancellation', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });
    const controller = new AbortController();
    controller.abort();

    await expect(
      rearrangePdf({
        buffer: sample,
        pageOrder: [0, 1],
        signal: controller.signal
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects too small buffer with PdfValidationError', async () => {
    await expect(
      rearrangePdf({
        buffer: new Uint8Array([1, 2, 3]),
        pageOrder: [0]
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects corrupt PDF body with PdfCorruptError', async () => {
    const corruptWithHeader = new TextEncoder().encode('%PDF-1.4\ncorrupted content that cannot be parsed by pdf-lib');
    await expect(
      rearrangePdf({
        buffer: corruptWithHeader,
        pageOrder: [0]
      })
    ).rejects.toThrow(PdfCorruptError);
  });
});
