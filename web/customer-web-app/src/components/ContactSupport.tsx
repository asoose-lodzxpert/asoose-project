import { MessageCircle } from "lucide-react";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support";

export default function ContactSupport() {
  return (
    <a
      href={SUPPORT_WHATSAPP_URL}
      aria-label="Contact Support on WhatsApp"
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex items-center gap-2 rounded-full bg-green-700 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-600 md:bottom-6 md:right-6"
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      Contact Support
    </a>
  );
}
