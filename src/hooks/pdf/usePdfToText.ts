/**
 * React Custom Hook: usePdfToText
 * Bridges React UI with the standalone pdfToText core module.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { pdfToText } from '../../core/pdf/pdf-to-text/pdfToText';
import type { PdfToTextOptions, PdfToTextResult } from '../../core/pdf/pdf-to-text/pdfToText.types';
import { toPdfError } from '../../core/shared';

export interface PdfToTextHookState {
  status: 'idle' | 'processing' | 'success' | 'error';
  data: PdfToTextResult | null;
  error: Error | null;
  progress: number;
}

export function usePdfToText() {
  const [state, setState] = useState<PdfToTextHookState>({
    status: 'idle',
    data: null,
    error: null,
    progress: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState({
      status: 'idle',
      data: null,
      error: null,
      progress: 0
    });
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const execute = useCallback(async (options: PdfToTextOptions): Promise<PdfToTextResult | null> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({
      status: 'processing',
      data: null,
      error: null,
      progress: 0
    });

    try {
      const result = await pdfToText({
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

      setState({
        status: 'success',
        data: result,
        error: null,
        progress: 100
      });

      return result;
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return null;
      }
      const pdfError = toPdfError(err, 'Failed to extract text from PDF.');
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
    progress: state.progress
  };
}
