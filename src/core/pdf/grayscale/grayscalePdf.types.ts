/**
 * Type definitions for Grayscale PDF core operation.
 */

export interface GrayscalePdfOptions {
  /** Binary buffer of the PDF file */
  buffer: Uint8Array;
  /** Optional password if document is encrypted */
  password?: string;
  /** Rendering resolution scale factor (default: 1.5) */
  scale?: number;
  /** Output JPEG quality for desaturated pages (0.1 - 1.0; default: 0.8) */
  quality?: number;
  /**
   * Optional custom renderer for headless / testing environments
   */
  customRenderer?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    page: any,
    scale: number,
    quality: number
  ) => Promise<{ buffer: Uint8Array; width: number; height: number }>;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel operation */
  signal?: AbortSignal;
}

export interface GrayscalePdfResult {
  /** Generated desaturated grayscale PDF binary data */
  buffer: Uint8Array;
  /** Total count of pages processed */
  pageCount: number;
  /** Output file byte length */
  byteLength: number;
}
