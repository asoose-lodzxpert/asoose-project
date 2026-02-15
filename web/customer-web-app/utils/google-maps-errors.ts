
export const handleGoogleMapsError = (status: string, context: string) => {
  const errorMap: Record<string, string> = {
    ZERO_RESULTS: `No details found for this ${context}.`,
    OVER_QUERY_LIMIT: "System traffic is high. Please try again in a moment.",
    REQUEST_DENIED: "Location services are currently restricted.",
    INVALID_REQUEST: "Invalid location data received.",
    UNKNOWN_ERROR: "A temporary network error occurred.",
  };

  const message = errorMap[status] || `Unable to retrieve ${context} information.`;
  
  // LOGGING HOOK (Replace with your logger: Sentry, Datadog, etc.)
  console.error(`[GoogleMaps Failure] Context: ${context}, Status: ${status}`);
  
  return message;
};