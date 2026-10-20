import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { compressPdf } from './compressPdf';
import { PdfValidationError } from '../../shared';

const sample4PagesPath = path.resolve(
  __dirname,
  '../../../../test-files/004-pdflatex-4-pages/pdflatex-4-pages.pdf'
);
const sample4PagesBytes = new Uint8Array(fs.readFileSync(sample4PagesPath));

describe('compressPdf (Core Operation)', () => {
  it('optimizes document streams and returns valid PDF bytes', async () => {
    const result = await compressPdf({
      buffer: sample4PagesBytes,
      quality: 'medium'
    });

    expect(result.pageCount).toBe(4);
    expect(result.originalSize).toBe(sample4PagesBytes.byteLength);
    expect(result.compressedSize).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Uint8Array);
    expect(result.reductionPercent).toBeGreaterThanOrEqual(0);
    expect(['object-streams', 'photo-condense']).toContain(result.methodUsed);
  });

  it('compresses embedded photos when encoder shrinks image streams', async () => {
    // Mock encoder that returns half the bytes of any input
    const mockEncoder = vi.fn(async (bytes: Uint8Array) => {
      return bytes.subarray(0, Math.floor(bytes.byteLength / 2));
    });

    const result = await compressPdf({
      buffer: sample4PagesBytes,
      customImageEncoder: mockEncoder
    });

    expect(result.pageCount).toBe(4);
    expect(result.compressedSize).toBeGreaterThan(0);
  });

  it('tracks progress percentages during compression', async () => {
    const progressSpy = vi.fn();

    await compressPdf({
      buffer: sample4PagesBytes,
      onProgress: progressSpy
    });

    expect(progressSpy).toHaveBeenCalledWith(10);
    expect(progressSpy).toHaveBeenCalledWith(100);
    expect(progressSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects empty or corrupt buffers', async () => {
    const emptyBuf = new Uint8Array([]);
    await expect(compressPdf({ buffer: emptyBuf })).rejects.toThrow(PdfValidationError);
  });

  it('cancels processing when abort signal is triggered', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      compressPdf({
        buffer: sample4PagesBytes,
        signal: controller.signal
      })
    ).rejects.toThrow('Compression was cancelled.');
  });
});
