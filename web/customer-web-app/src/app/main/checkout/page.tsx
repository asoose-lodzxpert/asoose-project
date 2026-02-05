import { Suspense } from "react";
import CheckoutForm from "./checkoutform"; // Ensure this matches your filename exactly
import { Loader2 } from "lucide-react";

// This component acts as the Server Component wrapper
export default function CheckoutPage() {
  return (
    <section className="min-h-screen bg-[#0a0a0a] text-white">
      {/* The Suspense boundary isolates the client-side navigation logic 
        (useSearchParams) inside CheckoutForm, allowing the rest of the 
        page to be statically prerendered.
      */}
      <Suspense fallback={<CheckoutLoading />}>
        <CheckoutForm />
      </Suspense>
    </section>
  );
}

// Extracted Loading Component for cleaner code
function CheckoutLoading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a0a]">
      <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
      <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 animate-pulse">
        Initializing Secure Checkout...
      </p>
    </div>
  );
}
