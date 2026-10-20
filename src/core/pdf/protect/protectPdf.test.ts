import { describe, it, expect, vi } from 'vitest';
import { protectPdf } from './protectPdf';
import { createSamplePdf } from '../../../test-utils/pdf-generator';
import { PdfValidationError, PdfCorruptError } from '../../shared';

describe('protectPdf (Core Operation)', () => {
  it('encrypts a PDF document with a user password', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });

    const result = await protectPdf({
      buffer: sample,
      password: 'SecretPassword123'
    });

    expect(result.pageCount).toBe(2);
    expect(result.isEncrypted).toBe(true);
    expect(result.buffer).toBeInstanceOf(Uint8Array);
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it('rejects empty or whitespace-only password', async () => {
    const sample = await createSamplePdf({ pageCount: 1 });

    await expect(
      protectPdf({
        buffer: sample,
        password: '   '
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('reports progress incrementally up to 100%', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });
    const progressSpy = vi.fn();

    await protectPdf({
      buffer: sample,
      password: 'mypassword',
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
      protectPdf({
        buffer: sample,
        password: 'mypassword',
        signal: controller.signal
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects too small buffer with PdfValidationError', async () => {
    await expect(
      protectPdf({
        buffer: new Uint8Array([1, 2, 3]),
        password: 'mypassword'
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects corrupt PDF body with PdfCorruptError', async () => {
    const corruptWithHeader = new TextEncoder().encode('%PDF-1.4\ncorrupted pdf content');
    await expect(
      protectPdf({
        buffer: corruptWithHeader,
        password: 'mypassword'
      })
    ).rejects.toThrow(PdfCorruptError);
  });
});
