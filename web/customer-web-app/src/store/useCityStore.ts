import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ActiveCity } from "@/services/location.service";

interface CityState {
  selectedCity: ActiveCity | null;
  locationLabel: string | null;
  setSelectedCity: (city: ActiveCity | null) => void;
  setLocationLabel: (label: string | null) => void;
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      selectedCity: null,
      locationLabel: null,
      setSelectedCity: (selectedCity) => set({ selectedCity }),
      setLocationLabel: (locationLabel) => set({ locationLabel }),
    }),
    {
      name: "asoose-selected-city",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
