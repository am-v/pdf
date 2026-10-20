import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { splitPdf } from '../core/pdf/split/splitPdf';
import { rotatePdf } from '../core/pdf/rotate/rotatePdf';
import { pageNumbers } from '../core/pdf/page-numbers/pageNumbers';
import { watermarkPdf } from '../core/pdf/watermark/watermarkPdf';
import { pdfToText } from '../core/pdf/pdf-to-text/pdfToText';
import { compressPdf } from '../core/pdf/compress/compressPdf';
import { mergePdfs } from '../core/pdf/merge/merge-pdfs';
import { rearrangePdf } from '../core/pdf/rearrange/rearrangePdf';
import { imageToPdf } from '../core/pdf/image-to-pdf/imageToPdf';
import { updatePdfMetadata, readPdfMetadata } from '../core/pdf/metadata/metadata';
import { repairPdf } from '../core/pdf/repair/repairPdf';
import { unlockPdf } from '../core/pdf/unlock/unlockPdf';
import { PdfValidationError, validatePageRange } from '../core/shared';

const testFilesDir = path.resolve(__dirname, '../../test-files');

const loadFile = (relPath: string): Uint8Array => {
  return new Uint8Array(fs.readFileSync(path.join(testFilesDir, relPath)));
};

describe('Phase 5: Real-World Document Regression & Stress Test Suite', () => {
  const largePdfBytes = loadFile('large_pdf.pdf');

  describe('167-Page Heavy Document Stress Testing', () => {
    it('verifies large_pdf.pdf page count and integrity', async () => {
      const doc = await PDFDocument.load(largePdfBytes, { ignoreEncryption: true });
      expect(doc.getPageCount()).toBe(167);
    });

    it('splits page ranges from a 167-page document into a compact subset', async () => {
      const selectedPages = validatePageRange('1-5, 50, 100-102', 167);
      const result = await splitPdf({
        buffer: largePdfBytes,
        selectedPages,
        mode: 'single'
      });

      expect(result.pageCount).toBe(9); // 5 + 1 + 3 = 9 pages
      if (result.mode === 'single') {
        const outDoc = await PDFDocument.load(result.buffer);
        expect(outDoc.getPageCount()).toBe(9);
      }
    });

    it('rotates all pages across 167-page document cleanly', async () => {
      const result = await rotatePdf({
        buffer: largePdfBytes,
        globalRotation: 90
      });

      expect(result.pageCount).toBe(167);
      const outDoc = await PDFDocument.load(result.buffer);
      expect(outDoc.getPage(0).getRotation().angle).toBe(90);
      expect(outDoc.getPage(166).getRotation().angle).toBe(90);
    });

    it('stamps dynamic page numbers on all 167 pages', async () => {
      const result = await pageNumbers({
        buffer: largePdfBytes,
        position: 'bottom-center',
        format: 'Page {n} of {total}',
        fontSize: 10
      });

      expect(result.pageCount).toBe(167);
      const outDoc = await PDFDocument.load(result.buffer);
      expect(outDoc.getPageCount()).toBe(167);
    });

    it('stamps custom watermark across all 167 pages', async () => {
      const result = await watermarkPdf({
        buffer: largePdfBytes,
        text: 'CONFIDENTIAL ARCHIVE',
        opacity: 0.15,
        rotation: 45
      });

      expect(result.pageCount).toBe(167);
      const outDoc = await PDFDocument.load(result.buffer);
      expect(outDoc.getPageCount()).toBe(167);
    });

    it('extracts native text content streams from 167-page document', async () => {
      const result = await pdfToText({
        buffer: largePdfBytes,
        includePageHeaders: true
      });

      expect(result.pageCount).toBe(167);
      expect(result.pages).toHaveLength(167);
      expect(result.characterCount).toBeGreaterThan(1000);
      expect(result.wordCount).toBeGreaterThan(200);
    });

    it('optimizes object streams in 167-page document without errors', async () => {
      const result = await compressPdf({
        buffer: largePdfBytes,
        quality: 'medium'
      });

      expect(result.pageCount).toBe(167);
      expect(result.compressedSize).toBeGreaterThan(0);
      const outDoc = await PDFDocument.load(result.buffer);
      expect(outDoc.getPageCount()).toBe(167);
    });
  });

  describe('Edge-Case Document Formats and Security Testing', () => {
    it('detects password protection on encrypted LibreOffice export', async () => {
      const passwordPdfBytes = loadFile('005-libreoffice-writer-password/libreoffice-writer-password.pdf');

      // Attempting to read without password must throw PdfValidationError
      await expect(
        unlockPdf({
          buffer: passwordPdfBytes,
          fileName: 'password.pdf'
        })
      ).rejects.toThrow(PdfValidationError);
    });

    it('cleans XMP catalog streams from metadata-rich documents', async () => {
      const xmpPdfBytes = loadFile('020-xmp/output_with_metadata_pymupdf.pdf');
      const initialMeta = await readPdfMetadata(xmpPdfBytes);
      expect(initialMeta).toBeDefined();

      const wipeResult = await updatePdfMetadata({
        buffer: xmpPdfBytes,
        wipe: true
      });

      expect(wipeResult.buffer.byteLength).toBeGreaterThan(0);
      const postMeta = await readPdfMetadata(wipeResult.buffer);
      expect(postMeta.metadata.title).toBe('');
      expect(postMeta.metadata.author).toBe('');
    });

    it('merges rotated, cropped, and scaled document pages', async () => {
      const croppedPdfBytes = loadFile('027-cropped-rotated-scaled/cropped-rotated-scaled.pdf');
      const trivialPdfBytes = loadFile('001-trivial/minimal-document.pdf');

      const mergeResult = await mergePdfs([
        { buffer: croppedPdfBytes, name: 'cropped.pdf' },
        { buffer: trivialPdfBytes, name: 'trivial.pdf' }
      ]);

      expect(mergeResult.documentCount).toBe(2);
      expect(mergeResult.pageCount).toBeGreaterThanOrEqual(2);
      const outDoc = await PDFDocument.load(mergeResult.buffer);
      expect(outDoc.getPageCount()).toBe(mergeResult.pageCount);
    });

    it('rearranges pages from complex LaTeX multi-column documents', async () => {
      const latexPdfBytes = loadFile('026-latex-multicolumn/multicolumn.pdf');
      const doc = await PDFDocument.load(latexPdfBytes);
      const count = doc.getPageCount();

      // Reverse page order (0-indexed indices: 0 to count - 1)
      const reversedIndices = Array.from({ length: count }, (_, i) => count - 1 - i);
      const rearrangeResult = await rearrangePdf({
        buffer: latexPdfBytes,
        pageOrder: reversedIndices
      });

      expect(rearrangeResult.pageCount).toBe(count);
      const outDoc = await PDFDocument.load(rearrangeResult.buffer);
      expect(outDoc.getPageCount()).toBe(count);
    });

    it('converts multi-format real-world raster images to PDF', async () => {
      const smileJpg = loadFile('007-imagemagick-images/smile.jpg');
      const smilePng = loadFile('007-imagemagick-images/smile.png');

      const result = await imageToPdf({
        images: [
          { buffer: smileJpg, fileName: 'smile.jpg' },
          { buffer: smilePng, fileName: 'smile.png' }
        ],
        pageSize: 'a4',
        margin: 15
      });

      expect(result.pageCount).toBe(2);
      const outDoc = await PDFDocument.load(result.buffer);
      expect(outDoc.getPageCount()).toBe(2);
    });

    it('repairs documents with complex interactive AcroForms', async () => {
      const formPdfBytes = loadFile('010-pdflatex-forms/pdflatex-forms.pdf');
      const repairResult = await repairPdf({
        buffer: formPdfBytes,
        fileName: 'pdflatex-forms.pdf'
      });

      expect(repairResult.pageCount).toBeGreaterThan(0);
      expect(repairResult.repairedSize).toBeGreaterThan(0);
      const outDoc = await PDFDocument.load(repairResult.buffer);
      expect(outDoc.getPageCount()).toBe(repairResult.pageCount);
    });

    it('compresses complex form documents preserving page integrity', async () => {
      const formPdfBytes = loadFile('010-pdflatex-forms/pdflatex-forms.pdf');
      const compressResult = await compressPdf({
        buffer: formPdfBytes,
        quality: 'low'
      });

      expect(compressResult.pageCount).toBe(1);
      expect(compressResult.compressedSize).toBeGreaterThan(0);
      const outDoc = await PDFDocument.load(compressResult.buffer);
      expect(outDoc.getPageCount()).toBe(1);
    });
  });
});
