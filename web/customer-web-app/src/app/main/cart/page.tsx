import { Suspense } from "react";
import Cartcontent from "./cartcontent";
import { Loader2 } from "lucide-react";

export default function CartPage() {
  return (
    <Suspense fallback={<CartLoading />}>
      <Cartcontent />
    </Suspense>
  );
}

function CartLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="relative flex items-center justify-center">
        {/* The Spinner */}
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin" />

        {/* Optional: A small icon or dot in the center */}
        <div className="absolute w-2 h-2 bg-yellow-500 rounded-full" />
      </div>
    </div>
  );
}
