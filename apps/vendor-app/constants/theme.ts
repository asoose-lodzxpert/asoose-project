/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Brand colors (shared across themes)
const brandPrimary = '#E5A503';
const brandPrimaryHoverLight = '#E0A800';
const brandPrimaryHoverDark = '#DFA200';

export const Colors = {
  light: {
    // Core surfaces
    surfaceBackground: '#F9FAFB',
    surfaceCard: '#FFFFFF',
    surfaceSubtle: '#F3F4F6',
    borderDefault: '#E5E7EB',
    tint: brandPrimary,

    // Text
    textPrimary: '#1F2933',
    textSecondary: '#6B7280',
    textDisabled: '#9CA3AF',
    textOnPrimary: '#FFFFFF',

    // Brand & actions
    brandPrimary,
    brandPrimaryHover: brandPrimaryHoverLight,

    // Status
    statusPending: '#F59E0B',
    statusSuccess: '#10B981',
    statusNeutral: '#6B7280',
    statusError: '#EF4444',

    // Navigation & icons
    iconDefault: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: brandPrimary,
  },

  dark: {
    // Core surfaces
    surfaceBackground: '#0F172A',
    surfaceCard: '#111827',
    surfaceSubtle: '#1F2937',
    borderDefault: '#273244',
    tint: brandPrimary,

    // Text
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textDisabled: '#6B7280',
    textOnPrimary: '#111827',

    // Brand & actions
    brandPrimary,
    brandPrimaryHover: brandPrimaryHoverDark,

    // Status
    statusPending: '#FBBF24',
    statusSuccess: '#34D399',
    statusNeutral: '#9CA3AF',
    statusError: '#F87171',

    // Navigation & icons
    iconDefault: '#9CA3AF',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: brandPrimary,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
