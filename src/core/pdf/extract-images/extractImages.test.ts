import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { extractImages } from './extractImages';
import { PdfValidationError } from '../../shared';

const sampleWithImagesPath = path.resolve(
  __dirname,
  '../../../../test-files/007-imagemagick-images/imagemagick-images.pdf'
);
const sampleWithImagesBytes = new Uint8Array(fs.readFileSync(sampleWithImagesPath));

const sampleNoImagesPath = path.resolve(
  __dirname,
  '../../../../test-files/001-trivial/minimal-document.pdf'
);
const sampleNoImagesBytes = new Uint8Array(fs.readFileSync(sampleNoImagesPath));

// Mock PNG encoder for headless Node test
const mockEncoder = vi.fn(async (_pixelData: Uint8Array | Uint8ClampedArray, width: number, height: number) => {
  // Return dummy PNG signature
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, width, height]);
});

describe('extractImages (Core Operation)', () => {
  it('extracts embedded raster images and packages them into a valid ZIP archive', async () => {
    mockEncoder.mockClear();

    const result = await extractImages({
      buffer: sampleWithImagesBytes,
      baseFileName: 'photo',
      generateZip: true,
      customEncoder: mockEncoder
    });

    expect(result.pageCount).toBeGreaterThan(0);
    expect(result.imageCount).toBeGreaterThanOrEqual(1);
    expect(result.images.length).toBe(result.imageCount);

    const firstImage = result.images[0];
    expect(firstImage.fileName).toBe('photo-001.png');
    expect(firstImage.mimeType).toBe('image/png');
    expect(firstImage.width).toBeGreaterThan(0);
    expect(firstImage.height).toBeGreaterThan(0);
    expect(firstImage.buffer).toBeInstanceOf(Uint8Array);

    expect(result.zipBuffer).toBeDefined();
    if (result.zipBuffer) {
      const zip = await JSZip.loadAsync(result.zipBuffer);
      expect(zip.file('photo-001.png')).toBeDefined();
    }
  });

  it('gracefully returns 0 images for documents without embedded images', async () => {
    const result = await extractImages({
      buffer: sampleNoImagesBytes,
      customEncoder: mockEncoder
    });

    expect(result.imageCount).toBe(0);
    expect(result.images).toHaveLength(0);
    expect(result.zipBuffer).toBeUndefined();
  });

  it('tracks progress percentages during execution', async () => {
    const progressSpy = vi.fn();

    await extractImages({
      buffer: sampleWithImagesBytes,
      customEncoder: mockEncoder,
      onProgress: progressSpy
    });

    expect(progressSpy).toHaveBeenCalledWith(10);
    expect(progressSpy).toHaveBeenCalledWith(100);
    expect(progressSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects invalid or empty PDF buffers', async () => {
    const emptyBuf = new Uint8Array([]);
    await expect(
      extractImages({
        buffer: emptyBuf,
        customEncoder: mockEncoder
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('cancels extraction when abort signal is triggered', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      extractImages({
        buffer: sampleWithImagesBytes,
        signal: controller.signal,
        customEncoder: mockEncoder
      })
    ).rejects.toThrow('Image extraction was cancelled.');
  });
});
