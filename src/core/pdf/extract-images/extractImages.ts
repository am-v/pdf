/**
 * Standalone Functional Core Module: Extract Images
 * Framework-independent pure TypeScript operation using pdfjs-dist and JSZip.
 */

import JSZip from 'jszip';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError,
  PdfPasswordError,
  getPdfjs
} from '../../shared';
import type {
  ExtractImagesOptions,
  ExtractImagesResult,
  ExtractedImageItem
} from './extractImages.types';

/**
 * Encodes raw pixel data into PNG format using browser HTML Canvas.
 */
async function defaultCanvasEncoder(
  pixelData: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number
): Promise<Uint8Array> {
  if (typeof document === 'undefined') {
    throw new PdfValidationError(
      'HTML Canvas is not available in this environment. Provide customEncoder for headless testing.'
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new PdfCorruptError('Failed to obtain 2D canvas context for image extraction.');
  }

  const imgData = ctx.createImageData(width, height);
  const totalPixels = width * height;

  if (pixelData.length === totalPixels * 4) {
    // Already RGBA
    imgData.data.set(pixelData);
  } else if (pixelData.length === totalPixels * 3) {
    // RGB -> RGBA
    let srcIdx = 0;
    let dstIdx = 0;
    for (let i = 0; i < totalPixels; i++) {
      imgData.data[dstIdx] = pixelData[srcIdx];
      imgData.data[dstIdx + 1] = pixelData[srcIdx + 1];
      imgData.data[dstIdx + 2] = pixelData[srcIdx + 2];
      imgData.data[dstIdx + 3] = 255;
      srcIdx += 3;
      dstIdx += 4;
    }
  } else if (pixelData.length === totalPixels) {
    // 1-channel Grayscale -> RGBA
    let dstIdx = 0;
    for (let i = 0; i < totalPixels; i++) {
      const v = pixelData[i];
      imgData.data[dstIdx] = v;
      imgData.data[dstIdx + 1] = v;
      imgData.data[dstIdx + 2] = v;
      imgData.data[dstIdx + 3] = 255;
      dstIdx += 4;
    }
  } else {
    // Best-effort slice
    imgData.data.set(pixelData.subarray(0, imgData.data.length));
  }

  ctx.putImageData(imgData, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to encode image to PNG blob'));
    }, 'image/png');
  });

  const arrayBuf = await blob.arrayBuffer();
  canvas.width = 0;
  canvas.height = 0;

  return new Uint8Array(arrayBuf);
}

/**
 * Extracts all embedded raster images from a PDF document and bundles them into a ZIP archive.
 *
 * @param options ExtractImagesOptions configuring PDF buffer, output naming, and progress callback.
 * @returns Promise resolving to ExtractImagesResult with list of extracted images and ZIP buffer.
 */
export async function extractImages(options: ExtractImagesOptions): Promise<ExtractImagesResult> {
  const {
    buffer,
    password,
    baseFileName = 'image',
    generateZip = true,
    customEncoder,
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Image extraction was cancelled.');
  }

  validatePdfBuffer(buffer, 'PDF buffer');

  if (onProgress) onProgress(10);

  const pdfjs = await getPdfjs();
  const safeBuffer = buffer.slice(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfDoc: any;
  try {
    const loadingTask = pdfjs.getDocument({
      data: safeBuffer,
      password: password || undefined,
      disableFontFace: true,
      stopAtErrors: false
    });

    if (signal) {
      signal.addEventListener('abort', () => {
        try {
          loadingTask.destroy();
        } catch {
          // ignore
        }
      });
    }

    pdfDoc = await loadingTask.promise;
  } catch (err: unknown) {
    if (signal?.aborted) {
      throw new PdfValidationError('Image extraction was cancelled.');
    }
    const msg = String(err instanceof Error ? err.message : err);
    if (/password/i.test(msg)) {
      throw new PdfPasswordError('PASSWORD_REQUIRED', 'This PDF is password-protected or the password provided is incorrect.', err);
    }
    throw new PdfCorruptError(`Failed to parse PDF document for image extraction: ${msg}`, err);
  }

  const numPages: number = pdfDoc.numPages;
  if (numPages <= 0) {
    throw new PdfCorruptError('The document contains no readable pages.');
  }

  const encoder = customEncoder || defaultCanvasEncoder;
  const extractedImages: ExtractedImageItem[] = [];
  const processedKeys = new Set<string>();

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (signal?.aborted) {
        throw new PdfValidationError('Image extraction was cancelled.');
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const opList = await page.getOperatorList();

        for (let j = 0; j < opList.argsArray.length; j++) {
          if (signal?.aborted) {
            throw new PdfValidationError('Image extraction was cancelled.');
          }

          const depName = opList.argsArray[j]?.[0];
          if (typeof depName === 'string' && (depName.startsWith('img_') || depName.startsWith('g_img_'))) {
            // Deduplicate by depName + page
            const key = `${pageNum}_${depName}`;
            if (processedKeys.has(key)) continue;
            processedKeys.add(key);

            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const imgObj: any = await new Promise((resolve) => {
                page.objs.get(depName, (obj: unknown) => resolve(obj));
              });

              if (imgObj && imgObj.data && imgObj.width > 0 && imgObj.height > 0) {
                const imageIndex = extractedImages.length + 1;
                const pngBytes = await encoder(imgObj.data, imgObj.width, imgObj.height);

                const padLen = Math.max(3, String(imageIndex).length);
                const fileName = `${baseFileName}-${String(imageIndex).padStart(padLen, '0')}.png`;

                extractedImages.push({
                  index: imageIndex,
                  pageNumber: pageNum,
                  fileName,
                  mimeType: 'image/png',
                  width: imgObj.width,
                  height: imgObj.height,
                  buffer: pngBytes
                });
              }
            } catch (innerErr) {
              console.warn(`Could not extract image object ${depName} on page ${pageNum}:`, innerErr);
            }
          }
        }

        try {
          page.cleanup();
        } catch {
          // ignore
        }
      } catch (err: unknown) {
        console.warn(`Could not scan page ${pageNum} for images:`, err);
      }

      if (onProgress) {
        const pct = Math.round(10 + (pageNum / numPages) * 75);
        onProgress(pct);
      }
    }
  } finally {
    try {
      await pdfDoc.destroy();
    } catch {
      // ignore
    }
  }

  let zipBuffer: Uint8Array | undefined;
  if (generateZip && extractedImages.length > 0) {
    const zip = new JSZip();
    for (const img of extractedImages) {
      zip.file(img.fileName, img.buffer);
    }
    const zipData = await zip.generateAsync({ type: 'uint8array' });
    zipBuffer = zipData;
  }

  if (onProgress) onProgress(100);

  return {
    images: extractedImages,
    zipBuffer,
    imageCount: extractedImages.length,
    pageCount: numPages
  };
}
