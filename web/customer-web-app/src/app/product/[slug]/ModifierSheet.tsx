"use client";

import { useEffect, useState, useMemo } from "react";
import { X, ShoppingBag, Plus } from "lucide-react";
import type { ModifierGroup } from "./types";

interface ModifierSheetProps {
  open: boolean;
  onClose: () => void;
  /** Called with the final selections when user taps "Add to Order" */
  onConfirm: (selectedModifiers: Record<string, string[]>) => void;
  modifierGroups: ModifierGroup[];
  /** Pre-populate with whatever the user already selected inline on the page */
  initialSelections: Record<string, string[]>;
  productName: string;
  basePrice: number;
  isSubmitting?: boolean;
}

/**
 * Temu/Jumia-style bottom sheet that slides up when the user taps "Add to Order"
 * without completing all required modifier selections.
 * On desktop it appears as a floating panel pinned to the bottom-right.
 */
export function ModifierSheet({
  open,
  onClose,
  onConfirm,
  modifierGroups,
  initialSelections,
  productName,
  basePrice,
  isSubmitting = false,
}: ModifierSheetProps) {
  const [selections, setSelections] = useState<Record<string, string[]>>(
    initialSelections,
  );

  // Re-sync whenever the sheet is opened (in case inline selections changed)
  useEffect(() => {
    if (open) setSelections(initialSelections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (groupId: string, modId: string, maxSelect: number) => {
    setSelections((prev) => {
      const cur = prev[groupId] || [];
      const has = cur.includes(modId);
      if (has) return { ...prev, [groupId]: cur.filter((id) => id !== modId) };
      if (maxSelect === 1) return { ...prev, [groupId]: [modId] };
      if (cur.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...cur, modId] };
    });
  };

  const totalPrice = useMemo(() => {
    let total = basePrice;
    modifierGroups.forEach((g) => {
      (selections[g.id] || []).forEach((mid) => {
        const mod = g.modifiers.find((m) => m.id === mid);
        if (mod) total += mod.price;
      });
    });
    return total;
  }, [basePrice, modifierGroups, selections]);

  const isValid = modifierGroups.every(
    (g) => (selections[g.id] || []).length >= g.minSelect,
  );

  if (!open) return null;

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet — full-width bottom sheet on mobile, floating panel on desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white dark:bg-[#1a1a1a] rounded-t-3xl shadow-2xl max-h-[88vh] lg:left-auto lg:right-8 lg:bottom-8 lg:w-[420px] lg:rounded-2xl">
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-white/15" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
          <div>
            <p className="font-bold text-sm line-clamp-1 max-w-[240px]">
              {productName}
            </p>
            <span className="text-yellow-500 font-black text-xl">
              ₦{totalPrice.toLocaleString()}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable modifier groups */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <p className="text-xs text-gray-400">
            Complete all required selections to add to your order.
          </p>

          {modifierGroups.map((group) => {
            const selectedCount = (selections[group.id] || []).length;
            const isGroupValid = selectedCount >= group.minSelect;
            const isRequired = group.minSelect > 0;

            return (
              <div key={group.id}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-sm">{group.name}</span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      isRequired
                        ? isGroupValid
                          ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-red-50 dark:bg-red-500/10 text-red-500"
                        : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {isRequired
                      ? isGroupValid
                        ? "✓ Done"
                        : "Required"
                      : "Optional"}
                    {group.maxSelect > 1 ? ` · up to ${group.maxSelect}` : ""}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {group.modifiers.map((mod) => {
                    const selected = (selections[group.id] || []).includes(
                      mod.id,
                    );
                    return (
                      <button
                        key={mod.id}
                        onClick={() =>
                          toggle(group.id, mod.id, group.maxSelect)
                        }
                        className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left transition-all ${
                          selected
                            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10"
                            : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20"
                        }`}
                      >
                        {/* Radio/checkbox dot */}
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                            selected
                              ? "border-yellow-500 bg-yellow-500"
                              : "border-gray-300 dark:border-white/25"
                          }`}
                        >
                          {selected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-snug">
                            {mod.name}
                          </p>
                          {mod.price > 0 && (
                            <p className="text-xs text-yellow-500 font-bold mt-0.5">
                              +₦{mod.price.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-white/5 flex-shrink-0">
          <button
            onClick={() => isValid && !isSubmitting && onConfirm(selections)}
            disabled={!isValid || isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-black font-bold py-4 rounded-2xl transition-all shadow-lg shadow-yellow-500/20"
          >
            <ShoppingBag className="w-5 h-5" />
            {isSubmitting
              ? "Adding…"
              : `Add to Order · ₦${totalPrice.toLocaleString()}`}
            {!isSubmitting && <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </>
  );
}
