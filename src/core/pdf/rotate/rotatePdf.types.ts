/**
 * Type definitions for Rotate PDF core operation.
 */

export interface RotatePdfOptions {
  /** Raw PDF binary data */
  buffer: Uint8Array;
  /** Optional map of 1-indexed page numbers to rotation degrees to add (e.g. { 1: 90, 2: 180 }) */
  rotations?: Record<number, number>;
  /** Optional global rotation degrees to add to all pages (e.g. 90, 180, 270) */
  globalRotation?: number;
  /** Optional base filename for diagnostics */
  fileName?: string;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface RotatePdfResult {
  /** Rotated PDF binary data */
  buffer: Uint8Array;
  /** Total number of pages in the document */
  pageCount: number;
  /** Number of pages that had rotation applied */
  rotatedPageCount: number;
  /** Total byte size of the output PDF */
  byteLength: number;
}
