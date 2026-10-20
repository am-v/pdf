import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { rotatePdf } from './rotatePdf';
import { createSamplePdf } from '../../../test-utils/pdf-generator';
import { PdfValidationError } from '../../shared';

describe('rotatePdf (Core Operation)', () => {
  it('correctly rotates specified pages by given degree offsets', async () => {
    const sample = await createSamplePdf({ pageCount: 3 });

    const result = await rotatePdf({
      buffer: sample,
      rotations: {
        1: 90,
        2: 180
      }
    });

    expect(result.pageCount).toBe(3);
    expect(result.rotatedPageCount).toBe(2);
    expect(result.buffer).toBeInstanceOf(Uint8Array);

    const verified = await PDFDocument.load(result.buffer);
    const pages = verified.getPages();
    expect(pages[0].getRotation().angle).toBe(90);
    expect(pages[1].getRotation().angle).toBe(180);
    expect(pages[2].getRotation().angle).toBe(0); // untouched
  });

  it('normalizes degrees exceeding 360 or negative degrees', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });

    const result = await rotatePdf({
      buffer: sample,
      rotations: {
        1: 450, // 450 % 360 = 90
        2: -90  // -90 + 360 = 270
      }
    });

    const verified = await PDFDocument.load(result.buffer);
    const pages = verified.getPages();
    expect(pages[0].getRotation().angle).toBe(90);
    expect(pages[1].getRotation().angle).toBe(270);
  });

  it('reports 0 rotated pages when rotations map has only 0 offsets', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });

    const result = await rotatePdf({
      buffer: sample,
      rotations: { 1: 0, 2: 0 }
    });

    expect(result.rotatedPageCount).toBe(0);
  });

  it('rejects an empty input buffer', async () => {
    await expect(
      rotatePdf({
        buffer: new Uint8Array(0),
        rotations: { 1: 90 }
      })
    ).rejects.toThrowError(PdfValidationError);
  });

  it('tracks progress via onProgress callback', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });
    const progressValues: number[] = [];

    const result = await rotatePdf({
      buffer: sample,
      rotations: { 1: 90, 2: 90 },
      onProgress: (p) => progressValues.push(p)
    });

    expect(result.pageCount).toBe(2);
    expect(progressValues.length).toBeGreaterThan(0);
    expect(progressValues[progressValues.length - 1]).toBe(100);
  });

  it('cancels immediately when AbortSignal is triggered', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });
    const controller = new AbortController();
    controller.abort();

    await expect(
      rotatePdf({
        buffer: sample,
        rotations: { 1: 90 },
        signal: controller.signal
      })
    ).rejects.toThrowError('Rotate operation was cancelled.');
  });
});
