/**
 * Type definitions for Signature PDF core operation.
 */

export interface SignaturePlacement {
  /** Unique placement identifier */
  id: string;
  /** 1-indexed target page number */
  page: number;
  /** Visual X coordinate percentage from left edge (0 to 100) */
  x: number;
  /** Visual Y coordinate percentage from top edge (0 to 100) */
  y: number;
  /** Width percentage relative to the page's visual width (5 to 100) */
  size: number;
  /** Binary buffer of the signature image (PNG or JPEG) */
  imageBuffer: Uint8Array;
  /** Optional deduplication key to avoid embedding the same image multiple times */
  imageKey?: string;
}

export interface SignPdfOptions {
  /** Raw PDF binary data */
  buffer: Uint8Array;
  /** List of signatures to stamp onto pages */
  placements: SignaturePlacement[];
  /** Optional file name for diagnostics */
  fileName?: string;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface SignPdfResult {
  /** Output PDF binary data */
  buffer: Uint8Array;
  /** Total number of pages in the document */
  pageCount: number;
  /** Number of signatures successfully placed */
  placedSignatureCount: number;
  /** Total byte size of output */
  byteLength: number;
}
