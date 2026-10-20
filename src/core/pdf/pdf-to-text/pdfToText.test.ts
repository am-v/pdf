import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { pdfToText } from './pdfToText';
import { PdfValidationError } from '../../shared';

const sample1Path = path.resolve(__dirname, '../../../../test-files/001-trivial/minimal-document.pdf');
const sample1Bytes = new Uint8Array(fs.readFileSync(sample1Path));

const sample4PagesPath = path.resolve(__dirname, '../../../../test-files/004-pdflatex-4-pages/pdflatex-4-pages.pdf');
const sample4PagesBytes = new Uint8Array(fs.readFileSync(sample4PagesPath));

describe('pdfToText (Core Operation)', () => {
  it('extracts plain text from a single-page document with headers and metrics', async () => {
    const result = await pdfToText({
      buffer: sample1Bytes,
      includePageHeaders: true
    });

    expect(result.pageCount).toBe(1);
    expect(result.text).toContain('--- Page 1 ---');
    expect(result.text).toContain('Lorem ipsum');
    expect(result.characterCount).toBeGreaterThan(200);
    expect(result.wordCount).toBeGreaterThan(40);
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[0].text).toContain('Lorem ipsum');
  });

  it('extracts plain text without headers when includePageHeaders is false', async () => {
    const result = await pdfToText({
      buffer: sample1Bytes,
      includePageHeaders: false
    });

    expect(result.text).not.toContain('--- Page 1 ---');
    expect(result.text).toContain('Lorem ipsum');
  });

  it('extracts text across multiple pages in a 4-page document', async () => {
    const result = await pdfToText({
      buffer: sample4PagesBytes,
      includePageHeaders: true
    });

    expect(result.pageCount).toBe(4);
    expect(result.pages).toHaveLength(4);
    expect(result.text).toContain('--- Page 1 ---');
    expect(result.text).toContain('--- Page 4 ---');
  });

  it('tracks progress callbacks from start to completion', async () => {
    const progressSpy = vi.fn();

    await pdfToText({
      buffer: sample4PagesBytes,
      onProgress: progressSpy
    });

    expect(progressSpy).toHaveBeenCalledWith(10);
    expect(progressSpy).toHaveBeenCalledWith(100);
    expect(progressSpy.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('rejects invalid or empty PDF buffers', async () => {
    const invalidBuffer = new Uint8Array([1, 2, 3, 4]);
    await expect(pdfToText({ buffer: invalidBuffer })).rejects.toThrow(PdfValidationError);
  });

  it('cancels execution when signal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      pdfToText({
        buffer: sample1Bytes,
        signal: controller.signal
      })
    ).rejects.toThrow('Text extraction was cancelled.');
  });
});
