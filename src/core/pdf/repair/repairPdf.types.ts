/**
 * Type definitions for Repair PDF core operation.
 */

export interface RepairPdfOptions {
  /** Binary buffer of the PDF file to repair */
  buffer: Uint8Array;
  /** Optional file name for diagnostics */
  fileName?: string;
  /** Optional password if document is encrypted */
  password?: string;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel operation */
  signal?: AbortSignal;
}

export interface RepairPdfResult {
  /** Generated repaired PDF binary data */
  buffer: Uint8Array;
  /** Original file size */
  originalSize: number;
  /** Repaired file size */
  repairedSize: number;
  /** Number of readable pages recovered */
  pageCount: number;
  /** Which engine executed the repair */
  engineUsed: 'qpdf-wasm' | 'pdf-lib';
  /** Human-readable explanation of actions taken */
  repairNotes: string;
}
