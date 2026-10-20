/**
 * React Custom Hook: useExtractImages
 * Bridges React UI with the standalone extractImages core module.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { extractImages } from '../../core/pdf/extract-images/extractImages';
import type {
  ExtractImagesOptions,
  ExtractImagesResult
} from '../../core/pdf/extract-images/extractImages.types';
import {
  toPdfError,
  uint8ArrayToBlob,
  createTrackedUrl,
  revokeTrackedUrl,
  type PdfError
} from '../../core/shared';

export interface ExtractedImagePreview {
  index: number;
  pageNumber: number;
  fileName: string;
  url: string;
  buffer: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
}

export interface ExtractImagesHookResult {
  images: ExtractedImagePreview[];
  zipUrl: string | null;
  zipBuffer?: Uint8Array;
  imageCount: number;
  pageCount: number;
}

export interface ExtractImagesHookState {
  status: 'idle' | 'processing' | 'success' | 'error';
  data: ExtractImagesHookResult | null;
  error: PdfError | null;
  progress: number;
}

export function useExtractImages() {
  const [state, setState] = useState<ExtractImagesHookState>({
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

  const execute = useCallback(
    async (options: ExtractImagesOptions): Promise<ExtractImagesHookResult | null> => {
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
        const result: ExtractImagesResult = await extractImages({
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

        const previewImages: ExtractedImagePreview[] = [];
        for (const img of result.images) {
          const blob = uint8ArrayToBlob(img.buffer, img.mimeType);
          const url = createTrackedUrl(blob);
          trackedUrlsRef.current.push(url);
          previewImages.push({
            index: img.index,
            pageNumber: img.pageNumber,
            fileName: img.fileName,
            url,
            buffer: img.buffer,
            mimeType: img.mimeType,
            width: img.width,
            height: img.height
          });
        }

        const hookResult: ExtractImagesHookResult = {
          images: previewImages,
          zipUrl,
          zipBuffer: result.zipBuffer,
          imageCount: result.imageCount,
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
        const pdfError = toPdfError(err, 'Failed to extract images from PDF.');
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
    },
    [cleanupUrls]
  );

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
