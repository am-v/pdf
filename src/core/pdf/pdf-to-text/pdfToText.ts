/**
 * Standalone Functional Core Module: PDF to Text
 * Pure framework-independent TypeScript operation using pdfjs-dist.
 */

import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError,
  PdfPasswordError,
  getPdfjs
} from '../../shared';
import type { PdfToTextOptions, PdfToTextResult, PageTextItem } from './pdfToText.types';

/**
 * Extracts plain text from all pages of a PDF document.
 *
 * @param options PdfToTextOptions with PDF binary data, optional password, and format settings.
 * @returns Promise resolving to PdfToTextResult with text content and metrics.
 * @throws {PdfValidationError} If input is invalid.
 * @throws {PdfPasswordError} If document is encrypted and password is wrong.
 * @throws {PdfCorruptError} If document cannot be parsed.
 */
export async function pdfToText(options: PdfToTextOptions): Promise<PdfToTextResult> {
  const {
    buffer,
    password,
    includePageHeaders = true,
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Text extraction was cancelled.');
  }

  validatePdfBuffer(buffer, 'PDF buffer');

  if (onProgress) onProgress(10);

  const pdfjs = await getPdfjs();

  // Make an independent slice so pdfjs worker transfer does not detach caller's buffer
  const safeBuffer = buffer.slice(0);

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
      throw new PdfValidationError('Text extraction was cancelled.');
    }
    const msg = String(err instanceof Error ? err.message : err);
    if (/password/i.test(msg)) {
      throw new PdfPasswordError('PASSWORD_REQUIRED', 'This PDF is password-protected or the password provided is incorrect.', err);
    }
    throw new PdfCorruptError(`Failed to parse PDF document for text extraction: ${msg}`, err);
  }

  const numPages: number = pdfDoc.numPages;
  if (numPages <= 0) {
    throw new PdfCorruptError('The document contains no readable pages.');
  }

  const pages: PageTextItem[] = [];
  const fullTextParts: string[] = [];

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (signal?.aborted) {
        throw new PdfValidationError('Text extraction was cancelled.');
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Extract string chunks and join them naturally
        const pageStrings: string[] = [];
        for (const item of textContent.items) {
          if ('str' in item && typeof item.str === 'string') {
            pageStrings.push(item.str);
          }
        }

        // Join items with single spaces and normalize multiple consecutive spaces
        const rawText = pageStrings.join(' ').replace(/[ \t]+/g, ' ').trim();

        pages.push({
          pageNumber: pageNum,
          text: rawText
        });

        if (includePageHeaders) {
          fullTextParts.push(`--- Page ${pageNum} ---\n${rawText}`);
        } else {
          fullTextParts.push(rawText);
        }

        // Cleanup page resources in pdfjs
        try {
          page.cleanup();
        } catch {
          // ignore
        }
      } catch (err: unknown) {
        console.warn(`Could not extract text from page ${pageNum}:`, err);
        pages.push({
          pageNumber: pageNum,
          text: ''
        });
        if (includePageHeaders) {
          fullTextParts.push(`--- Page ${pageNum} ---\n[Unreadable text]`);
        }
      }

      if (onProgress) {
        const pct = Math.round(10 + (pageNum / numPages) * 85);
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

  const combinedText = fullTextParts.join('\n\n').trim();
  const wordCount = combinedText.length > 0 ? combinedText.split(/\s+/).filter(Boolean).length : 0;

  if (onProgress) onProgress(100);

  return {
    text: combinedText,
    pageCount: numPages,
    characterCount: combinedText.length,
    wordCount,
    pages
  };
}
