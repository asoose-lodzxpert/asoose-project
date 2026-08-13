import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ActiveCity } from "@/services/location.service";

interface CityState {
  selectedCity: ActiveCity | null;
  setSelectedCity: (city: ActiveCity) => void;
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      selectedCity: null,
      setSelectedCity: (selectedCity) => set({ selectedCity }),
    }),
    {
      name: "asoose-selected-city",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
