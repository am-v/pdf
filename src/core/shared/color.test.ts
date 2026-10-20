import { describe, it, expect } from 'vitest';
import { hexToRgb, normalizeAngle } from './color';
import { PdfValidationError } from './errors';

describe('Color & Geometry Utilities', () => {
  describe('hexToRgb', () => {
    it('converts 6-digit hex color to normalized 0-1 RGB components', () => {
      const white = hexToRgb('#ffffff');
      expect(white).toEqual({ r: 1, g: 1, b: 1 });

      const black = hexToRgb('#000000');
      expect(black).toEqual({ r: 0, g: 0, b: 0 });

      const red = hexToRgb('#ff0000');
      expect(red).toEqual({ r: 1, g: 0, b: 0 });
    });

    it('supports 3-digit shorthand hex', () => {
      const blue = hexToRgb('#00f');
      expect(blue).toEqual({ r: 0, g: 0, b: 1 });
    });

    it('works without leading hash', () => {
      const green = hexToRgb('00ff00');
      expect(green).toEqual({ r: 0, g: 1, b: 0 });
    });

    it('rejects invalid hex strings', () => {
      expect(() => hexToRgb('invalid')).toThrowError(PdfValidationError);
      expect(() => hexToRgb('#12345')).toThrowError(PdfValidationError);
      expect(() => hexToRgb('#gggggg')).toThrowError(PdfValidationError);
    });
  });

  describe('normalizeAngle', () => {
    it('normalizes angles within 0-359', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(90)).toBe(90);
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(450)).toBe(90);
    });

    it('normalizes negative angles to positive equivalent', () => {
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(-180)).toBe(180);
      expect(normalizeAngle(-360)).toBe(0);
    });
  });
});
