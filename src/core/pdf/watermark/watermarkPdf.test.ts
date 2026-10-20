import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { watermarkPdf } from './watermarkPdf';
import { createSamplePdf } from '../../../test-utils/pdf-generator';
import { PdfValidationError, PdfCorruptError } from '../../shared';

describe('watermarkPdf (Core Operation)', () => {
  it('applies watermark text to all pages by default', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    const result = await watermarkPdf({
      buffer: sample,
      text: 'CONFIDENTIAL'
    });

    expect(result.pageCount).toBe(3);
    expect(result.watermarkedPageCount).toBe(3);
    expect(result.buffer).toBeInstanceOf(Uint8Array);

    const verified = await PDFDocument.load(result.buffer);
    expect(verified.getPageCount()).toBe(3);
  });

  it('supports custom opacity, rotation, and font size', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });

    const result = await watermarkPdf({
      buffer: sample,
      text: 'DRAFT',
      opacity: 0.5,
      rotation: 90,
      fontSize: 36,
      colorHex: '#dc2626'
    });

    expect(result.pageCount).toBe(2);
    expect(result.watermarkedPageCount).toBe(2);
  });

  it('supports selective watermarking of specified pages', async () => {
    const sample = await createSamplePdf({ pageCount: 4 });

    const result = await watermarkPdf({
      buffer: sample,
      text: 'PAGE 1 ONLY',
      pagesToWatermark: [1]
    });

    expect(result.pageCount).toBe(4);
    expect(result.watermarkedPageCount).toBe(1);
  });

  it('rejects empty or whitespace-only watermark text', async () => {
    const sample = await createSamplePdf({ pageCount: 1 });

    await expect(
      watermarkPdf({
        buffer: sample,
        text: '   '
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects invalid or non-positive font size', async () => {
    const sample = await createSamplePdf({ pageCount: 1 });

    await expect(
      watermarkPdf({
        buffer: sample,
        text: 'TEST',
        fontSize: -10
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('reports progress incrementally up to 100%', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });
    const progressSpy = vi.fn();

    await watermarkPdf({
      buffer: sample,
      text: 'PROGRESS',
      onProgress: progressSpy
    });

    expect(progressSpy).toHaveBeenCalled();
    const calls = progressSpy.mock.calls.map(c => c[0]);
    expect(calls[calls.length - 1]).toBe(100);
  });

  it('respects AbortSignal cancellation', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });
    const controller = new AbortController();
    controller.abort();

    await expect(
      watermarkPdf({
        buffer: sample,
        text: 'ABORTED',
        signal: controller.signal
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects too small buffer with PdfValidationError', async () => {
    await expect(
      watermarkPdf({
        buffer: new Uint8Array([1, 2, 3]),
        text: 'INVALID'
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects corrupt PDF body with PdfCorruptError', async () => {
    const corruptWithHeader = new TextEncoder().encode('%PDF-1.4\ncorrupted body content');
    await expect(
      watermarkPdf({
        buffer: corruptWithHeader,
        text: 'CORRUPT'
      })
    ).rejects.toThrow(PdfCorruptError);
  });
});
