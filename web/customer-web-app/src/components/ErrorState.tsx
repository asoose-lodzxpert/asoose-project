'use client';

import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

/**
 * Error State Component
 * Displays errors with retry capability
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertCircle size={48} className="text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            {title}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
        </div>

        {/* Retry Button */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <RotateCcw size={16} />
            Try Again
          </button>
        )}

        {/* Support Link */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          If the issue persists, please{' '}
          <a
            href="/support"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}
