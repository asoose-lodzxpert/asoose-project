/**
 * Tracking ID Formatter Utility
 * Converts full UUID tracking IDs to user-friendly format: track#XYZ
 * 
 * Example:
 *  - Input: "550e8400-e29b-41d4-a716-446655440000"
 *  - Output: "track#440000" (last 6 alphanumeric chars)
 * 
 * The shortened format is consistent and unique enough for UI display
 * while preserving the full ID for backend operations and system integrity.
 * 
 * @see https://docs.example.com/tracking-ids for more information
 */

/**
 * Extract the unique shortened portion from a tracking ID
 * Uses the last 6 characters of the UUID for better uniqueness while keeping it readable
 * Falls back to last 4 if needed
 * 
 * @param fullId - The complete tracking ID (UUID)
 * @param length - Optional length of shortened ID (default: 6, min: 3, max: 8)
 * @returns Shortened unique segment (e.g., "440000")
 */
export const getShortTrackingId = (fullId: string, length: number = 6): string => {
  if (!fullId || fullId.length === 0) return "?".repeat(Math.min(length, 4));
  
  // Remove hyphens from UUID and take last N characters for uniqueness
  const cleanId = fullId.replace(/-/g, "").toUpperCase();
  const clampedLength = Math.max(3, Math.min(length, 8)); // Clamp between 3-8
  const shortId = cleanId.slice(-clampedLength);
  
  return shortId.length > 0 ? shortId : "?".repeat(clampedLength);
};

/**
 * Format tracking ID for display in the UI
 * Converts full UUID to user-friendly tracking format
 * 
 * @param fullId - The complete tracking ID (UUID)
 * @param format - Optional format type: "short" (default) or "full"
 * @param prefix - Optional prefix (default: "track#", can be "del#" for deliveries)
 * @returns Formatted tracking ID (e.g., "track#440000" or full ID as-is)
 * 
 * Usage:
 *  formatTrackingId("550e8400-e29b-41d4-a716-446655440000") => "track#440000"
 *  formatTrackingId("550e8400-e29b-41d4-a716-446655440000", "full") => "550e8400-e29b-41d4-a716-446655440000"
 *  formatTrackingId("550e8400-e29b-41d4-a716-446655440000", "short", "del#") => "del#440000"
 */
export const formatTrackingId = (
  fullId: string,
  format: "short" | "full" = "short",
  prefix: string = "track#"
): string => {
  if (!fullId) return "N/A";
  
  if (format === "full") {
    return fullId;
  }
  
  const shortId = getShortTrackingId(fullId, 6);
  return `${prefix}${shortId}`;
};

// Alias for convenience (delivery IDs are a type of tracking ID)
export const formatDeliveryId = (fullId: string, format: "short" | "full" = "short"): string => {
  return formatTrackingId(fullId, format, "del#");
};

// Alias for the short ID getter
export const getShortDeliveryId = (fullId: string): string => {
  return getShortTrackingId(fullId, 6);
};

/**
 * Parse search input to determine if it's a shortened or full tracking ID
 * Supports both "track#XYZ" and "del#XYZ" formats and raw UUIDs
 * 
 * @param searchInput - User input (could be "track#440000", "del#440000", or raw UUID)
 * @returns Object with isShortFormat flag, prefix used, and search term
 * 
 * Usage:
 *  parseTrackingSearchInput("track#440000") => { isShortFormat: true, prefix: "track#", term: "track#440000" }
 *  parseTrackingSearchInput("del#440000") => { isShortFormat: true, prefix: "del#", term: "del#440000" }
 *  parseTrackingSearchInput("550e8400-e29b-41d4-a716-446655440000") => { isShortFormat: false, prefix: "", term: "550e8400..." }
 */
export const parseTrackingSearchInput = (searchInput: string) => {
  if (!searchInput) return { isShortFormat: false, prefix: "", term: "" };
  
  const trimmed = searchInput.trim().toLowerCase();
  const isShortFormat = trimmed.startsWith("track#") || trimmed.startsWith("del#");
  const prefix = trimmed.startsWith("track#") ? "track#" : trimmed.startsWith("del#") ? "del#" : "";
  
  return {
    isShortFormat,
    prefix,
    term: trimmed,
  };
};

// Alias for convenience
export const parseDeliverySearchInput = (searchInput: string) => {
  return parseTrackingSearchInput(searchInput);
};

/**
 * Check if a full tracking ID matches a shortened search term
 * Supports both "track#XYZ" and "del#XYZ" formats
 * This function is used by the backend to support searching by shortened IDs
 * 
 * @param fullId - The complete tracking ID (UUID)
 * @param shortSearchTerm - Search term in "track#XYZ" or "del#XYZ" format
 * @returns true if the full ID matches the shortened search term
 * 
 * Usage (Backend):
 *  idMatchesShortSearch("550e8400-e29b-41d4-a716-446655440000", "track#440000") // true
 *  idMatchesShortSearch("550e8400-e29b-41d4-a716-446655440000", "del#440000") // true
 *  idMatchesShortSearch("550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440000") // true (full match)
 */
export const idMatchesShortSearch = (fullId: string, shortSearchTerm: string): boolean => {
  if (!fullId || !shortSearchTerm) return false;
  
  const fullIdUpper = fullId.toUpperCase();
  const searchUpper = shortSearchTerm.toUpperCase();
  
  // Check full UUID match
  if (fullIdUpper === searchUpper || fullIdUpper.replace(/-/g, "") === searchUpper.replace(/-/g, "")) {
    return true;
  }
  
  // Check shortened format match
  const shortId = getShortTrackingId(fullId, 6);
  const cleanSearch = searchUpper.replace(/^(TRACK#|DEL#)/, "");
  
  return shortId.endsWith(cleanSearch) || shortId === cleanSearch;
};
