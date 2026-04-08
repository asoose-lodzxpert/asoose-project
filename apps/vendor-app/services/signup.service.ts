import { Platform } from "react-native";
import Toast from "react-native-toast-message";

import {
  SignupStep1Data,
  SignupStep2Data,
  SignupStep3Data,
} from "@/types/signup";

export interface SignupData {
  step1: SignupStep1Data;
  step2: SignupStep2Data;
  step3: SignupStep3Data;
}

// Map frontend business type to backend
export function mapBusinessTypeToBackend(type: string): string {
  switch ((type || "").toUpperCase()) {
    case "RESTAURANT & CAFE":
    case "FAST FOOD":
    case "FOOD DELIVERY":
      return "RESTAURANT";
    case "GROCERY & SUPERMARKET":
      return "GROCERY";
    case "PHARMACY":
      return "PHARMACY";
    case "FASHION & CLOTHING":
      return "FASHION";
    case "ELECTRONICS & GADGETS":
      return "ELECTRONICS";
    case "HOME & FURNITURE":
      return "FURNITURE";
    case "BEAUTY & PERSONAL CARE":
      return "BEAUTY";
    case "HEALTH & FITNESS":
      return "HEALTH";
    case "EDUCATION & TUTORING":
      return "EDUCATION";
    case "PROFESSIONAL SERVICES":
      return "SERVICES";
    case "AUTOMOTIVE":
      return "AUTOMOTIVE";
    case "TRAVEL & TOURISM":
      return "TRAVEL";
    case "ENTERTAINMENT":
      return "ENTERTAINMENT";
    case "RETAIL SHOP":
      return "RETAIL";
    case "ONLINE STORE":
      return "ONLINE";
    case "MANUFACTURING":
      return "MANUFACTURING";
    case "LOGISTICS & SHIPPING":
      return "LOGISTICS";
    case "OTHER":
      return "OTHER";
    default:
      return "OTHER";
  }
}

export async function signupVendor(data: FormData) {
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/register`,
      {
        method: "POST",
        // Note: Don't set Content-Type header when sending FormData
        // It'll be set automatically with the boundary
        body: data,
      },
    );
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Signup failed");
    }
    return await res.json();
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (Platform.OS === "android") {
      Toast.show({ type: "error", text1: errorMsg });
    } else {
      alert(errorMsg);
    }
    throw err;
  }
}

export async function fetchActiveLocations(): Promise<{ name: string; state: string }[]> {
  const url = `${process.env.EXPO_PUBLIC_API_URL}/maps/active-locations`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch locations");
  return await res.json();
}
