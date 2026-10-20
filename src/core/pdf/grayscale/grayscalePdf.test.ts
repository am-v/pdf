import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { grayscalePdf } from './grayscalePdf';
import { PdfValidationError } from '../../shared';

const sample4PagesPath = path.resolve(
  __dirname,
  '../../../../test-files/004-pdflatex-4-pages/pdflatex-4-pages.pdf'
);
const sample4PagesBytes = new Uint8Array(fs.readFileSync(sample4PagesPath));

const smileJpgPath = path.resolve(
  __dirname,
  '../../../../test-files/007-imagemagick-images/smile.jpg'
);
const smileJpgBytes = new Uint8Array(fs.readFileSync(smileJpgPath));

// Mock renderer that returns valid JPEG bytes
const mockRenderer = vi.fn(async (page: any, scale: number) => {
  const vp = page.getViewport({ scale });
  return {
    buffer: smileJpgBytes,
    width: Math.round(vp.width),
    height: Math.round(vp.height)
  };
});

describe('grayscalePdf (Core Operation)', () => {
  it('converts all pages of a PDF to desaturated grayscale pages', async () => {
    mockRenderer.mockClear();

    const result = await grayscalePdf({
      buffer: sample4PagesBytes,
      scale: 1.0,
      customRenderer: mockRenderer
    });

    expect(result.pageCount).toBe(4);
    expect(result.byteLength).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Uint8Array);
    expect(mockRenderer).toHaveBeenCalledTimes(4);

    const doc = await PDFDocument.load(result.buffer);
    expect(doc.getPageCount()).toBe(4);
  });

  it('tracks progress callbacks across all conversion stages', async () => {
    const progressSpy = vi.fn();

    await grayscalePdf({
      buffer: sample4PagesBytes,
      customRenderer: mockRenderer,
      onProgress: progressSpy
    });

    expect(progressSpy).toHaveBeenCalledWith(10);
    expect(progressSpy).toHaveBeenCalledWith(100);
    expect(progressSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('rejects empty or corrupt buffers', async () => {
    const emptyBuf = new Uint8Array([]);
    await expect(
      grayscalePdf({
        buffer: emptyBuf,
        customRenderer: mockRenderer
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('cancels processing when abort signal is triggered', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      grayscalePdf({
        buffer: sample4PagesBytes,
        signal: controller.signal,
        customRenderer: mockRenderer
      })
    ).rejects.toThrow('Grayscale conversion was cancelled.');
  });
});
