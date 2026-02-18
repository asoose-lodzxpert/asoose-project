'use client';

/**
 * Design System Component Library
 * Reusable UI components that enforce design system constraints
 */

import React, { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { combineClasses } from '@/lib/design-system';

/**
 * Button Variants
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  children: ReactNode;
}

export function PrimaryButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={combineClasses(
        'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
        'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
        className
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={combineClasses(
        'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
        'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-400',
        className
      )}
    >
      {children}
    </button>
  );
}

export function SuccessButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={combineClasses(
        'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
        'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
        className
      )}
    >
      {children}
    </button>
  );
}

export function DangerButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={combineClasses(
        'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
        'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
        className
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={combineClasses(
        'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed',
        'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100',
        className
      )}
    >
      {children}
    </button>
  );
}

/**
 * Input Field
 */
interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helper?: string;
}

export function InputField({
  label,
  error,
  success,
  helper,
  className,
  ...props
}: InputFieldProps) {
  const inputClass = error
    ? 'border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-600'
    : success
      ? 'border-green-500 dark:border-green-500 focus:border-green-600 dark:focus:border-green-600'
      : 'border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-500';

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <input
        {...props}
        className={combineClasses(
          'w-full px-3 py-2 rounded-lg border-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-900 transition-colors focus:outline-none disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:opacity-50',
          inputClass,
          className
        )}
      />

      {error && <p className="text-sm mt-1 text-red-600 dark:text-red-400">{error}</p>}

      {helper && !error && (
        <p className="text-sm mt-1 text-gray-500 dark:text-gray-500">{helper}</p>
      )}
    </div>
  );
}

/**
 * Card
 */
interface CardProps {
  children: ReactNode;
  interactive?: boolean;
  className?: string;
}

export function Card({ children, interactive = false, className }: CardProps) {
  return (
    <div
      className={combineClasses(
        'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm p-4',
        interactive && 'hover:shadow-md transition-shadow cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Alert Boxes
 */
interface AlertProps {
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export function SuccessAlert({ title = 'Success', message, onClose, className }: AlertProps) {
  return (
    <div
      className={combineClasses(
        'p-3 rounded-lg border flex items-start gap-3 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
        className
      )}
    >
      <div className="flex-1">
        {title && <h4 className="font-medium text-sm">{title}</h4>}
        <p className="text-sm mt-1">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 text-lg ml-2">
          ✕
        </button>
      )}
    </div>
  );
}

export function ErrorAlert({ title = 'Error', message, onClose, className }: AlertProps) {
  return (
    <div
      className={combineClasses(
        'p-3 rounded-lg border flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
        className
      )}
    >
      <div className="flex-1">
        {title && <h4 className="font-medium text-sm">{title}</h4>}
        <p className="text-sm mt-1">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 text-lg ml-2">
          ✕
        </button>
      )}
    </div>
  );
}

export function WarningAlert({ title = 'Warning', message, onClose, className }: AlertProps) {
  return (
    <div
      className={combineClasses(
        'p-3 rounded-lg border flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
        className
      )}
    >
      <div className="flex-1">
        {title && <h4 className="font-medium text-sm">{title}</h4>}
        <p className="text-sm mt-1">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 text-lg ml-2">
          ✕
        </button>
      )}
    </div>
  );
}

export function InfoAlert({ title = 'Info', message, onClose, className }: AlertProps) {
  return (
    <div
      className={combineClasses(
        'p-3 rounded-lg border flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
        className
      )}
    >
      <div className="flex-1">
        {title && <h4 className="font-medium text-sm">{title}</h4>}
        <p className="text-sm mt-1">{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="flex-shrink-0 text-lg ml-2">
          ✕
        </button>
      )}
    </div>
  );
}

/**
 * Badge
 */
interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variantClasses = {
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  };

  return (
    <span
      className={combineClasses(
        'inline-block px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Loading Spinner
 */
export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={combineClasses(
        'animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 dark:border-t-blue-400',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

/**
 * Text Variants
 */
interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'disabled';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
  children: ReactNode;
}

export function Text({
  variant = 'primary',
  size = 'base',
  weight = 'normal',
  children,
  className,
  ...props
}: TextProps) {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const weightClasses = {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const variantClasses = {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-600 dark:text-gray-400',
    tertiary: 'text-gray-500 dark:text-gray-500',
    disabled: 'text-gray-400 dark:text-gray-500',
  };

  return (
    <span
      {...props}
      className={combineClasses(
        sizeClasses[size],
        weightClasses[weight],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Divider
 */
export function Divider({ className }: { className?: string }) {
  return <div className={combineClasses('h-px bg-gray-200 dark:bg-gray-700', className)} />;
}
