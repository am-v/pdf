import { describe, it, expect } from 'vitest';
import { validatePdfBuffer, validatePageRange, validatePageNumber, validateNonEmptyFiles } from './validation';
import { PdfValidationError } from './errors';

describe('Validation Utilities', () => {
  describe('validatePdfBuffer', () => {
    it('accepts a valid PDF buffer with %PDF- header', () => {
      // ASCII "%PDF-1.7"
      const validHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
      expect(() => validatePdfBuffer(validHeader, 'valid.pdf')).not.toThrow();
    });

    it('rejects an empty buffer', () => {
      expect(() => validatePdfBuffer(new Uint8Array(0), 'empty.pdf')).toThrowError(PdfValidationError);
    });

    it('rejects a buffer without %PDF- magic bytes', () => {
      const invalidHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]); // PNG header
      expect(() => validatePdfBuffer(invalidHeader, 'image.png')).toThrowError(
        'does not appear to be a valid PDF'
      );
    });
  });

  describe('validateNonEmptyFiles', () => {
    const validHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

    it('accepts non-empty file arrays satisfying minimum count', () => {
      const files = [
        { buffer: validHeader, name: 'file1.pdf' },
        { buffer: validHeader, name: 'file2.pdf' }
      ];
      expect(() => validateNonEmptyFiles(files, 2)).not.toThrow();
    });

    it('rejects fewer files than minimum count', () => {
      const files = [{ buffer: validHeader, name: 'file1.pdf' }];
      expect(() => validateNonEmptyFiles(files, 2)).toThrowError(PdfValidationError);
    });
  });

  describe('validatePageNumber', () => {
    it('accepts valid 1-indexed page within range', () => {
      expect(() => validatePageNumber(1, 5)).not.toThrow();
      expect(() => validatePageNumber(5, 5)).not.toThrow();
    });

    it('rejects 0 or negative page numbers', () => {
      expect(() => validatePageNumber(0, 5)).toThrowError(PdfValidationError);
      expect(() => validatePageNumber(-1, 5)).toThrowError(PdfValidationError);
    });

    it('rejects page numbers exceeding maxPages', () => {
      expect(() => validatePageNumber(6, 5)).toThrowError(PdfValidationError);
    });
  });

  describe('validatePageRange', () => {
    it('parses valid single numbers and comma separated values', () => {
      expect(validatePageRange('1, 3, 5', 5)).toEqual([1, 3, 5]);
    });

    it('parses ranges like "1-3, 5"', () => {
      expect(validatePageRange('1-3, 5', 5)).toEqual([1, 2, 3, 5]);
    });

    it('sorts and deduplicates page numbers', () => {
      expect(validatePageRange('4, 2, 2-3', 5)).toEqual([2, 3, 4]);
    });

    it('rejects out of bounds page numbers in ranges', () => {
      expect(() => validatePageRange('1-6', 5)).toThrowError('exceeds total pages (5)');
    });

    it('rejects invalid range syntax where start > end', () => {
      expect(() => validatePageRange('5-2', 5)).toThrowError('Range start cannot be greater than end');
    });

    it('rejects empty strings', () => {
      expect(() => validatePageRange('', 5)).toThrowError(PdfValidationError);
      expect(() => validatePageRange('   ', 5)).toThrowError(PdfValidationError);
    });
  });
});
