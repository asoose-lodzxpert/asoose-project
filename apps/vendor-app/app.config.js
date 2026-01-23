/**
 * Expo App Configuration
 *
 * This config prevents Android 12+ BackgroundServiceStartNotAllowedException
 * by ensuring Firebase services are not started in the background.
 */

module.exports = ({ config }) => {
  return {
    ...config,
    android: {
      ...config.android,
      // Explicitly prevent Firebase auto-configuration during EAS builds
      // This stops BackgroundServiceStartNotAllowedException on Android 12+
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || undefined,
    },
  };
};
