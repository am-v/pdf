import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { imageToPdf } from './imageToPdf';
import { PdfValidationError, PdfCorruptError } from '../../shared';

// Load test sample images
const sampleDir = path.resolve(__dirname, '../../../../test-files/007-imagemagick-images');
const sampleJpg = new Uint8Array(fs.readFileSync(path.join(sampleDir, 'smile.jpg')));
const samplePng = new Uint8Array(fs.readFileSync(path.join(sampleDir, 'smile.png')));

describe('imageToPdf (Core Operation)', () => {
  it('converts a single JPEG image into a single-page PDF with fit-image dimensions', async () => {
    const result = await imageToPdf({
      images: [{ buffer: sampleJpg, fileName: 'smile.jpg' }],
      pageSize: 'fit-image'
    });

    expect(result.pageCount).toBe(1);
    expect(result.byteLength).toBeGreaterThan(0);
    expect(result.buffer).toBeInstanceOf(Uint8Array);

    const doc = await PDFDocument.load(result.buffer);
    expect(doc.getPageCount()).toBe(1);
    const page = doc.getPage(0);
    const { width, height } = page.getSize();
    // smile.jpg is square-ish
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });

  it('converts multiple images (JPG + PNG) into a multi-page PDF', async () => {
    const result = await imageToPdf({
      images: [
        { buffer: sampleJpg, fileName: 'smile.jpg' },
        { buffer: samplePng, fileName: 'smile.png' }
      ],
      pageSize: 'fit-image'
    });

    expect(result.pageCount).toBe(2);
    const doc = await PDFDocument.load(result.buffer);
    expect(doc.getPageCount()).toBe(2);
  });

  it('creates standardized A4 pages with margins and centers image', async () => {
    const result = await imageToPdf({
      images: [{ buffer: samplePng, fileName: 'smile.png' }],
      pageSize: 'a4',
      margin: 20
    });

    const doc = await PDFDocument.load(result.buffer);
    const page = doc.getPage(0);
    const { width, height } = page.getSize();
    // A4 portrait is ~595.28 x 841.89
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(842);
  });

  it('supports Letter page size and forced landscape orientation', async () => {
    const result = await imageToPdf({
      images: [{ buffer: sampleJpg, fileName: 'smile.jpg' }],
      pageSize: 'letter',
      orientation: 'landscape'
    });

    const doc = await PDFDocument.load(result.buffer);
    const page = doc.getPage(0);
    const { width, height } = page.getSize();
    // Letter landscape: 792 x 612
    expect(Math.round(width)).toBe(792);
    expect(Math.round(height)).toBe(612);
  });

  it('tracks progress through all conversion steps', async () => {
    const progressSpy = vi.fn();

    await imageToPdf({
      images: [
        { buffer: sampleJpg, fileName: 'img1.jpg' },
        { buffer: samplePng, fileName: 'img2.png' }
      ],
      onProgress: progressSpy
    });

    expect(progressSpy).toHaveBeenCalledWith(10);
    expect(progressSpy).toHaveBeenCalledWith(100);
    expect(progressSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects when images array is empty', async () => {
    await expect(imageToPdf({ images: [] })).rejects.toThrow(PdfValidationError);
  });

  it('rejects when image buffer is invalid or corrupt', async () => {
    const invalidBuffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(
      imageToPdf({
        images: [{ buffer: invalidBuffer, fileName: 'bad.jpg' }]
      })
    ).rejects.toThrow(PdfCorruptError);
  });

  it('aborts when signal is already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      imageToPdf({
        images: [{ buffer: sampleJpg }],
        signal: controller.signal
      })
    ).rejects.toThrow('Image to PDF conversion was cancelled.');
  });
});
