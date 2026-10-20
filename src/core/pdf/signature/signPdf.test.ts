import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { signPdf } from './signPdf';
import { createSamplePdf } from '../../../test-utils/pdf-generator';
import { PdfValidationError, PdfCorruptError } from '../../shared';

// 1x1 black PNG image
const TINY_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
  c => c.charCodeAt(0)
);

describe('signPdf (Core Operation)', () => {
  it('correctly stamps a signature on the requested page', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });

    const result = await signPdf({
      buffer: sample,
      placements: [
        {
          id: 'sig-1',
          page: 1,
          x: 50,
          y: 75,
          size: 25,
          imageBuffer: TINY_PNG
        }
      ]
    });

    expect(result.pageCount).toBe(2);
    expect(result.placedSignatureCount).toBe(1);
    expect(result.buffer).toBeInstanceOf(Uint8Array);

    const verified = await PDFDocument.load(result.buffer);
    expect(verified.getPageCount()).toBe(2);
  });

  it('correctly handles multiple signature placements across different pages', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    const result = await signPdf({
      buffer: sample,
      placements: [
        {
          id: 'sig-1',
          page: 1,
          x: 20,
          y: 80,
          size: 20,
          imageBuffer: TINY_PNG,
          imageKey: 'test-sig'
        },
        {
          id: 'sig-2',
          page: 3,
          x: 70,
          y: 80,
          size: 20,
          imageBuffer: TINY_PNG,
          imageKey: 'test-sig'
        }
      ]
    });

    expect(result.pageCount).toBe(3);
    expect(result.placedSignatureCount).toBe(2);
  });

  it('throws PdfValidationError if placements array is empty', async () => {
    const sample = await createSamplePdf({ pageCount: 1 });

    await expect(
      signPdf({
        buffer: sample,
        placements: []
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('reports progress incrementally up to 100%', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });
    const progressSpy = vi.fn();

    await signPdf({
      buffer: sample,
      placements: [
        {
          id: 'sig-1',
          page: 1,
          x: 50,
          y: 50,
          size: 30,
          imageBuffer: TINY_PNG
        }
      ],
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
      signPdf({
        buffer: sample,
        placements: [
          {
            id: 'sig-1',
            page: 1,
            x: 50,
            y: 50,
            size: 30,
            imageBuffer: TINY_PNG
          }
        ],
        signal: controller.signal
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects corrupt PDF buffer with PdfCorruptError', async () => {
    const corruptWithHeader = new TextEncoder().encode('%PDF-1.4\ncorrupted signature test');
    await expect(
      signPdf({
        buffer: corruptWithHeader,
        placements: [
          {
            id: 'sig-1',
            page: 1,
            x: 50,
            y: 50,
            size: 30,
            imageBuffer: TINY_PNG
          }
        ]
      })
    ).rejects.toThrow(PdfCorruptError);
  });
});
