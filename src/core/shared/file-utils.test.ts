import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { formatBytes, arrayBufferToUint8Array, uint8ArrayToArrayBuffer, dataUrlToUint8Array, readPdfPageCount } from './file-utils';

describe('File & Binary Utilities', () => {
  describe('formatBytes', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('formats bytes, kilobytes, and megabytes', () => {
      expect(formatBytes(500)).toBe('500 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(2621440)).toBe('2.5 MB');
    });
  });

  describe('arrayBufferToUint8Array and uint8ArrayToArrayBuffer', () => {
    it('converts between ArrayBuffer and Uint8Array', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setUint8(0, 10);
      view.setUint8(1, 20);

      const uint8 = arrayBufferToUint8Array(buffer);
      expect(uint8[0]).toBe(10);
      expect(uint8[1]).toBe(20);

      const back = uint8ArrayToArrayBuffer(uint8);
      expect(back.byteLength).toBe(4);
    });
  });

  describe('dataUrlToUint8Array', () => {
    it('decodes base64 data url into raw bytes', () => {
      // "Hello" in base64 is "SGVsbG8="
      const dataUrl = 'data:text/plain;base64,SGVsbG8=';
      const bytes = dataUrlToUint8Array(dataUrl);
      expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });
  });

  describe('readPdfPageCount', () => {
    it('correctly reads page count from PDF bytes', async () => {
      const doc = await PDFDocument.create();
      doc.addPage([100, 100]);
      doc.addPage([100, 100]);
      const bytes = await doc.save();
      const count = await readPdfPageCount(bytes);
      expect(count).toBe(2);
    });
  });
});

