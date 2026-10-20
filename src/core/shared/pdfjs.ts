/**
 * PDF.js dynamic loader and environment adapter.
 * Handles worker initialization for Vite in browser and fallback for Node/Vitest.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedPdfjs: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getPdfjs(): Promise<any> {
  if (cachedPdfjs) return cachedPdfjs;

  let lib: any;
  if (typeof window === 'undefined') {
    // Node.js / Vitest testing environment: use legacy build without DOM dependencies
    lib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } else {
    // Browser environment
    lib = await import('pdfjs-dist');
    try {
      // In Vite, worker can be imported as asset URL
      const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      if (workerMod?.default) {
        lib.GlobalWorkerOptions.workerSrc = workerMod.default;
      }
    } catch (err) {
      console.warn('Could not set pdf.worker.min.mjs via Vite asset URL:', err);
    }
  }

  cachedPdfjs = lib;
  return lib;
}
