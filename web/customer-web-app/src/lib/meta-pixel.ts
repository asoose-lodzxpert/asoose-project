/**
 * Small, privacy-conscious wrapper around the Meta Pixel browser API.
 *
 * Do not pass names, email addresses, phone numbers, street addresses, or any
 * other user-entered personal data in event parameters.
 */

export type MetaEventParameters = Record<
  string,
  string | number | boolean | string[] | undefined
>;

type MetaPixelFunction = (
  command: "track" | "trackCustom",
  eventName: string,
  parameters?: MetaEventParameters,
  options?: { eventID: string },
) => void;

declare global {
  interface Window {
    fbq?: MetaPixelFunction;
  }
}

function send(
  command: "track" | "trackCustom",
  eventName: string,
  parameters?: MetaEventParameters,
  eventId?: string,
): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;

  if (eventId) {
    window.fbq(command, eventName, parameters, { eventID: eventId });
    return;
  }

  window.fbq(command, eventName, parameters);
}

export function trackMetaEvent(
  eventName: "CompleteRegistration" | "Search" | "Purchase" | "Contact",
  parameters?: MetaEventParameters,
  eventId?: string,
): void {
  send("track", eventName, parameters, eventId);
}

export function trackMetaCustomEvent(
  eventName:
    | "AppDownloadClick"
    | "RideBooking"
    | "DispatchRequest"
    | "HotelBooking",
  parameters?: MetaEventParameters,
  eventId?: string,
): void {
  send("trackCustom", eventName, parameters, eventId);
}

const PURCHASE_CONTEXT_KEY = "meta_purchase_context";
const PURCHASE_RECORDED_PREFIX = "meta_purchase_recorded:";

export interface PurchaseContext {
  value: number;
  currency: string;
  contentCategory: "shopping" | "ride" | "dispatch" | "accommodation";
  contentId?: string;
}

export function savePurchaseContext(context: PurchaseContext): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PURCHASE_CONTEXT_KEY, JSON.stringify(context));
}

export function clearPurchaseContext(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PURCHASE_CONTEXT_KEY);
}

export function trackVerifiedPurchase(
  reference: string,
  fallback?: Partial<PurchaseContext>,
): void {
  if (typeof window === "undefined" || !reference) return;

  const recordedKey = `${PURCHASE_RECORDED_PREFIX}${reference}`;
  if (window.localStorage.getItem(recordedKey) === "true") return;

  let saved: Partial<PurchaseContext> = {};
  try {
    saved = JSON.parse(
      window.localStorage.getItem(PURCHASE_CONTEXT_KEY) || "{}",
    );
  } catch {
    // A malformed/old value should not prevent conversion tracking.
  }

  const context = { ...fallback, ...saved };
  const value = Number(context.value);
  const parameters: MetaEventParameters = {
    currency: context.currency || "NGN",
    content_category: context.contentCategory || "transaction",
    ...(context.contentId ? { content_ids: [context.contentId] } : {}),
    ...(Number.isFinite(value) && value >= 0 ? { value } : {}),
  };

  trackMetaEvent("Purchase", parameters, `payment:${reference}`);
  window.localStorage.setItem(recordedKey, "true");
  clearPurchaseContext();
}
