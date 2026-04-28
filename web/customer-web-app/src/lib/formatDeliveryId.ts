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
 * Extract first UUID segment (before first dash) from a tracking ID
 * This format is commonly used in some UIs (e.g., rider app: del#7F06D42D)
 * 
 * @param fullId - The complete tracking ID (UUID)
 * @returns First segment of UUID (e.g., "7F06D42D" from "7f06d42d-f6b2-43f8-abe0-42e85ac2b111")
 */
export const getFirstSegmentId = (fullId: string): string => {
  if (!fullId) return "?".repeat(8);
  
  // Extract first segment (before first dash)
  const firstSegment = fullId.split('-')[0].toUpperCase();
  return firstSegment.length > 0 ? firstSegment : "?".repeat(8);
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
  const isShortFormat = trimmed.startsWith("track#") || trimmed.startsWith("del#") || trimmed.startsWith("#");
  const prefix = trimmed.startsWith("track#") ? "track#" : trimmed.startsWith("del#") ? "del#" : trimmed.startsWith("#") ? "#" : "";
  
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
 * Supports both "track#XYZ" and "del#XYZ" formats, first-segment format, and partial matches
 * 
 * The backend search now supports:
 * - Full UUID: "550e8400-e29b-41d4-a716-446655440000"
 * - With prefix: "del#7F06D42D" or "track#440000"
 * - Without prefix: "7F06D42D" or "440000"
 * - Partial UUID match: any substring of the UUID
 * 
 * @param fullId - The complete tracking ID (UUID)
 * @param shortSearchTerm - Search term in any recognized format
 * @returns true if the full ID matches the shortened search term
 * 
 * Usage:
 *  idMatchesShortSearch("7f06d42d-f6b2-43f8-abe0-42e85ac2b111", "del#7F06D42D") // true (first segment)
 *  idMatchesShortSearch("7f06d42d-f6b2-43f8-abe0-42e85ac2b111", "7F06D42D") // true (first segment without prefix)
 *  idMatchesShortSearch("550e8400-e29b-41d4-a716-446655440000", "track#440000") // true (last 6 chars)
 *  idMatchesShortSearch("550e8400-e29b-41d4-a716-446655440000", "e29b-41d4") // true (partial UUID)
 */
export const idMatchesShortSearch = (fullId: string, shortSearchTerm: string): boolean => {
  if (!fullId || !shortSearchTerm) return false;
  
  const fullIdUpper = fullId.toUpperCase();
  const searchUpper = shortSearchTerm.toUpperCase();
  
  // Check full UUID match (with or without hyphens)
  if (fullIdUpper === searchUpper) return true;
  if (fullIdUpper.replace(/-/g, "") === searchUpper.replace(/-/g, "")) return true;
  
  // Remove prefix if present (del#, track#, #, delivery#, etc.)
  const cleanSearch = searchUpper.replace(/^(TRACK#|DEL#|DELIVERY#|#)/i, "").trim();
  
  // Check if UUID contains the search term (covers all partial matches, first segment, last segment, etc.)
  if (fullIdUpper.replace(/-/g, "").includes(cleanSearch.replace(/-/g, ""))) return true;
  if (fullIdUpper.includes(cleanSearch)) return true;
  
  return false;
};
