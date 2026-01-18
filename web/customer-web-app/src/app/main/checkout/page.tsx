import { Suspense } from 'react';
import CheckoutForm from './checkoutform';
import { Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  return (
    <section className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      {/* The Suspense boundary MUST wrap any component using useSearchParams, 
          useRouter, or usePathname to avoid CSR bailout during 'next build'.
      */}
      <Suspense fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">
            Initializing Checkout...
          </p>
        </div>
      }>
        <CheckoutForm />
      </Suspense>
    </section>
  );
}