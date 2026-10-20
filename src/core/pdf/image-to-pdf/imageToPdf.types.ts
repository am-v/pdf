/**
 * Type definitions for Image to PDF core operation.
 */

export interface ImageToPdfItem {
  /** Binary buffer of the image (JPEG, PNG) */
  buffer: Uint8Array;
  /** Optional file name for diagnostics */
  fileName?: string;
  /** Optional mime type */
  mimeType?: string;
}

export type ImageToPdfPageSize = 'fit-image' | 'a4' | 'letter';
export type ImageToPdfOrientation = 'auto' | 'portrait' | 'landscape';

export interface ImageToPdfOptions {
  /** Ordered list of image items to convert */
  images: ImageToPdfItem[];
  /** Page dimensions ('fit-image' creates page sized to image, 'a4' or 'letter' uses standard page) */
  pageSize?: ImageToPdfPageSize;
  /** Page orientation */
  orientation?: ImageToPdfOrientation;
  /** Margin around image in pt (default: 0) */
  margin?: number;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface ImageToPdfResult {
  /** Generated PDF binary data */
  buffer: Uint8Array;
  /** Number of pages in the output PDF */
  pageCount: number;
  /** Total byte size of output */
  byteLength: number;
}
