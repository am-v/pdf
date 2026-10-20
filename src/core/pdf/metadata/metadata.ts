/**
 * Standalone Functional Core Module: PDF Metadata
 * Framework-independent pure TypeScript operation using pdf-lib.
 */

import { PDFDocument } from 'pdf-lib';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError
} from '../../shared';
import type {
  PdfMetadata,
  ReadMetadataResult,
  UpdateMetadataOptions,
  UpdateMetadataResult
} from './metadata.types';

/**
 * Reads and extracts metadata tags from a PDF binary buffer.
 *
 * @param buffer Raw PDF binary buffer.
 * @param fileName Optional file name for diagnostics.
 * @returns Promise resolving to ReadMetadataResult.
 * @throws {PdfValidationError} If buffer is invalid.
 * @throws {PdfCorruptError} If document cannot be parsed.
 */
export async function readPdfMetadata(
  buffer: Uint8Array,
  fileName = 'document'
): Promise<ReadMetadataResult> {
  validatePdfBuffer(buffer, fileName);

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new PdfCorruptError(`"${fileName}" could not be opened (${msg}).`, err);
  }

  let pageCount: number;
  try {
    pageCount = doc.getPageCount();
  } catch (err: unknown) {
    throw new PdfCorruptError(`"${fileName}" pages could not be read.`, err);
  }

  const metadata: PdfMetadata = {
    title: doc.getTitle() || '',
    author: doc.getAuthor() || '',
    subject: doc.getSubject() || '',
    keywords: doc.getKeywords() || '',
    creator: doc.getCreator() || '',
    producer: doc.getProducer() || '',
    creationDate: doc.getCreationDate(),
    modificationDate: doc.getModificationDate()
  };

  return {
    metadata,
    pageCount,
    byteLength: buffer.byteLength
  };
}

/**
 * Updates metadata fields or performs a privacy deep-clean wipe.
 *
 * @param options UpdateMetadataOptions containing buffer, metadata, and wipe mode.
 * @returns Promise resolving to UpdateMetadataResult.
 * @throws {PdfValidationError} If buffer is invalid or operation is cancelled.
 * @throws {PdfCorruptError} If document cannot be parsed or serialized.
 */
export async function updatePdfMetadata(
  options: UpdateMetadataOptions
): Promise<UpdateMetadataResult> {
  const {
    buffer,
    metadata = {},
    wipe = false,
    fileName = 'document',
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Metadata operation was cancelled.');
  }

  validatePdfBuffer(buffer, fileName);

  if (onProgress) onProgress(15);

  let sourceDoc: PDFDocument;
  try {
    sourceDoc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new PdfCorruptError(`"${fileName}" could not be opened (${msg}).`, err);
  }

  let pageCount: number;
  try {
    pageCount = sourceDoc.getPageCount();
  } catch (err: unknown) {
    throw new PdfCorruptError(`"${fileName}" pages could not be read.`, err);
  }

  if (pageCount === 0) {
    throw new PdfValidationError(`"${fileName}" contains no readable pages.`);
  }

  if (onProgress) onProgress(40);

  if (wipe) {
    // Deep Clean Wipe: create fresh document and purge all metadata dictionaries + XML streams
    let targetDoc: PDFDocument;
    try {
      targetDoc = await PDFDocument.create();
      const copiedPages = await targetDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
      copiedPages.forEach((page) => targetDoc.addPage(page));

      targetDoc.setTitle('');
      targetDoc.setAuthor('');
      targetDoc.setSubject('');
      targetDoc.setKeywords([]);
      targetDoc.setCreator(' ');
      targetDoc.setProducer(' ');
      targetDoc.setCreationDate(new Date());
      targetDoc.setModificationDate(new Date());

      // Purge embedded XML metadata stream from document catalog
      const metaKey = targetDoc.context.obj('Metadata');
      if (targetDoc.catalog.get(metaKey)) {
        targetDoc.catalog.delete(metaKey);
      }
    } catch (err) {
      throw new PdfCorruptError('Failed to deep-clean wipe document metadata.', err);
    }

    if (signal?.aborted) {
      throw new PdfValidationError('Metadata operation was cancelled.');
    }

    if (onProgress) onProgress(80);

    let outputBytes: Uint8Array;
    try {
      outputBytes = await targetDoc.save({ useObjectStreams: true });
    } catch (err) {
      throw new PdfCorruptError('Failed to serialize wiped document.', err);
    }

    if (onProgress) onProgress(100);

    return {
      buffer: outputBytes,
      metadata: {
        title: '',
        author: '',
        subject: '',
        keywords: '',
        creator: '',
        producer: ''
      },
      pageCount,
      byteLength: outputBytes.byteLength,
      isWiped: true
    };
  }

  // Update specified fields
  if (metadata.title !== undefined) sourceDoc.setTitle(metadata.title);
  if (metadata.author !== undefined) sourceDoc.setAuthor(metadata.author);
  if (metadata.subject !== undefined) sourceDoc.setSubject(metadata.subject);

  if (metadata.keywords !== undefined) {
    const kwArray = Array.isArray(metadata.keywords)
      ? metadata.keywords
      : metadata.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);
    sourceDoc.setKeywords(kwArray);
  }

  if (metadata.creator !== undefined) sourceDoc.setCreator(metadata.creator);
  if (metadata.producer !== undefined) sourceDoc.setProducer(metadata.producer);
  sourceDoc.setModificationDate(new Date());

  if (signal?.aborted) {
    throw new PdfValidationError('Metadata operation was cancelled.');
  }

  if (onProgress) onProgress(80);

  let outputBytes: Uint8Array;
  try {
    outputBytes = await sourceDoc.save({ useObjectStreams: true });
  } catch (err) {
    throw new PdfCorruptError('Failed to serialize document with updated metadata.', err);
  }

  if (onProgress) onProgress(100);

  const resultingMetadata: PdfMetadata = {
    title: sourceDoc.getTitle() || '',
    author: sourceDoc.getAuthor() || '',
    subject: sourceDoc.getSubject() || '',
    keywords: sourceDoc.getKeywords() || '',
    creator: sourceDoc.getCreator() || '',
    producer: sourceDoc.getProducer() || '',
    creationDate: sourceDoc.getCreationDate(),
    modificationDate: sourceDoc.getModificationDate()
  };

  return {
    buffer: outputBytes,
    metadata: resultingMetadata,
    pageCount,
    byteLength: outputBytes.byteLength,
    isWiped: false
  };
}
