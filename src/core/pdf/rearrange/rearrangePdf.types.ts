/**
 * Type definitions for Rearrange PDF core operation.
 */

export interface RearrangePdfOptions {
  /** Raw PDF binary data */
  buffer: Uint8Array;
  /** Array of 0-indexed page numbers in the desired sequence (e.g. [2, 0, 1]) */
  pageOrder: number[];
  /** Optional base filename for diagnostics */
  fileName?: string;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface RearrangePdfResult {
  /** Reordered PDF binary data */
  buffer: Uint8Array;
  /** Number of pages in the output PDF */
  pageCount: number;
  /** Number of pages in the original PDF */
  originalPageCount: number;
  /** Total byte size of the output PDF */
  byteLength: number;
}
