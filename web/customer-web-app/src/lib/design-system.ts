/**
 * Design System Tokens
 * 
 * Centralized design constants to maintain consistency across the app
 * and prevent one-off Tailwind classes.
 * 
 * Usage:
 * - Colors: Use theme-aware color tokens from COLORS or SEMANTIC_COLORS
 * - Spacing: Use SPACING scale (0-12) for margins/padding
 * - Type: Use TYPOGRAPHY for font sizes, weights
 * - Components: Import predefined utilities like BUTTON_BASE, INPUT_BASE, etc.
 */

/**
 * Color System
 */
export const COLORS = {
  // Grayscale (used for text, backgrounds, borders)
  gray: {
    50: 'bg-gray-50 dark:bg-gray-950',
    100: 'bg-gray-100 dark:bg-gray-900',
    200: 'bg-gray-200 dark:bg-gray-800',
    300: 'bg-gray-300 dark:bg-gray-700',
    400: 'bg-gray-400 dark:bg-gray-600',
    500: 'bg-gray-500 dark:bg-gray-500',
    600: 'bg-gray-600 dark:bg-gray-400',
    700: 'bg-gray-700 dark:bg-gray-300',
    800: 'bg-gray-800 dark:bg-gray-200',
    900: 'bg-gray-900 dark:bg-gray-100',
  },

  // Blue (Primary)
  blue: {
    50: 'bg-blue-50 dark:bg-blue-950',
    500: 'bg-blue-500',
    600: 'bg-blue-600',
    700: 'bg-blue-700',
  },

  // Green (Success)
  green: {
    50: 'bg-green-50 dark:bg-green-950',
    500: 'bg-green-500',
    600: 'bg-green-600',
  },

  // Red (Danger/Error)
  red: {
    50: 'bg-red-50 dark:bg-red-950',
    500: 'bg-red-500',
    600: 'bg-red-600',
  },

  // Amber (Warning)
  amber: {
    50: 'bg-amber-50 dark:bg-amber-950',
    500: 'bg-amber-500',
    600: 'bg-amber-600',
  },
} as const;

/**
 * Semantic Colors (Intent-based)
 */
export const SEMANTIC_COLORS = {
  background: 'bg-white dark:bg-gray-900',
  surface: 'bg-gray-50 dark:bg-gray-800',
  border: 'border-gray-200 dark:border-gray-800',
  divider: 'border-gray-200 dark:border-gray-700',
  text: {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-600 dark:text-gray-400',
    tertiary: 'text-gray-500 dark:text-gray-500',
    disabled: 'text-gray-400 dark:text-gray-500',
    inverse: 'text-white dark:text-gray-900',
  },
  status: {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  },
} as const;

/**
 * Text Color Tokens
 */
export const TEXT_COLORS = {
  primary: 'text-gray-900 dark:text-gray-100',
  secondary: 'text-gray-600 dark:text-gray-400',
  tertiary: 'text-gray-500 dark:text-gray-500',
  disabled: 'text-gray-400 dark:text-gray-500',
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-blue-600 dark:text-blue-400',
} as const;

/**
 * Spacing Scale
 * Used for padding, margins, gaps
 * Following Tailwind scale (4px base)
 */
export const SPACING = {
  xs: 'gap-1', // 4px
  sm: 'gap-2', // 8px
  md: 'gap-3', // 12px
  lg: 'gap-4', // 16px
  xl: 'gap-6', // 24px
  '2xl': 'gap-8', // 32px
} as const;

/**
 * Typography Scale
 */
export const TYPOGRAPHY = {
  // Text sizes
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',

  // Font weights
  light: 'font-light',
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',

  // Line heights
  tight: 'leading-tight',
  normalHeight: 'leading-normal',
  relaxed: 'leading-relaxed',
  loose: 'leading-loose',
} as const;

/**
 * Border Radius
 */
export const RADIUS = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  base: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  '3xl': 'rounded-3xl',
  full: 'rounded-full',
} as const;

/**
 * Shadows
 */
export const SHADOWS = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  base: 'shadow',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
} as const;

/**
 * Component Base Styles
 * Use these as base for all component styling
 */

