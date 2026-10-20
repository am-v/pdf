/**
 * Type definitions for Watermark PDF core operation.
 */

export interface WatermarkPdfOptions {
  /** Raw PDF binary data */
  buffer: Uint8Array;
  /** Watermark text string to stamp */
  text: string;
  /** Opacity level between 0.0 (transparent) and 1.0 (opaque). Default: 0.3 */
  opacity?: number;
  /** Font size in pt. Default: 48 */
  fontSize?: number;
  /** Rotation angle in degrees (clockwise positive relative to preview). Default: 45 */
  rotation?: number;
  /** Watermark color in hex format (e.g. '#000000'). Default: '#000000' */
  colorHex?: string;
  /** Optional array of 1-indexed page numbers to watermark (defaults to all) */
  pagesToWatermark?: number[];
  /** Optional file name for diagnostics */
  fileName?: string;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface WatermarkPdfResult {
  /** Output PDF binary data */
  buffer: Uint8Array;
  /** Total number of pages in the document */
  pageCount: number;
  /** Number of pages that were stamped with the watermark */
  watermarkedPageCount: number;
  /** Total byte size of output */
  byteLength: number;
}
