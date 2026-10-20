/**
 * Type definitions for PDF to Image core operation.
 */

export type PdfToImageFormat = 'png' | 'jpeg';
export type PdfToImageDpi = 72 | 150 | 300;

export interface PdfImagePageItem {
  /** 1-based page number */
  pageNumber: number;
  /** Binary buffer of the rendered image */
  buffer: Uint8Array;
  /** Suggested filename for this page */
  fileName: string;
  /** MIME type (image/png or image/jpeg) */
  mimeType: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

export interface PdfToImageOptions {
  /** Binary buffer of the PDF file */
  buffer: Uint8Array;
  /** Optional password if the document is protected */
  password?: string;
  /** Target image format (default: 'png') */
  format?: PdfToImageFormat;
  /** Target resolution DPI (72, 150, 300; default: 150) */
  dpi?: PdfToImageDpi;
  /** Compression quality for JPEG (0.1 - 1.0; default: 0.85) */
  quality?: number;
  /** Optional list of 1-based page numbers to convert (defaults to all pages) */
  pages?: number[];
  /** Optional base filename for generated images */
  baseFileName?: string;
  /** Whether to bundle output into a ZIP archive (default: true) */
  generateZip?: boolean;
  /**
   * Optional custom renderer abstraction (allows headless/node testing or custom web workers)
   */
  customRenderer?: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    page: any,
    scale: number,
    format: PdfToImageFormat,
    quality: number
  ) => Promise<{ buffer: Uint8Array; width: number; height: number }>;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel operation */
  signal?: AbortSignal;
}

export interface PdfToImageResult {
  /** List of rendered image items per page */
  images: PdfImagePageItem[];
  /** Bundled ZIP archive buffer (if generateZip is true) */
  zipBuffer?: Uint8Array;
  /** Total count of pages rendered */
  pageCount: number;
}
