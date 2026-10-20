/**
 * Core Color & Math Utilities
 * Pure functions for color conversions and geometry.
 */

import { PdfValidationError } from './errors';

export interface RgbColor {
  /** Red component in range [0, 1] */
  r: number;
  /** Green component in range [0, 1] */
  g: number;
  /** Blue component in range [0, 1] */
  b: number;
}

/**
 * Converts a hex color string (e.g., "#2563eb" or "2563eb" or "#fff")
 * to RGB components normalized between 0.0 and 1.0 (standard for pdf-lib rgb()).
 */
export function hexToRgb(hex: string): RgbColor {
  let cleanHex = hex.trim().replace(/^#/, '');

  // Handle shorthand 3-character hex (e.g. "abc" -> "aabbcc")
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }

  if (cleanHex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
    throw new PdfValidationError(`Invalid hex color string: "${hex}". Expected format "#RRGGBB".`);
  }

  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  return { r, g, b };
}

/**
 * Normalizes an angle in degrees to a positive value in range [0, 360).
 */
export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}
