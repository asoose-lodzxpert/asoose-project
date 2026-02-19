/**
 * swal-theme.ts
 *
 * Centralised SweetAlert2 mixin factory for the Asoose customer-web-app.
 *
 * Usage:
 *   import { deliverySwal } from '@/lib/swal-theme';
 *   await deliverySwal().fire({ icon: 'warning', title: '...' });
 *
 * All delivery-flow alerts must go through this helper so:
 *  - Dark / light mode is respected automatically (reads the live DOM class).
 *  - Brand colours, typography and border-radius match the design system.
 *  - The popup CSS classes hook into the global `.asoose-swal-*` styles in globals.css.
 */

import Swal, { SweetAlertOptions } from 'sweetalert2';

// ─── Design System Tokens ─────────────────────────────────────────────────────
const BRAND_PRIMARY   = '#E5A503'; // brandPrimary
const BRAND_HOVER     = '#cc9202'; // brandPrimaryHover (≈ darken 8%)
const DARK_BG         = '#111111'; // matches dark:bg-[#0a0a0a] shifted up one stop for readability
const DARK_SURFACE    = '#1c1c1c'; // card surface inside popup
const DARK_BORDER     = '#2a2a2a';
const DARK_TEXT       = '#f4f4f5'; // zinc-100
const DARK_TEXT_MUTED = '#a1a1aa'; // zinc-400
const LIGHT_BG        = '#ffffff';
const LIGHT_TEXT      = '#111827'; // gray-900
const CANCEL_COLOR    = '#6b7280'; // gray-500

// ─── Theme Detection ──────────────────────────────────────────────────────────
/**
 * Returns true when the <html> element currently carries the "dark" class
 * (set by next-themes / tailwind darkMode: ["class"]).
 * Safe to call server-side: returns false on SSR (typeof document guard).
 */
function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

// ─── Base mixin config ────────────────────────────────────────────────────────
function buildBaseConfig(): SweetAlertOptions {
  const dark = isDarkMode();

  return {
    // ── Colours ────────────────────────────────────────────────────────────
    background:          dark ? DARK_BG    : LIGHT_BG,
    color:               dark ? DARK_TEXT  : LIGHT_TEXT,
    confirmButtonColor:  BRAND_PRIMARY,
    cancelButtonColor:   CANCEL_COLOR,

    // ── CSS class hooks (styled in globals.css) ────────────────────────────
    customClass: {
      popup:             'asoose-swal-popup',
      title:             'asoose-swal-title',
      htmlContainer:     'asoose-swal-html',
      confirmButton:     'asoose-swal-confirm',
      cancelButton:      'asoose-swal-cancel',
      actions:           'asoose-swal-actions',
      icon:              'asoose-swal-icon',
      closeButton:       'asoose-swal-close',
    },

    // ── Animation ─────────────────────────────────────────────────────────
    showClass: {
      popup:  'asoose-swal-enter',
      icon:   '',
      backdrop: 'swal2-backdrop-show',
    },
    hideClass: {
      popup:  'asoose-swal-leave',
      icon:   '',
      backdrop: 'swal2-backdrop-hide',
    },

    // ── Scroll / backdrop ─────────────────────────────────────────────────
    scrollbarPadding:  false,
    allowOutsideClick: false,
    buttonsStyling:    true,
  };
}

// ─── Public factory ───────────────────────────────────────────────────────────
/**
 * Returns a pre-configured Swal mixin for the delivery flow.
 * Call this inside an event handler (never at module level) so it reads
 * the current dark-mode state at the moment of the alert, not at import time.
 *
 * @example
 *   await deliverySwal().fire({ icon: 'warning', title: 'Missing field' });
 */
export function deliverySwal() {
  return Swal.mixin(buildBaseConfig());
}

/**
 * Convenience wrapper: fire a single delivery-themed alert.
 *
 * @example
 *   await fireDeliveryAlert({ icon: 'error', title: 'Invalid weight', html: '...' });
 */
export async function fireDeliveryAlert(options: SweetAlertOptions) {
  return deliverySwal().fire(options);
}

/**
 * Confirmation dialog pre-configured for destructive actions.
 * Returns true when the user clicked Confirm.
 */
export async function confirmDeliveryAction(options: {
  title: string;
  html?: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<boolean> {
  const result = await deliverySwal().fire({
    icon: 'question',
    title: options.title,
    html: options.html,
    showCancelButton: true,
    confirmButtonText: options.confirmText ?? 'Confirm',
    cancelButtonText:  options.cancelText  ?? 'Cancel',
  });
  return result.isConfirmed;
}
