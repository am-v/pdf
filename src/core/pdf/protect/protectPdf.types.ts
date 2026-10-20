/**
 * Type definitions for Protect PDF core operation.
 */

export interface ProtectPdfOptions {
  /** Raw PDF binary data */
  buffer: Uint8Array;
  /** Password required to open and decrypt the PDF document */
  password: string;
  /** Optional file name for diagnostics */
  fileName?: string;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface ProtectPdfResult {
  /** Encrypted PDF binary data */
  buffer: Uint8Array;
  /** Number of pages in the protected document */
  pageCount: number;
  /** Total byte size of the protected output */
  byteLength: number;
  /** Always true for protected output */
  isEncrypted: true;
}
