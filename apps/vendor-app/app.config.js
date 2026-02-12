/**
 * Expo App Configuration
 *
 * This config prevents Android 12+ BackgroundServiceStartNotAllowedException
 * by ensuring Firebase services are not started in the background.
 */

module.exports = ({ config }) => {
  // Build-time API URL validation
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    config.extra?.eas?.apiUrl ||
    config.extra?.eas?.EXPO_PUBLIC_API_URL;
  const isProd =
    process.env.NODE_ENV === "production" ||
    process.env.EAS_BUILD_PROFILE === "production";
  if (isProd && apiUrl) {
    const forbiddenPatterns = [
      /^http:\/\//i, // Not HTTPS
      /localhost/i,
      /10\.0\.\d+\.\d+/,
      /192\.168\.\d+\.\d+/, // Private IP
      /ngrok\.io/i,
    ];
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(apiUrl)) {
        throw new Error(
          `Production build must use a public HTTPS API URL. Invalid value: ${apiUrl}`,
        );
      }
    }
  }
  return {
    ...config,
    android: {
      ...config.android,
      // Explicitly prevent Firebase auto-configuration during EAS builds
      // This stops BackgroundServiceStartNotAllowedException on Android 12+
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || undefined,
    },
    extra: {
      ...config.extra,
      expoProjectId: "f144011b-bf0a-4ba1-9cdf-b89dd47a1a2b",
    },
  };
};
