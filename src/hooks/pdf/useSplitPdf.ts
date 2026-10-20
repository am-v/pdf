/**
 * React Custom Hook: useSplitPdf
 * Bridges React UI with the standalone splitPdf core module.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { splitPdf } from '../../core/pdf/split/splitPdf';
import type { SplitPdfOptions, SplitPdfResult } from '../../core/pdf/split/splitPdf.types';
import { toPdfError, uint8ArrayToBlob, createTrackedUrl, revokeTrackedUrl } from '../../core/shared';
import type { PdfOperationState } from './types';

export function useSplitPdf() {
  const [state, setState] = useState<PdfOperationState<SplitPdfResult>>({
    status: 'idle',
    data: null,
    error: null,
    progress: 0,
    objectUrl: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const activeUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (activeUrlRef.current) {
        revokeTrackedUrl(activeUrlRef.current);
        activeUrlRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeUrlRef.current) {
      revokeTrackedUrl(activeUrlRef.current);
      activeUrlRef.current = null;
    }
    setState({
      status: 'idle',
      data: null,
      error: null,
      progress: 0,
      objectUrl: null
    });
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const execute = useCallback(async (options: SplitPdfOptions): Promise<SplitPdfResult | null> => {
    if (activeUrlRef.current) {
      revokeTrackedUrl(activeUrlRef.current);
      activeUrlRef.current = null;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({
      status: 'processing',
      data: null,
      error: null,
      progress: 0,
      objectUrl: null
    });

    try {
      const result = await splitPdf({
        ...options,
        signal: controller.signal,
        onProgress: (progress) => {
          if (!controller.signal.aborted) {
            setState({
              status: 'processing',
              data: null,
              error: null,
              progress,
              objectUrl: null
            });
          }
        }
      });

      if (controller.signal.aborted) {
        return null;
      }

      // Create tracked URL depending on output mode (single PDF or ZIP archive)
      let url = '';
      if (result.mode === 'single') {
        const blob = uint8ArrayToBlob(result.buffer, 'application/pdf');
        url = createTrackedUrl(blob);
      } else if (result.zipBuffer) {
        const zipBlob = uint8ArrayToBlob(result.zipBuffer, 'application/zip');
        url = createTrackedUrl(zipBlob);
      }
      activeUrlRef.current = url;

      setState({
        status: 'success',
        data: result,
        error: null,
        progress: 100,
        objectUrl: url
      });

      return result;
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return null;
      }
      const pdfError = toPdfError(err, 'Failed to split PDF document.');
      setState({
        status: 'error',
        data: null,
        error: pdfError,
        progress: 0,
        objectUrl: null
      });
      return null;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

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
    objectUrl: state.objectUrl,
    progress: state.progress
  };
}
