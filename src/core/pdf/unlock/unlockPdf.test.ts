import { describe, it, expect } from 'vitest';
import { unlockPdf } from './unlockPdf';
import { protectPdf } from '../protect/protectPdf';
import { createSamplePdf } from '../../../test-utils/pdf-generator';
import { PdfValidationError } from '../../shared';

describe('unlockPdf (Core Operation)', () => {
  it('returns already unlocked PDF byte-identical with wasEncrypted: false', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    const result = await unlockPdf({
      buffer: sample
    });

    expect(result.pageCount).toBe(3);
    expect(result.wasEncrypted).toBe(false);
    expect(result.buffer).toBe(sample);
  });

  it('detects locked PDF and rejects when no password is provided', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });
    const protectedPdf = await protectPdf({
      buffer: sample,
      password: 'testpassword123'
    });

    await expect(
      unlockPdf({
        buffer: protectedPdf.buffer
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects too small buffer with PdfValidationError', async () => {
    await expect(
      unlockPdf({
        buffer: new Uint8Array([1, 2, 3])
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('respects AbortSignal cancellation', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });
    const controller = new AbortController();
    controller.abort();

    await expect(
      unlockPdf({
        buffer: sample,
        signal: controller.signal
      })
    ).rejects.toThrow(PdfValidationError);
  });
});
