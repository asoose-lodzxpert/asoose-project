"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support";

export default function ContactSupport() {
  const pathname = usePathname();
  const hideOnMobile = pathname.startsWith("/main/delivery");

  return (
    <a
      href={SUPPORT_WHATSAPP_URL}
      aria-label="Contact Support on WhatsApp"
      className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-3 z-40 h-12 w-12 items-center justify-center rounded-full bg-green-700 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-green-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-600 sm:right-4 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3 md:bottom-6 md:right-6 ${hideOnMobile ? "hidden sm:inline-flex" : "inline-flex"}`}
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      <span className="hidden sm:inline">Contact Support</span>
    </a>
  );
}