// Button Variants
export const BUTTON = {
  base: `
    inline-flex items-center justify-center
    px-4 py-2 rounded-lg
    font-medium text-sm
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  primary: `
    bg-blue-600 hover:bg-blue-700 text-white
    focus:ring-blue-500
  `,
  secondary: `
    bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
    text-gray-900 dark:text-gray-100
    focus:ring-gray-400
  `,
  success: `
    bg-green-600 hover:bg-green-700 text-white
    focus:ring-green-500
  `,
  danger: `
    bg-red-600 hover:bg-red-700 text-white
    focus:ring-red-500
  `,
  ghost: `
    hover:bg-gray-100 dark:hover:bg-gray-800
    text-gray-900 dark:text-gray-100
  `,
} as const;

// Input Field
export const INPUT = {
  base: `
    w-full px-3 py-2 rounded-lg border-2
    text-gray-900 dark:text-gray-100
    placeholder-gray-400 dark:placeholder-gray-500
    bg-white dark:bg-gray-900
    transition-colors
    focus:outline-none
    disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:opacity-50
  `,
  default: `
    border-gray-200 dark:border-gray-700
    focus:border-blue-500 dark:focus:border-blue-500
  `,
  error: `
    border-red-500 dark:border-red-500
    focus:border-red-600 dark:focus:border-red-600
  `,
  success: `
    border-green-500 dark:border-green-500
    focus:border-green-600 dark:focus:border-green-600
  `,
} as const;

// Card
export const CARD = {
  base: `
    bg-white dark:bg-gray-900
    border border-gray-200 dark:border-gray-800
    rounded-lg
    shadow-sm
    p-4
  `,
  interactive: `
    hover:shadow-md transition-shadow cursor-pointer
  `,
} as const;

// Alert/Error Box
export const ALERT = {
  base: `
    p-3 rounded-lg border flex items-start gap-3
    transition-colors
  `,
  success: `
    bg-green-50 dark:bg-green-900/20
    border-green-200 dark:border-green-800
    text-green-800 dark:text-green-200
  `,
  error: `
    bg-red-50 dark:bg-red-900/20
    border-red-200 dark:border-red-800
    text-red-800 dark:text-red-200
  `,
  warning: `
    bg-amber-50 dark:bg-amber-900/20
    border-amber-200 dark:border-amber-800
    text-amber-800 dark:text-amber-200
  `,
  info: `
    bg-blue-50 dark:bg-blue-900/20
    border-blue-200 dark:border-blue-800
    text-blue-800 dark:text-blue-200
  `,
} as const;

/**
 * Responsive Breakpoints
 */
export const BREAKPOINTS = {
  mobile: '640px',   // sm
  tablet: '768px',   // md
  desktop: '1024px', // lg
  wide: '1280px',    // xl
} as const;

/**
 * Z-Index Scale
 * Used to manage stacking context
 */
export const Z_INDEX = {
  behind: '-10',
  base: '0',
  dropdown: '10',
  sticky: '20',
  fixed: '30',
  modal: '40',
  tooltip: '50',
  notification: '60',
  debug: '9999',
} as const;

/**
 * Utility Functions
 */

/**
 * Combine Tailwind classes safely
 */
export function combineClasses(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Get status color for different states
 */
export function getStatusColor(status: 'success' | 'error' | 'warning' | 'info' | 'default') {
  const colors = {
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  };
  return colors[status];
}

/**
 * Get text color for different variants
 */
export function getTextColor(variant: 'primary' | 'secondary' | 'tertiary' | 'disabled') {
  const colors = {
    primary: 'text-gray-900 dark:text-gray-100',
    secondary: 'text-gray-600 dark:text-gray-400',
    tertiary: 'text-gray-500 dark:text-gray-500',
    disabled: 'text-gray-400 dark:text-gray-500',
  };
  return colors[variant];
}

/**
 * Export all tokens as a single object for theme provisioning
 */
export const DESIGN_SYSTEM = {
  COLORS,
  SEMANTIC_COLORS,
  TEXT_COLORS,
  SPACING,
  TYPOGRAPHY,
  RADIUS,
  SHADOWS,
  BUTTON,
  INPUT,
  CARD,
  ALERT,
  BREAKPOINTS,
  Z_INDEX,
} as const;
