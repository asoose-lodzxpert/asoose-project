import { ProgressBar } from "@/components/signup/ProgressBar";
import { SignupProgress } from "@/components/signup/SignupProgress";
import { Step1BusinessInfo } from "@/components/signup/Step1BusinessInfo";
import { Step2VerifyDocs } from "@/components/signup/Step2VerifyDocs_new";
import { Step3StoreSetup } from "@/components/signup/Step3StoreSetup";
import { Step4Review } from "@/components/signup/Step4Review";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { signupVendor } from "@/services/signup.service";
import * as WebBrowser from "expo-web-browser";
import {
  SignupData,
  SignupStep1Data,
  SignupStep2Data,
  SignupStep3Data,
} from "@/types/signup";
import { mapBusinessTypeToBackend } from "@/services/signup.service";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { Pressable, StyleSheet, View, ActivityIndicator, Platform } from "react-native";
import Toast from "react-native-toast-message";

const VENDOR_ONBOARDING_URL = "https://asoose.com/vendor/register";

export default function Signup() {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "ios") {
      WebBrowser.openBrowserAsync(VENDOR_ONBOARDING_URL);
      // Also go back so they don't see the form if they dismiss the browser
      router.back();
    }
  }, []);

  if (Platform.OS === "ios") {
    return (
      <ThemedView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <ActivityIndicator size="large" />
          <ThemedText style={{ marginTop: 16 }}>Redirecting to web registration...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [data, setData] = useState<SignupData>({
    step1: {
      businessName: "",
      businessEmail: "",
      businessEmailVerified: false,
      otpCode: "",
      otpSent: false,
      countryCode: "",
      phoneNumber: "",
      businessType: "",
      employees: "",
      password: "",
    },
    step2: {},
    step3: { storeName: "", storeDescription: "", openHours: {} },
    acceptedTerms: false,
  });

  const surfaceCard = useThemeColor({}, "surfaceCard");
  const border = useThemeColor({}, "borderDefault");
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const textSecondary = useThemeColor({}, "textSecondary");

  // Change handlers
  const handleChangeStep1 = <K extends keyof SignupStep1Data>(
    key: K,
    value: SignupStep1Data[K],
  ) => {
    setData((prev: SignupData) => ({
      ...prev,
      step1: { ...prev.step1, [key]: value },
    }));
  };

  const handleChangeStep2 = <K extends keyof SignupStep2Data>(
    key: K,
    value: SignupStep2Data[K],
  ) => {
    setData((prev: SignupData) => ({
      ...prev,
      step2: { ...prev.step2, [key]: value },
    }));
  };

  const handleChangeStep3 = <K extends keyof SignupStep3Data>(
    key: K,
    value: SignupStep3Data[K],
  ) => {
    setData((prev: SignupData) => ({
      ...prev,
      step3: { ...prev.step3, [key]: value },
    }));
  };

  // Validation per step
  const validateStep = (): boolean => {
    switch (step) {
      case 1:
        const s1 = data.step1;

        // Check email verification
        if (!s1.businessEmailVerified) {
          Toast.show({ text1: "Please verify your email first." });
          return false;
        }

        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{8,}$/;

        if (
          !s1.businessName ||
          !s1.phoneNumber ||
          !s1.businessType ||
          !s1.employees
        ) {
          Toast.show({ text1: "Please fill all required fields." });
          return false;
        }

        if (!passwordRegex.test(s1.password)) {
          Toast.show({
            text1:
              "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol.",
          });
          return false;
        }

        return true;
      case 2:
        const s2 = data.step2;
        if (
          !s2.businessRegCertUri ||
          !s2.taxIdDocUri ||
          !s2.proofOfAddressUri
        ) {
          Toast.show({ text1: "Please select all required documents." });
          return false;
        }
        return true;
      case 3:
        const s3 = data.step3;
        if (
          !s3.storeName ||
          !s3.storeDescription ||
          !s3.storeLogoUri ||
          !s3.storeBannerUri ||
          !s3.location
        ) {
          Toast.show({ text1: "Please complete your store setup." });
          return false;
        }

        if (!s3.cityId) {
          Toast.show({
            text1: "City Required",
            text2: "Please select the city where your store operates.",
          });
          return false;
        }

        // Check if openHours is fully filled (7 days)
        const daysCount = Object.keys(s3.openHours || {}).length;
        if (daysCount < 7) {
          Toast.show({
            text1: "Opening Hours Required",
            text2: "Please set hours for all 7 days of the week.",
          });
          return false;
        }

        // Additional check: make sure every day has either open/close or closed set
        const complete = Object.values(s3.openHours || {}).every(
          (h: any) => h.closed || h.is24Hours || (h.open && h.close),
        );
        if (!complete) {
          Toast.show({
            text1: "Incomplete Hours",
            text2: "Each day must have open/close times or be marked as closed.",
          });
          return false;
        }

        return true;
      case 4:
        if (!data.acceptedTerms) {
          Toast.show({
            type: "error",
            text1: "Accept Terms",
            text2: "You must accept the terms and conditions to continue.",
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;

    if (step < 4) {
      setStep(step + 1);
    } else {
      // Final submission
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();

      // Step 1 Data
      formData.append("name", data.step1.businessName);
      formData.append("email", data.step1.businessEmail);
      formData.append("password", data.step1.password);
      formData.append("countryCode", data.step1.countryCode);
      formData.append("phone", data.step1.phoneNumber);
      formData.append(
        "businessType",
        mapBusinessTypeToBackend(data.step1.businessType),
      );
      formData.append("employees", data.step1.employees);

      // Step 2 Documents (No Public Uploads - send as files)
      if (data.step2.businessRegCertUri) {
        // @ts-ignore
        formData.append("businessRegCert", {
          uri: data.step2.businessRegCertUri,
          name: data.step2.businessRegCertName || "cert.jpg",
          type: "image/jpeg",
        });
      }

      if (data.step2.taxIdDocUri) {
        // @ts-ignore
        formData.append("taxIdDoc", {
          uri: data.step2.taxIdDocUri,
          name: data.step2.taxIdDocName || "tax.jpg",
          type: "image/jpeg",
        });
      }

      if (data.step2.proofOfAddressUri) {
        // @ts-ignore
        formData.append("proofOfAddress", {
          uri: data.step2.proofOfAddressUri,
          name: data.step2.proofOfAddressName || "address.jpg",
          type: "image/jpeg",
        });
      }

      // Step 3 Store & Images
      formData.append("storeName", data.step3.storeName);
      formData.append("storeDescription", data.step3.storeDescription);

      if (data.step3.storeLogoUri) {
        // @ts-ignore
        formData.append("storeLogo", {
          uri: data.step3.storeLogoUri,
          name: data.step3.storeLogoName || "logo.jpg",
          type: "image/jpeg",
        });
      }

      if (data.step3.storeBannerUri) {
        // @ts-ignore
        formData.append("storeBanner", {
          uri: data.step3.storeBannerUri,
          name: data.step3.storeBannerName || "banner.jpg",
          type: "image/jpeg",
        });
      }

      formData.append("location", JSON.stringify(data.step3.location));
      formData.append("openHours", JSON.stringify(data.step3.openHours));
      if (data.step3.cityId) {
        formData.append("cityId", data.step3.cityId);
      }

      // Now submit with all data in one request
      await signupVendor(formData);
      Toast.show({
        type: "success",
        text1: "Application submitted!",
        text2: "Our team will review your account shortly.",
      });
      // Navigate to login after short delay
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 1500);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Signup failed",
        text2: err.message || "Please try again",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1BusinessInfo data={data.step1} onChange={handleChangeStep1} />
        );
      case 2:
        return (
          <Step2VerifyDocs data={data.step2} onChange={handleChangeStep2} />
        );
      case 3:
        return (
          <Step3StoreSetup data={data.step3} onChange={handleChangeStep3} />
        );
      case 4:
        return (
          <Step4Review
            data={data}
            onCheck={(v) => setData({ ...data, acceptedTerms: v })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ProgressBar step={step} />
      <View style={{ flex: 1, paddingHorizontal: 24 }}>{renderStep()}</View>

      <View
        style={[
          styles.navBar,
          {
            backgroundColor: surfaceCard,
            borderTopColor: border,
            borderTopWidth: 1,
          },
        ]}
      >
        <Pressable
          style={[
            styles.button,
            styles.backButton,
            { borderColor: border },
            step === 1 && { opacity: 0.4 },
          ]}
          onPress={() => step > 1 && setStep(step - 1)}
          disabled={step === 1 || submitting}
        >
          <ThemedText type="defaultSemiBold" style={{ color: textSecondary }}>
            Back
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.nextButton,
            { backgroundColor: brandPrimary },
            submitting && { opacity: 0.6 },
          ]}
          onPress={handleNext}
          disabled={submitting}
        >
          <ThemedText type="defaultSemiBold" style={{ color: textOnPrimary }}>
            {step < 4 ? "Continue" : "Submit"}
          </ThemedText>
        </Pressable>
      </View>

      <SignupProgress visible={submitting} />
      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  button: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  backButton: {
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  nextButton: {
    flex: 1,
  },
});
