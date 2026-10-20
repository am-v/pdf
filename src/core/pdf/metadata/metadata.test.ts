import { describe, it, expect, vi } from 'vitest';
import { readPdfMetadata, updatePdfMetadata } from './metadata';
import { createSamplePdf } from '../../../test-utils/pdf-generator';
import { PdfValidationError, PdfCorruptError } from '../../shared';

describe('metadata (Core Operation)', () => {
  it('reads metadata from a PDF document', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });
    const result = await readPdfMetadata(sample);

    expect(result.pageCount).toBe(2);
    expect(result.metadata).toBeDefined();
    expect(typeof result.metadata.title).toBe('string');
  });

  it('updates metadata fields successfully', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });

    const result = await updatePdfMetadata({
      buffer: sample,
      metadata: {
        title: 'New Document Title',
        author: 'Jane Doe',
        subject: 'Confidential Report',
        keywords: 'finance, audit, 2026',
        creator: 'pdf.com.in Professional Toolkit'
      }
    });

    expect(result.pageCount).toBe(2);
    expect(result.isWiped).toBe(false);
    expect(result.metadata.title).toBe('New Document Title');
    expect(result.metadata.author).toBe('Jane Doe');
    expect(result.metadata.subject).toBe('Confidential Report');

    // Read back to verify serialization
    const readBack = await readPdfMetadata(result.buffer);
    expect(readBack.metadata.title).toBe('New Document Title');
    expect(readBack.metadata.author).toBe('Jane Doe');
  });

  it('performs a deep-clean privacy wipe of all metadata tags', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });

    // First assign some metadata
    const updated = await updatePdfMetadata({
      buffer: sample,
      metadata: {
        title: 'Secret Title',
        author: 'Secret Author'
      }
    });

    // Wipe it
    const wiped = await updatePdfMetadata({
      buffer: updated.buffer,
      wipe: true
    });

    expect(wiped.isWiped).toBe(true);
    expect(wiped.metadata.title).toBe('');
    expect(wiped.metadata.author).toBe('');

    // Verify wiped document
    const readBack = await readPdfMetadata(wiped.buffer);
    expect(readBack.metadata.title).toBe('');
    expect(readBack.metadata.author).toBe('');
  });

  it('reports progress incrementally up to 100%', async () => {
    const sample = await createSamplePdf({ pageCount: 2 });
    const progressSpy = vi.fn();

    await updatePdfMetadata({
      buffer: sample,
      metadata: { title: 'Test' },
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
      updatePdfMetadata({
        buffer: sample,
        metadata: { title: 'Test' },
        signal: controller.signal
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects too small buffer with PdfValidationError', async () => {
    await expect(
      readPdfMetadata(new Uint8Array([1, 2, 3]))
    ).rejects.toThrow(PdfValidationError);

    await expect(
      updatePdfMetadata({
        buffer: new Uint8Array([1, 2, 3]),
        metadata: { title: 'Test' }
      })
    ).rejects.toThrow(PdfValidationError);
  });

  it('rejects corrupt PDF body with PdfCorruptError', async () => {
    const corruptWithHeader = new TextEncoder().encode('%PDF-1.4\ncorrupted metadata test');
    await expect(
      readPdfMetadata(corruptWithHeader)
    ).rejects.toThrow(PdfCorruptError);
  });
});
