/**
 * Type definitions for Extract Images core operation.
 */

export interface ExtractedImageItem {
  /** 1-based index among all extracted images */
  index: number;
  /** 1-based page number where this image appeared */
  pageNumber: number;
  /** Suggested filename (e.g. "image-001.png") */
  fileName: string;
  /** MIME type (image/png) */
  mimeType: string;
  /** Pixel width */
  width: number;
  /** Pixel height */
  height: number;
  /** Binary buffer of the extracted PNG image */
  buffer: Uint8Array;
}

export interface ExtractImagesOptions {
  /** Binary buffer of the PDF file */
  buffer: Uint8Array;
  /** Optional password if document is encrypted */
  password?: string;
  /** Base filename prefix (default: 'image') */
  baseFileName?: string;
  /** Whether to bundle images into a ZIP archive (default: true) */
  generateZip?: boolean;
  /**
   * Optional custom image encoder for headless / testing environments
   */
  customEncoder?: (
    pixelData: Uint8Array | Uint8ClampedArray,
    width: number,
    height: number
  ) => Promise<Uint8Array>;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel operation */
  signal?: AbortSignal;
}

export interface ExtractImagesResult {
  /** Array of extracted images */
  images: ExtractedImageItem[];
  /** Bundled ZIP archive buffer (if generateZip is true and images > 0) */
  zipBuffer?: Uint8Array;
  /** Total count of extracted images */
  imageCount: number;
  /** Total pages scanned */
  pageCount: number;
}
