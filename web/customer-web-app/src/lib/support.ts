const supportNumber = (
  process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || "+2348061966145"
).replace(/\D/g, "");

export const SUPPORT_WHATSAPP_URL = `https://wa.me/${supportNumber}?text=${encodeURIComponent(
  "Hello Asoose Support, I need help.",
)}`;
