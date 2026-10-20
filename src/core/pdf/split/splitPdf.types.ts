/**
 * Type definitions for Split PDF core operation.
 */

export type SplitMode = 'single' | 'individual';

export interface SplitPdfOptions {
  /** Raw PDF binary data */
  buffer: Uint8Array;
  /** 1-indexed list of page numbers to extract (e.g. [1, 2, 4]) */
  selectedPages: number[];
  /** 'single' combines pages into one PDF; 'individual' exports each page separately (bundled into a zip archive) */
  mode?: SplitMode;
  /** Optional base filename for exported files (default: 'split') */
  fileName?: string;
  /** Optional execution progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface SplitSingleResult {
  mode: 'single';
  buffer: Uint8Array;
  pageCount: number;
  originalPageCount: number;
  byteLength: number;
}

export interface SplitIndividualResult {
  mode: 'individual';
  files: Array<{ name: string; buffer: Uint8Array; pageNumber: number }>;
  zipBuffer?: Uint8Array;
  pageCount: number;
  originalPageCount: number;
  byteLength: number;
}

export type SplitPdfResult = SplitSingleResult | SplitIndividualResult;
