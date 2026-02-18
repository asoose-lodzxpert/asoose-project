// Central API error normalizer
export interface NormalizedApiError {
  type: 'network' | 'validation' | 'not-found' | 'unauthorized' | 'timeout' | 'permission' | 'unknown';
  message: string;
  retryable: boolean;
  userAction?: string;
  status?: number;
  details?: any;
}

export function normalizeApiError(error: any): NormalizedApiError {
  if (!error) return { type: 'unknown', message: 'Unknown error', retryable: false };
  // Handle AbortError
  if (error.name === 'AbortError') return { type: 'timeout', message: 'Request timed out', retryable: true };
  // Handle structured error objects
  if (typeof error === 'object') {
    if (error.status === 401 || error.type === 'unauthorized') {
      return { type: 'unauthorized', message: error.message || 'Session expired. Please log in again.', retryable: false, status: error.status };
    }
    if (error.status === 400 && error.details) {
      return { type: 'validation', message: error.details.message || 'Validation failed', retryable: false, details: error.details, status: error.status };
    }
    if (error.status === 404 || error.type === 'not-found') {
      return { type: 'not-found', message: error.message || 'Resource not found', retryable: false, status: error.status };
    }
    if (error.status === 0 || error.type === 'network') {
      return { type: 'network', message: error.message || 'Network error. Please check your connection.', retryable: true, status: error.status };
    }
    if (error.type === 'timeout') {
      return { type: 'timeout', message: error.message || 'Request timed out', retryable: true, status: error.status };
    }
    if (error.type === 'permission') {
      return { type: 'permission', message: error.message || 'Permission denied', retryable: false, status: error.status };
    }
    if (error.type === 'api-error') {
      return { type: 'unknown', message: error.message || 'API error', retryable: false, status: error.status, details: error.details };
    }
    // Fallback for structured error
    if (error.message) {
      return { type: 'unknown', message: error.message, retryable: false, status: error.status, details: error.details };
    }
  }
  // Handle generic Error instances
  if (error instanceof Error) {
    return { type: 'unknown', message: error.message || 'Internal server error', retryable: false };
  }
  // Handle string errors
  if (typeof error === 'string') {
    return { type: 'unknown', message: error, retryable: false };
  }
  // Fallback for unknown error types
  return { type: 'unknown', message: 'Internal server error', retryable: false };
}

