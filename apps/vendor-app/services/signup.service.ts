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
function mapBusinessTypeToBackend(type: string): string {
  switch ((type || '').toUpperCase()) {
    case 'RESTAURANT & CAFE':
    case 'FAST FOOD':
    case 'FOOD DELIVERY':
      return 'RESTAURANT';
    case 'GROCERY & SUPERMARKET':
      return 'GROCERY';
    case 'PHARMACY':
      return 'PHARMACY';
    case 'FASHION & CLOTHING':
      return 'FASHION';
    case 'ELECTRONICS & GADGETS':
      return 'ELECTRONICS';
    case 'HOME & FURNITURE':
      return 'FURNITURE';
    case 'BEAUTY & PERSONAL CARE':
      return 'BEAUTY';
    case 'HEALTH & FITNESS':
      return 'HEALTH';
    case 'EDUCATION & TUTORING':
      return 'EDUCATION';
    case 'PROFESSIONAL SERVICES':
      return 'SERVICES';
    case 'AUTOMOTIVE':
      return 'AUTOMOTIVE';
    case 'TRAVEL & TOURISM':
      return 'TRAVEL';
    case 'ENTERTAINMENT':
      return 'ENTERTAINMENT';
    case 'RETAIL SHOP':
      return 'RETAIL';
    case 'ONLINE STORE':
      return 'ONLINE';
    case 'MANUFACTURING':
      return 'MANUFACTURING';
    case 'LOGISTICS & SHIPPING':
      return 'LOGISTICS';
    case 'OTHER':
      return 'OTHER';
    default:
      return 'OTHER';
  }
}

export async function signupVendor(data: SignupData) {
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(__DEV__ ? { "ngrok-skip-browser-warning": "true" } : {}),
        },
        body: JSON.stringify({
          name: data.step1.businessName,
          email: data.step1.businessEmail,
          password: data.step1.password,
          countryCode: data.step1.countryCode,
          phone: data.step1.phoneNumber,
          businessType: mapBusinessTypeToBackend(data.step1.businessType),
          employees: data.step1.employees,
          businessRegCert: data.step2.businessRegCertUri,
          taxIdDoc: data.step2.taxIdDocUri,
          proofOfAddress: data.step2.proofOfAddressUri,
          image: data.step3.storeLogoUri,
          // Store info
          storeName: data.step3.storeName,
          storeDescription: data.step3.storeDescription,
          storeLogo: data.step3.storeLogoUri,
          storeBanner: data.step3.storeBannerUri,
          location: data.step3.location,
          openHours: data.step3.openHours,
        }),
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
