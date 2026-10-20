/**
 * Type definitions for PDF to Text core operation.
 */

export interface PageTextItem {
  pageNumber: number;
  text: string;
}

export interface PdfToTextOptions {
  /** Binary buffer of the PDF file */
  buffer: Uint8Array;
  /** Optional password if the document is encrypted */
  password?: string;
  /** Whether to format each page with a header like "--- Page 1 ---" (default: true) */
  includePageHeaders?: boolean;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel operation */
  signal?: AbortSignal;
}

export interface PdfToTextResult {
  /** Full concatenated text of the PDF document */
  text: string;
  /** Total number of pages extracted */
  pageCount: number;
  /** Total character count (excluding or including whitespace) */
  characterCount: number;
  /** Total word count */
  wordCount: number;
  /** Detailed per-page text list */
  pages: PageTextItem[];
}
