/**
 * Type definitions for Page Numbers core operation.
 */

export type PageNumberPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface PageNumberOptions {
  /** Raw PDF binary data */
  buffer: Uint8Array;
  /** Template format, e.g. '{n}', 'Page {n} of {total}', 'p. {n}/{total}' */
  format?: string;
  /** Position anchor on page */
  position?: PageNumberPosition;
  /** Starting number offset (default: 1) */
  startFrom?: number;
  /** Font size in pt (default: 12) */
  fontSize?: number;
  /** Text color in 6-digit hex format (default: '#6B7280') */
  colorHex?: string;
  /** Margin from page edge in pt (default: 30) */
  margin?: number;
  /** Optional array of 1-indexed page numbers to number (defaults to all pages) */
  pagesToNumber?: number[];
  /** Optional file name for diagnostic reporting */
  fileName?: string;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface PageNumberResult {
  /** Output PDF binary data */
  buffer: Uint8Array;
  /** Total number of pages in the document */
  pageCount: number;
  /** Number of pages that were stamped with page numbers */
  numberedPageCount: number;
  /** Total byte size of output */
  byteLength: number;
}
