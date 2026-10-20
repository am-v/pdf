/**
 * Type definitions for Compress PDF core operation.
 */

export type CompressQuality = 'high' | 'medium' | 'low';
export type CompressMode = 'standard' | 'extreme';

export interface CompressPdfOptions {
  /** Binary buffer of the PDF file */
  buffer: Uint8Array;
  /** Optional password if document is encrypted */
  password?: string;
  /** Compression mode: 'standard' preserves vector text, 'extreme' achieves maximum size reduction */
  mode?: CompressMode;
  /** Target compression quality tier (default: 'medium') */
  quality?: CompressQuality;
  /**
   * Optional custom image re-encoder for testing / headless environments
   */
  customImageEncoder?: (
    imageBytes: Uint8Array,
    quality: number,
    maxDimension: number
  ) => Promise<Uint8Array | null>;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel operation */
  signal?: AbortSignal;
}

export interface CompressPdfResult {
  /** Generated compressed PDF binary data */
  buffer: Uint8Array;
  /** Original file size in bytes */
  originalSize: number;
  /** Compressed file size in bytes */
  compressedSize: number;
  /** Percentage reduced (e.g., 35.4 for 35.4% saved), or 0 if no reduction */
  reductionPercent: number;
  /** Number of pages in the output document */
  pageCount: number;
  /** Summary of actions taken */
  methodUsed: 'object-streams' | 'photo-condense' | 'page-raster';
}
