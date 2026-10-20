import type { PdfError } from '../../core/shared/errors';

export type PdfOperationState<T> =
  | { status: 'idle'; data: null; error: null; progress: 0; objectUrl: null }
  | { status: 'processing'; data: null; error: null; progress: number; objectUrl: null }
  | { status: 'success'; data: T; error: null; progress: 100; objectUrl: string }
  | { status: 'error'; data: null; error: PdfError; progress: 0; objectUrl: null };
