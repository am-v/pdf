import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { pageNumbers } from './pageNumbers';
import { createSamplePdf } from '../../../test-utils/pdf-generator';
import { PdfValidationError, PdfCorruptError } from '../../shared';

describe('pageNumbers (Core Operation)', () => {
  it('stamps page numbers on all pages by default', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    const result = await pageNumbers({
      buffer: sample,
      format: 'Page {n} of {total}'
    });

    expect(result.pageCount).toBe(3);
    expect(result.numberedPageCount).toBe(3);
    expect(result.buffer).toBeInstanceOf(Uint8Array);

    const verified = await PDFDocument.load(result.buffer);
    expect(verified.getPageCount()).toBe(3);
  });

  it('supports custom formatting template and starting page number', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });

    const result = await pageNumbers({
      buffer: sample,
      format: '{n} / {total}',
      startFrom: 10
    });

    expect(result.pageCount).toBe(2);
    expect(result.numberedPageCount).toBe(2);
  });

  it('supports selective numbering of specific pages', async () => {
    const sample = await createSamplePdf({ pageCount: 4 });

    const result = await pageNumbers({
      buffer: sample,
      pagesToNumber: [2, 4] // only page 2 and page 4
    });

    expect(result.pageCount).toBe(4);
    expect(result.numberedPageCount).toBe(2);
  });

  it('supports all position configurations', async () => {
    const sample = await createSamplePdf({ pageCount: 1 });
    const positions = [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right'
    ] as const;

    for (const pos of positions) {
      const result = await pageNumbers({
        buffer: sample,
        position: pos
      });
      expect(result.numberedPageCount).toBe(1);
    }
  });

  it('rejects invalid font size or negative margin', async () => {
    const sample = await createSamplePdf({ pageCount: 1 });

    await expect(
      pageNumbers({
        buffer: sample,
        fontSize: -5
      })
    ).rejects.toThrow(PdfValidationError);

    await expect(
      pageNumbers({
        buffer: sample,
        margin: -10
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects invalid hex colors', async () => {
    const sample = await createSamplePdf({ pageCount: 1 });

    await expect(
      pageNumbers({
        buffer: sample,
        colorHex: 'invalid-hex'
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('respects AbortSignal cancellation', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });
    const controller = new AbortController();
    controller.abort();

    await expect(
      pageNumbers({
        buffer: sample,
        signal: controller.signal
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('reports progress incrementally up to 100%', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });
    const progressSpy = vi.fn();

    await pageNumbers({
      buffer: sample,
      onProgress: progressSpy
    });

    expect(progressSpy).toHaveBeenCalled();
    const calls = progressSpy.mock.calls.map(c => c[0]);
    expect(calls[calls.length - 1]).toBe(100);
  });

  it('rejects corrupt buffers', async () => {
    const corruptWithHeader = new TextEncoder().encode('%PDF-1.4\ncorrupted content that cannot be parsed');
    await expect(
      pageNumbers({
        buffer: corruptWithHeader
      })
    ).rejects.toThrow(PdfCorruptError);
  });
});
