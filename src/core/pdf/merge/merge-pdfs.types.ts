/**
 * Type definitions for Merge PDFs core operation.
 */

export interface MergeInputItem {
  /** Raw PDF binary data */
  buffer: Uint8Array;
  /** Optional rotation offset in degrees to apply to all pages of this document (0, 90, 180, 270) */
  rotation?: number;
  /** Optional human-readable file name for diagnostics and error messages */
  name?: string;
}

export interface MergePdfsOptions {
  /** Optional callback for tracking execution progress (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface MergePdfsResult {
  /** Merged PDF binary data */
  buffer: Uint8Array;
  /** Total number of pages in the merged document */
  pageCount: number;
  /** Number of source documents merged */
  documentCount: number;
  /** Total byte size of the merged PDF */
  byteLength: number;
}
