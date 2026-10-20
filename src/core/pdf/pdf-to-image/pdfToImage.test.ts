import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { pdfToImage } from './pdfToImage';
import { PdfValidationError, PdfCorruptError } from '../../shared';

const sample4Path = path.resolve(__dirname, '../../../../test-files/004-pdflatex-4-pages/pdflatex-4-pages.pdf');
const sample4Bytes = new Uint8Array(fs.readFileSync(sample4Path));

// Mock renderer for headless Node environment
const mockRenderer = vi.fn(async (page: any, scale: number) => {
  const vp = page.getViewport({ scale });
  // Return dummy PNG signature bytes [0x89, 0x50, 0x4e, 0x47]
  const dummyBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return {
    buffer: dummyBuffer,
    width: Math.round(vp.width),
    height: Math.round(vp.height)
  };
});

describe('pdfToImage (Core Operation)', () => {
  it('converts multi-page PDF into images and bundles them into a valid ZIP archive', async () => {
    mockRenderer.mockClear();

    const result = await pdfToImage({
      buffer: sample4Bytes,
      format: 'png',
      dpi: 150,
      baseFileName: 'my-doc',
      generateZip: true,
      customRenderer: mockRenderer
    });

    expect(result.pageCount).toBe(4);
    expect(result.images).toHaveLength(4);
    expect(mockRenderer).toHaveBeenCalledTimes(4);

    // Verify page naming and format
    expect(result.images[0].fileName).toBe('my-doc-01.png');
    expect(result.images[3].fileName).toBe('my-doc-04.png');
    expect(result.images[0].mimeType).toBe('image/png');

    // Verify ZIP archive contents
    expect(result.zipBuffer).toBeDefined();
    if (result.zipBuffer) {
      const zip = await JSZip.loadAsync(result.zipBuffer);
      expect(zip.file('my-doc-01.png')).toBeDefined();
      expect(zip.file('my-doc-04.png')).toBeDefined();
    }
  });

  it('allows converting only a subset of pages', async () => {
    mockRenderer.mockClear();

    const result = await pdfToImage({
      buffer: sample4Bytes,
      pages: [2, 4],
      baseFileName: 'extract',
      customRenderer: mockRenderer
    });

    expect(result.pageCount).toBe(2);
    expect(result.images[0].pageNumber).toBe(2);
    expect(result.images[1].pageNumber).toBe(4);
    expect(result.images[0].fileName).toBe('extract-02.png');
    expect(result.images[1].fileName).toBe('extract-04.png');
  });

  it('tracks progress percentages from start to finish', async () => {
    const progressSpy = vi.fn();

    await pdfToImage({
      buffer: sample4Bytes,
      pages: [1, 2],
      customRenderer: mockRenderer,
      onProgress: progressSpy
    });

    expect(progressSpy).toHaveBeenCalledWith(10);
    expect(progressSpy).toHaveBeenCalledWith(100);
    expect(progressSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects invalid or empty PDF buffers', async () => {
    const emptyBuf = new Uint8Array([]);
    await expect(
      pdfToImage({
        buffer: emptyBuf,
        customRenderer: mockRenderer
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('cancels processing when abort signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      pdfToImage({
        buffer: sample4Bytes,
        signal: controller.signal,
        customRenderer: mockRenderer
      })
    ).rejects.toThrow('PDF to Image conversion was cancelled.');
  });

  it('throws PdfCorruptError if rendering fails', async () => {
    const failingRenderer = vi.fn().mockRejectedValue(new Error('Canvas rasterization failed'));

    await expect(
      pdfToImage({
        buffer: sample4Bytes,
        pages: [1],
        customRenderer: failingRenderer
      })
    ).rejects.toThrow(PdfCorruptError);
  });
});
