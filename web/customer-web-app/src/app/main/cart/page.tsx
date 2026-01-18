// src/app/main/cart/page.tsx
import { Suspense } from 'react';
import Cartcontent from './cartcontent';
import { Loader2 } from 'lucide-react';

export default function CartPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <Suspense fallback={
        <div className="flex h-[80vh] w-full items-center justify-center">
          <Loader2 className="animate-spin text-yellow-500" size={32} />
        </div>
      }>
        <Cartcontent />
      </Suspense>
    </main>
  );
}