import { ProgressBar } from "@/components/signup/ProgressBar";
import { Step1BusinessInfo } from "@/components/signup/Step1BusinessInfo";
import { Step2VerifyDocs } from "@/components/signup/Step2VerifyDocs";
import { Step3StoreSetup } from "@/components/signup/Step3StoreSetup";
import { Step4Review } from "@/components/signup/Step4Review";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { signupVendor } from "@/services/signup.service";
import { uploadFile } from "@/services/storage.service";
import {
  SignupData,
  SignupStep1Data,
  SignupStep2Data,
  SignupStep3Data,
} from "@/types/signup";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View, ActivityIndicator } from "react-native";
import Toast from "react-native-toast-message";

export default function Signup() {
  const router = useRouter();
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
        if (!s2.businessRegCertUri || !s2.taxIdDocUri) {
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
      // Upload all files before submitting
      const uploadedData = { ...data };

      // Upload Step 2 documents
      if (data.step2.businessRegCertUri) {
        const certUrl = await uploadFile({
          uri: data.step2.businessRegCertUri,
          name: data.step2.businessRegCertName || "cert.jpg",
          type: "image/jpeg",
        });
        uploadedData.step2.businessRegCertUri = certUrl;
      }

      if (data.step2.taxIdDocUri) {
        const taxUrl = await uploadFile({
          uri: data.step2.taxIdDocUri,
          name: data.step2.taxIdDocName || "tax.jpg",
          type: "image/jpeg",
        });
        uploadedData.step2.taxIdDocUri = taxUrl;
      }

      if (data.step2.proofOfAddressUri) {
        const proofUrl = await uploadFile({
          uri: data.step2.proofOfAddressUri,
          name: data.step2.proofOfAddressName || "address.jpg",
          type: "image/jpeg",
        });
        uploadedData.step2.proofOfAddressUri = proofUrl;
      }

      // Upload Step 3 images
      if (data.step3.storeLogoUri) {
        const logoUrl = await uploadFile({
          uri: data.step3.storeLogoUri,
          name: data.step3.storeLogoName || "logo.jpg",
          type: "image/jpeg",
        });
        uploadedData.step3.storeLogoUri = logoUrl;
      }

      if (data.step3.storeBannerUri) {
        const bannerUrl = await uploadFile({
          uri: data.step3.storeBannerUri,
          name: data.step3.storeBannerName || "banner.jpg",
          type: "image/jpeg",
        });
        uploadedData.step3.storeBannerUri = bannerUrl;
      }

      // Now submit with uploaded URLs
      await signupVendor(uploadedData);
      Toast.show({
        type: "success",
        text1: "Account created successfully!",
        text2: "Please login to continue",
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
        return <Step4Review data={data} />;
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
          {submitting ? (
            <ActivityIndicator size="small" color={textOnPrimary} />
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: textOnPrimary }}>
              {step < 4 ? "Continue" : "Submit"}
            </ThemedText>
          )}
        </Pressable>
      </View>

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
