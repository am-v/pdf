/**
 * Core Binary & File Utilities
 * Framework-independent helpers for converting and formatting binary data.
 */

/**
 * Converts an ArrayBuffer to a Uint8Array safely without copying if possible.
 */
export function arrayBufferToUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

/**
 * Extracts the underlying ArrayBuffer slice from a Uint8Array.
 */
export function uint8ArrayToArrayBuffer(uint8: Uint8Array): ArrayBuffer {
  if (uint8.byteOffset === 0 && uint8.byteLength === uint8.buffer.byteLength) {
    return uint8.buffer as ArrayBuffer;
  }
  return uint8.buffer.slice(uint8.byteOffset, uint8.byteOffset + uint8.byteLength) as ArrayBuffer;
}

/**
 * Converts a Blob to a Uint8Array.
 */
export async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

/**
 * Converts a Uint8Array to a Blob.
 */
export function uint8ArrayToBlob(uint8: Uint8Array, mimeType = 'application/pdf'): Blob {
  return new Blob([uint8 as BlobPart], { type: mimeType });
}

/**
 * Converts a base64 Data URL to a Uint8Array.
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64Index = dataUrl.indexOf(',');
  const base64 = base64Index >= 0 ? dataUrl.slice(base64Index + 1) : dataUrl;
  
  if (typeof atob === 'function') {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  
  // Node.js fallback
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Formats a byte count into a human-readable string (e.g. "1.25 MB").
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

/**
 * Safely inspects the page count of a PDF document without requiring components to import pdf-lib.
 */
export async function readPdfPageCount(buffer: Uint8Array): Promise<number> {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
  return doc.getPageCount();
}

