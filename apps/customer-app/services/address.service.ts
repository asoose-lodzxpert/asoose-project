import { Address } from "@/types/address";

export const fetchAddresses = async (): Promise<Address[]> => {
  return new Promise((resolve) =>
    setTimeout(() => {
      resolve([
        {
          id: "home",
          label: "Home",
          address: "",
          coordinates: { lat: "", lng: "" },
          isDefault: true,
        },
        {
          id: "work",
          label: "Work",
          address: "",
          coordinates: { lat: "", lng: "" },
          isDefault: false,
        },
      ]);
    }, 500)
  );
};

export const saveAddress = async (address: Address): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 600));
};

export const deleteAddress = async (id: string): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, 400));
};
