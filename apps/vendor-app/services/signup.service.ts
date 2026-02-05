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

export async function signupVendor(data: SignupData) {
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add ngrok bypass header for development
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          name: data.step1.businessName,
          email: data.step1.businessEmail,
          password: data.step1.password,
          countryCode: data.step1.countryCode,
          phone: data.step1.phoneNumber,
          businessType: data.step1.businessType,
          employees: data.step1.employees,
          businessRegCert: data.step2.businessRegCert,
          taxIdDoc: data.step2.taxIdDoc,
          proofOfAddress: data.step2.proofOfAddress,
          image: data.step3.storeLogo,
          // Store info
          storeName: data.step3.storeName,
          storeDescription: data.step3.storeDescription,
          storeLogo: data.step3.storeLogo,
          storeBanner: data.step3.storeBanner,
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
