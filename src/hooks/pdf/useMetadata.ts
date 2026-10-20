/**
 * React Custom Hook: useMetadata
 * Bridges React UI with the standalone metadata core module.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { readPdfMetadata, updatePdfMetadata } from '../../core/pdf/metadata/metadata';
import type {
  PdfMetadata,
  ReadMetadataResult,
  UpdateMetadataOptions,
  UpdateMetadataResult
} from '../../core/pdf/metadata/metadata.types';
import { toPdfError, uint8ArrayToBlob, createTrackedUrl, revokeTrackedUrl } from '../../core/shared';
import type { PdfOperationState } from './types';

export function useMetadata() {
  const [state, setState] = useState<PdfOperationState<UpdateMetadataResult>>({
    status: 'idle',
    data: null,
    error: null,
    progress: 0,
    objectUrl: null
  });

  const [currentMetadata, setCurrentMetadata] = useState<PdfMetadata | null>(null);
  const [isReading, setIsReading] = useState(false);

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
    setCurrentMetadata(null);
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const loadMetadata = useCallback(async (buffer: Uint8Array, fileName?: string): Promise<ReadMetadataResult | null> => {
    setIsReading(true);
    try {
      const res = await readPdfMetadata(buffer, fileName);
      setCurrentMetadata(res.metadata);
      return res;
    } catch {
      return null;
    } finally {
      setIsReading(false);
    }
  }, []);

  const execute = useCallback(async (options: UpdateMetadataOptions): Promise<UpdateMetadataResult | null> => {
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
      const result = await updatePdfMetadata({
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

      const blob = uint8ArrayToBlob(result.buffer, 'application/pdf');
      const url = createTrackedUrl(blob);
      activeUrlRef.current = url;
      setCurrentMetadata(result.metadata);

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
      const pdfError = toPdfError(err, 'Failed to update PDF metadata.');
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
    loadMetadata,
    currentMetadata,
    isReading,
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
