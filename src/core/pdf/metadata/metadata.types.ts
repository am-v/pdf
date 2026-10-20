/**
 * Type definitions for PDF Metadata inspection, modification, and privacy wiping.
 */

export interface PdfMetadata {
  /** Document title */
  title?: string;
  /** Document author / creator name */
  author?: string;
  /** Document subject or summary */
  subject?: string;
  /** Comma-separated or array of document keywords */
  keywords?: string;
  /** Application or agent that created the original document */
  creator?: string;
  /** PDF producer engine (e.g. Acrobat Distiller, pdf-lib) */
  producer?: string;
  /** Document creation timestamp */
  creationDate?: Date;
  /** Document last modification timestamp */
  modificationDate?: Date;
}

export interface ReadMetadataResult {
  /** Parsed metadata dictionary */
  metadata: PdfMetadata;
  /** Total number of pages */
  pageCount: number;
  /** Total byte size */
  byteLength: number;
}

export interface UpdateMetadataOptions {
  /** Raw PDF binary data */
  buffer: Uint8Array;
  /** Metadata fields to set or update */
  metadata?: Partial<PdfMetadata>;
  /** If true, deep-cleans and purges all metadata tags and catalog XML streams */
  wipe?: boolean;
  /** Optional file name for diagnostics */
  fileName?: string;
  /** Optional progress callback (0 to 100) */
  onProgress?: (progressPercent: number) => void;
  /** Optional AbortSignal to cancel execution */
  signal?: AbortSignal;
}

export interface UpdateMetadataResult {
  /** Updated PDF binary data */
  buffer: Uint8Array;
  /** Resulting metadata after update or wipe */
  metadata: PdfMetadata;
  /** Number of pages in the output document */
  pageCount: number;
  /** Total byte size of output */
  byteLength: number;
  /** Whether deep-clean wiping was performed */
  isWiped: boolean;
}
