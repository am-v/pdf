/**
 * Core PDF Error Definitions
 * Framework-independent typed error model for all PDF operations.
 */

export type PdfErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMPTY_FILE'
  | 'INVALID_PDF_HEADER'
  | 'PASSWORD_REQUIRED'
  | 'INCORRECT_PASSWORD'
  | 'CORRUPT_DOCUMENT'
  | 'PAGE_OUT_OF_BOUNDS'
  | 'INVALID_PAGE_RANGE'
  | 'UNSUPPORTED_FEATURE'
  | 'OPERATION_CANCELLED'
  | 'WORKER_ERROR'
  | 'UNKNOWN_ERROR';

export interface PdfErrorOptions {
  code: PdfErrorCode;
  userMessage: string;
  details?: unknown;
}

export class PdfError extends Error {
  readonly code: PdfErrorCode;
  readonly userMessage: string;
  readonly details?: unknown;

  constructor(options: PdfErrorOptions) {
    super(options.userMessage);
    this.name = 'PdfError';
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.details = options.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PdfValidationError extends PdfError {
  constructor(userMessage: string, details?: unknown) {
    super({ code: 'VALIDATION_ERROR', userMessage, details });
    this.name = 'PdfValidationError';
  }
}

export class PdfPasswordError extends PdfError {
  constructor(code: 'PASSWORD_REQUIRED' | 'INCORRECT_PASSWORD', userMessage: string, details?: unknown) {
    super({ code, userMessage, details });
    this.name = 'PdfPasswordError';
  }
}

export class PdfCorruptError extends PdfError {
  constructor(userMessage: string, details?: unknown) {
    super({ code: 'CORRUPT_DOCUMENT', userMessage, details });
    this.name = 'PdfCorruptError';
  }
}

export class PdfWorkerError extends PdfError {
  constructor(userMessage: string, details?: unknown) {
    super({ code: 'WORKER_ERROR', userMessage, details });
    this.name = 'PdfWorkerError';
  }
}

export function isPdfError(error: unknown): error is PdfError {
  return error instanceof PdfError;
}

export function toPdfError(error: unknown, fallbackMessage = 'An unexpected PDF processing error occurred'): PdfError {
  if (isPdfError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return new PdfError({
      code: 'UNKNOWN_ERROR',
      userMessage: error.message || fallbackMessage,
      details: error
    });
  }
  return new PdfError({
    code: 'UNKNOWN_ERROR',
    userMessage: fallbackMessage,
    details: error
  });
}
