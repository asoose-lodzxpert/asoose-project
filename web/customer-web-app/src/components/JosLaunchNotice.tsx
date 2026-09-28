"use client";

import { useCityStore } from "@/store/useCityStore";

export function JosLaunchNotice() {
  const cityName = useCityStore((state) => state.selectedCity?.name);

  if (cityName?.trim().toLowerCase() !== "jos") return null;

  return (
    <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-3 text-center text-sm font-medium text-gray-900 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-100" role="status">
      We’ll be fully operational in Jos by October 26.
    </div>
  );
}
