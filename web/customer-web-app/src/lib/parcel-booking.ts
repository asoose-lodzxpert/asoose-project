import type {
  CreateParcelInput,
  ParcelParty,
} from "@/services/delivery.service";

export const formatNaira = (value: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
export const formatParcelDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
export const parcelStatusLabel = (
  status: string,
  paymentMethod?: string,
  paymentStatus?: string,
) => {
  if (
    paymentMethod === "CARD" &&
    paymentStatus !== "COMPLETED" &&
    !status.startsWith("CANCELLED")
  )
    return "Payment pending";
  return (
    (
      {
        PENDING: "Pending",
        SCHEDULED: "Scheduled",
        SEARCHING_RIDER: "Searching for rider",
        REQUESTED: "Searching for rider",
        RIDER_ASSIGNED: "Rider assigned",
        ASSIGNED: "Rider assigned",
        RIDER_ACCEPTED: "Rider accepted",
        ACCEPTED: "Rider accepted",
        PICKED_UP: "Picked up",
        IN_TRANSIT: "In transit",
        DELIVERED: "Delivered",
      } as Record<string, string>
    )[status] ||
    (status.startsWith("CANCELLED") ? "Cancelled" : status.replaceAll("_", " "))
  );
};
export type ParcelContacts = {
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  instructions: string;
};
export function validateParcelContacts(
  party: ParcelParty,
  fields: ParcelContacts,
) {
  const errors: Record<string, string> = {};
  const contacts =
    party === "THIRD_PARTY"
      ? ["sender", "recipient"]
      : [party === "SENDER" ? "recipient" : "sender"];
  for (const contact of contacts) {
    const name = `${contact}Name` as keyof ParcelContacts;
    const phone = `${contact}Phone` as keyof ParcelContacts;
    if (fields[name].trim().length < 2 || fields[name].trim().length > 100)
      errors[name] = "Enter a name between 2 and 100 characters.";
    const number = fields[phone].trim();
    if (!/^\+?\d{7,15}$/.test(number))
      errors[phone] = "Enter a valid phone number with 7 to 15 digits.";
  }
  const description = fields.instructions.trim();
  if (description && (description.length < 3 || description.length > 500))
    errors.instructions = "Use between 3 and 500 characters.";
  return errors;
}
export function scheduledTimestamp(
  later: boolean,
  local: string,
  now = Date.now(),
): string | undefined {
  if (!later) return undefined;
  const date = new Date(local);
  if (!local || !Number.isFinite(date.getTime()) || date.getTime() <= now)
    throw new Error("Choose a future pickup date and time.");
  return date.toISOString();
}
export function parcelContactsPayload(
  party: ParcelParty,
  fields: ParcelContacts,
): Partial<CreateParcelInput> {
  return {
    party,
    ...(party !== "SENDER"
      ? {
          senderName: fields.senderName.trim(),
          senderPhone: fields.senderPhone.trim(),
        }
      : {}),
    ...(party !== "RECIPIENT"
      ? {
          recipientName: fields.recipientName.trim(),
          recipientPhone: fields.recipientPhone.trim(),
        }
      : {}),
    ...(fields.instructions.trim()
      ? { description: fields.instructions.trim() }
      : {}),
  };
}

/** Save the existing callback context before leaving for Paystack. */
export function redirectToParcelPayment(
  id: string,
  authorizationUrl: string,
  reference?: string,
) {
  const url = new URL(authorizationUrl);
  if (url.protocol !== "https:")
    throw new Error("The payment link is unavailable. Please retry payment.");
  localStorage.setItem(
    "pending_delivery_data",
    JSON.stringify({ id, reference, gateway: "PAYSTACK" }),
  );
  window.location.assign(url.toString());
}
