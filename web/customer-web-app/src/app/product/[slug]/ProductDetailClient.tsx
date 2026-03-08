"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShoppingBag, Plus, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useCartStore } from "@/store/useCartStore";
import { ApiService } from "@/services/api.service";

import type { Product } from "./types";
import { ImageGallery } from "./ImageGallery";
import { ProductInfo } from "./ProductInfo";
import { StoreCard } from "./StoreCard";
import { ProductCarousel, SidebarProductList } from "./ProductCarousel";
import { ModifierSheet } from "./ModifierSheet";

/* ─── Orchestrator ────────────────────────────────────────────────────────── */
export default function ProductDetailClient({ product }: { product: Product }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const addItem = useCartStore((s) => s.addItem);

  // ── Modifier selection state ─────────────────────────────────────────────
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, string[]>
  >({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modifierGroups = product.modifierGroups ?? [];

  const toggleModifier = useCallback(
    (groupId: string, modId: string, maxSelect: number) => {
      setSelectedModifiers((prev) => {
        const cur = prev[groupId] || [];
        const has = cur.includes(modId);
        if (has)
          return { ...prev, [groupId]: cur.filter((id) => id !== modId) };
        if (maxSelect === 1) return { ...prev, [groupId]: [modId] };
        if (cur.length >= maxSelect) return prev;
        return { ...prev, [groupId]: [...cur, modId] };
      });
    },
    [],
  );

  // ── Price calculation ────────────────────────────────────────────────────
  const totalPrice = useMemo(() => {
    let total = product.price;
    modifierGroups.forEach((g) => {
      (selectedModifiers[g.id] || []).forEach((mid) => {
        const mod = g.modifiers.find((m) => m.id === mid);
        if (mod) total += mod.price;
      });
    });
    return total;
  }, [product.price, modifierGroups, selectedModifiers]);

  // ── Validity check (all required groups satisfied) ───────────────────────
  const isValid = useMemo(
    () =>
      modifierGroups.every(
        (g) => (selectedModifiers[g.id] || []).length >= g.minSelect,
      ),
    [modifierGroups, selectedModifiers],
  );

  // ── Core add-to-cart logic ───────────────────────────────────────────────
  const doAddToCart = useCallback(
    async (mods: Record<string, string[]>) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const token =
          (session as any)?.accessToken || (session as any)?.user?.accessToken;
        const modifierIds: string[] = Object.values(mods).flat();

        await ApiService.post(
          "/cart/add",
          {
            productId: product.id,
            quantity: 1,
            ...(modifierIds.length > 0 && { modifierIds }),
          },
          token,
          {},
        );

        const validImages = (product.images ?? []).filter((u) =>
          u?.startsWith("http"),
        );
        const modifierNames: string[] = modifierGroups.flatMap((g) =>
          g.modifiers
            .filter((m) => modifierIds.includes(m.id))
            .map((m) => m.name),
        );

        addItem({
          id: product.id,
          name: product.name,
          price: totalPrice,
          quantity: 1,
          restaurantId: product.store?.id ?? "",
          image: validImages[0] ?? null,
          ...(modifierIds.length > 0 && { modifierIds }),
          ...(modifierNames.length > 0 && { modifierNames }),
        });

        setSheetOpen(false);
        toast.success("Added to basket");
      } catch (err: any) {
        toast.error(err?.message ?? "Could not add to cart");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isSubmitting,
      session,
      product,
      modifierGroups,
      totalPrice,
      addItem,
    ],
  );

  // ── "Add to Order" click handler ─────────────────────────────────────────
  const handleAddToOrder = useCallback(async () => {
    if (status !== "authenticated") {
      toast.info("Please log in to add items to your cart", {
        position: "bottom-center",
        autoClose: 3000,
      });
      router.push("/sign-in");
      return;
    }

    if (!isValid) {
      // Open the bottom sheet so the user can complete required selections
      setSheetOpen(true);
      return;
    }

    await doAddToCart(selectedModifiers);
  }, [status, isValid, doAddToCart, selectedModifiers, router]);

  // ── Derived helpers ──────────────────────────────────────────────────────
  const validImages = useMemo(
    () => (product.images ?? []).filter((u) => u?.startsWith("http")),
    [product.images],
  );

  const storeItemsEndpoint = `/marketplace/products/${product.slug}/store-items`;
  const relatedEndpoint = `/marketplace/products/${product.slug}/related`;
  const storeHref = product.store
    ? `/main/store/${product.store.slug ?? product.store.id}`
    : undefined;

  const hasRequiredModifiers = modifierGroups.some((g) => g.minSelect > 0);

  const addButtonLabel = isSubmitting
    ? "Adding…"
    : hasRequiredModifiers && !isValid
      ? "Select options below"
      : `Add to Order · ₦${totalPrice.toLocaleString()}`;

  return (
    <div className="text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto pb-32">
        {/* Main 2-column grid */}
        <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6 lg:p-6">
          {/* LEFT column */}
          <div className="space-y-3">
            <ImageGallery images={validImages} productName={product.name} />

            {/* Product info with interactive modifiers */}
            <ProductInfo
              product={product}
              selectedModifiers={selectedModifiers}
              onToggleModifier={toggleModifier}
            />

            {/* Mobile carousels — each self-fetches with its own skeleton */}
            <div className="lg:hidden space-y-4 px-4 py-2">
              <ProductCarousel
                title="More from this store"
                endpoint={storeItemsEndpoint}
                viewAllHref={storeHref}
              />
              <ProductCarousel
                title="You may also like"
                endpoint={relatedEndpoint}
              />
            </div>
          </div>

          {/* RIGHT sidebar — desktop only */}
          <div className="hidden lg:flex flex-col gap-4">
            {product.store && <StoreCard store={product.store} />}

            <div className="sticky top-[72px] space-y-3">
              {/* Add to Order card */}
              <div className="bg-white dark:bg-[#151515] rounded-2xl p-5">
                <div className="mb-3">
                  <span className="text-2xl font-black text-yellow-500">
                    ₦{totalPrice.toLocaleString()}
                  </span>
                  {product.stock !== undefined && product.stock < 10 && (
                    <p className="text-xs text-orange-500 mt-1">
                      Only {product.stock} left
                    </p>
                  )}
                  {hasRequiredModifiers && !isValid && (
                    <p className="text-xs text-gray-400 mt-1">
                      Select options above to continue
                    </p>
                  )}
                </div>
                <button
                  onClick={handleAddToOrder}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 active:scale-95 text-black font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-yellow-500/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ShoppingBag className="w-5 h-5" />
                  )}
                  {addButtonLabel}
                </button>
              </div>

              {/* Sidebar compact lists — each self-fetches */}
              <div className="bg-white dark:bg-[#151515] rounded-2xl p-4 space-y-4">
                <SidebarProductList
                  title="More from this store"
                  endpoint={storeItemsEndpoint}
                  limit={4}
                />
                <SidebarProductList
                  title="You may also like"
                  endpoint={relatedEndpoint}
                  limit={4}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Full-width carousels below grid (desktop) */}
        <div className="hidden lg:block space-y-4 px-6 pb-6">
          <div className="bg-white dark:bg-[#151515] rounded-2xl p-5">
            <ProductCarousel
              title="More from this store"
              endpoint={storeItemsEndpoint}
              viewAllHref={storeHref}
            />
          </div>
          <div className="bg-white dark:bg-[#151515] rounded-2xl p-5">
            <ProductCarousel
              title="Similar items you may like"
              endpoint={relatedEndpoint}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky Add to Order bar */}
      <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden px-4 pb-2">
        <button
          onClick={handleAddToOrder}
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 active:scale-95 text-black font-bold py-4 rounded-2xl transition-all shadow-xl shadow-yellow-500/20"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <ShoppingBag className="w-5 h-5" />
          )}
          {addButtonLabel}
          {!isSubmitting && <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Modifier bottom sheet — only shown when required selections are missing */}
      {modifierGroups.length > 0 && (
        <ModifierSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onConfirm={(mods) => {
            setSelectedModifiers(mods);
            doAddToCart(mods);
          }}
          modifierGroups={modifierGroups}
          initialSelections={selectedModifiers}
          productName={product.name}
          basePrice={product.price}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
