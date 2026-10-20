/**
 * React Custom Hook: usePdfToImage
 * Bridges React UI with the standalone pdfToImage core module.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { pdfToImage } from '../../core/pdf/pdf-to-image/pdfToImage';
import type { PdfToImageOptions, PdfToImageResult } from '../../core/pdf/pdf-to-image/pdfToImage.types';
import { toPdfError, uint8ArrayToBlob, createTrackedUrl, revokeTrackedUrl, type PdfError } from '../../core/shared';

export interface ImagePreviewItem {
  pageNumber: number;
  fileName: string;
  url: string;
  buffer: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
}

export interface PdfToImageHookResult {
  zipUrl: string | null;
  zipBuffer?: Uint8Array;
  images: ImagePreviewItem[];
  pageCount: number;
}

export interface PdfToImageHookState {
  status: 'idle' | 'processing' | 'success' | 'error';
  data: PdfToImageHookResult | null;
  error: PdfError | null;
  progress: number;
}

export function usePdfToImage() {
  const [state, setState] = useState<PdfToImageHookState>({
    status: 'idle',
    data: null,
    error: null,
    progress: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const trackedUrlsRef = useRef<string[]>([]);

  const cleanupUrls = useCallback(() => {
    trackedUrlsRef.current.forEach((url) => {
      revokeTrackedUrl(url);
    });
    trackedUrlsRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      cleanupUrls();
    };
  }, [cleanupUrls]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    cleanupUrls();
    setState({
      status: 'idle',
      data: null,
      error: null,
      progress: 0
    });
  }, [cleanupUrls]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const execute = useCallback(async (options: PdfToImageOptions): Promise<PdfToImageHookResult | null> => {
    cleanupUrls();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({
      status: 'processing',
      data: null,
      error: null,
      progress: 0
    });

    try {
      const result: PdfToImageResult = await pdfToImage({
        ...options,
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) {
            setState({
              status: 'processing',
              data: null,
              error: null,
              progress
            });
          }
        }
      });

      if (controller.signal.aborted) {
        return null;
      }

      let zipUrl: string | null = null;
      if (result.zipBuffer) {
        const zipBlob = uint8ArrayToBlob(result.zipBuffer, 'application/zip');
        zipUrl = createTrackedUrl(zipBlob);
        trackedUrlsRef.current.push(zipUrl);
      }

      const previewImages: ImagePreviewItem[] = [];
      for (const img of result.images) {
        const blob = uint8ArrayToBlob(img.buffer, img.mimeType);
        const url = createTrackedUrl(blob);
        trackedUrlsRef.current.push(url);
        previewImages.push({
          pageNumber: img.pageNumber,
          fileName: img.fileName,
          url,
          buffer: img.buffer,
          mimeType: img.mimeType,
          width: img.width,
          height: img.height
        });
      }

      const hookResult: PdfToImageHookResult = {
        zipUrl,
        zipBuffer: result.zipBuffer,
        images: previewImages,
        pageCount: result.pageCount
      };

      setState({
        status: 'success',
        data: hookResult,
        error: null,
        progress: 100
      });

      return hookResult;
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return null;
      }
      const pdfError = toPdfError(err, 'Failed to convert PDF to images.');
      setState({
        status: 'error',
        data: null,
        error: pdfError,
        progress: 0
      });
      return null;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [cleanupUrls]);

  return {
    state,
    execute,
    cancel,
    reset,
    isProcessing: state.status === 'processing',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    error: state.error,
    result: state.data,
    progress: state.progress
  };
}
