'use client';

import React, { useState, ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export interface SidebarProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
  defaultOpen?: boolean;
  isCollapsible?: boolean;
  className?: string;
}

/**
 * Sidebar Component
 * 
 * Responsive layout component:
 * - Desktop: Left sidebar (350px) + right content area (flex-1 for map)
 * - Tablet: Similar split with adjusted proportions
 * - Mobile: Bottom sheet overlay pattern
 * 
 * Usage:
 * ```tsx
 * <Sidebar
 *   title="Request Ride"
 *   isCollapsible={isMobile}
 * >
 *   <LocationInput ... />
 *   <RideDetails ... />
 * </Sidebar>
 * ```
 */
export default function Sidebar({
  title,
  subtitle,
  actions,
  children,
  footer,
  onClose,
  defaultOpen = true,
  isCollapsible = false,
  className = '',
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <>
      {/* Desktop/Tablet: Fixed Sidebar (always visible) */}
      <div
        className={`
          hidden md:flex flex-col
          fixed left-0 top-0 bottom-0 w-full md:w-[350px] lg:w-[380px]
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          shadow-lg dark:shadow-2xl
          z-40
          overflow-y-auto
          ${className}
        `}
      >
        {/* Header */}
        {title && (
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-start justify-between gap-3 z-10">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex-shrink-0">{actions}</div>}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-4 space-y-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
            {footer}
          </div>
        )}
      </div>

      {/* Mobile: Bottom Sheet */}
      <div
        className={`
          md:hidden fixed inset-0 z-40 transition-all duration-300
          ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}
        `}
      >
        {/* Backdrop */}
        <div
          onClick={onClose || toggleOpen}
          className={`
            absolute inset-0 bg-black transition-opacity
            ${isOpen ? 'opacity-30' : 'opacity-0'}
          `}
          aria-hidden="true"
        />

        {/* Sheet */}
        <div
          className={`
            absolute bottom-0 left-0 right-0 max-h-[90vh]
            bg-white dark:bg-gray-900
            rounded-t-3xl shadow-4xl
            border-t border-gray-200 dark:border-gray-800
            transform transition-all duration-300 ease-out
            overflow-y-auto
            flex flex-col
            ${isOpen ? 'translate-y-0' : 'translate-y-full'}
          `}
        >
          {/* Handle Bar + Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pt-3 pb-0">
            {/* Drag Handle */}
            <div className="flex justify-center pb-3">
              <div className="w-12 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Title Row */}
            {(title || isCollapsible) && (
              <div className="px-4 pb-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                      {subtitle}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {actions && <div>{actions}</div>}
                  {isCollapsible && (
                    <button
                      onClick={toggleOpen}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      aria-label={isOpen ? 'Collapse' : 'Expand'}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? (
                        <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 space-y-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50">
              {footer}
            </div>
          )}
        </div>
      </div>

      {/* Desktop/Tablet: Space for sidebar + map container */}
      <div className="hidden md:block md:w-[350px] lg:w-[380px]" />
    </>
  );
}

/**
 * SidebarContent Component
 * Container for organizing sidebar content sections
 */
export function SidebarSection({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {title && (
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

/**
 * SidebarDivider Component
 * Visual separator between sections
 */
export function SidebarDivider() {
  return <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />;
}
