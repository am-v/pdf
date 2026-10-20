/**
 * Type definitions for Unlock PDF core operation.
 */

export interface UnlockPdfOptions {
  /** Raw PDF binary data */
  buffer: Uint8Array;
  /** Password required to decrypt the PDF document */
  password?: string;
  /** Optional file name for diagnostics */
  fileName?: string;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface UnlockPdfResult {
  /** Unlocked PDF binary data */
  buffer: Uint8Array;
  /** Number of pages in the unlocked document */
  pageCount: number;
  /** Total byte size of output */
  byteLength: number;
  /** Whether the document had encryption removed or was already open */
  wasEncrypted: boolean;
}
