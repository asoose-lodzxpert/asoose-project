import React, { useState } from "react";
import { View, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { signupVendor } from "@/services/signup.service";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ProgressBar } from "@/components/signup/ProgressBar";
import { Step1BusinessInfo } from "@/components/signup/Step1BusinessInfo";
import { Step2VerifyDocs } from "@/components/signup/Step2VerifyDocs";
import { Step3StoreSetup } from "@/components/signup/Step3StoreSetup";
import { Step4Review } from "@/components/signup/Step4Review";
import {
  SignupData,
  SignupStep1Data,
  SignupStep2Data,
  SignupStep3Data,
} from "@/types/signup";

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [data, setData] = useState<SignupData>({
    step1: {
      businessName: "",
      businessEmail: "",
      countryCode: "",
      phoneNumber: "",
      businessType: "",
      employees: "",
      password: "",
    },
    step2: {},
    step3: { storeName: "", storeDescription: "", openHours: {} },
  });

  // Change handlers
  const handleChangeStep1 = <K extends keyof SignupStep1Data>(
    key: K,
    value: SignupStep1Data[K]
  ) => {
    setData((prev: SignupData) => ({
      ...prev,
      step1: { ...prev.step1, [key]: value },
    }));
  };

  const handleChangeStep2 = <K extends keyof SignupStep2Data>(
    key: K,
    value: SignupStep2Data[K]
  ) => {
    setData((prev: SignupData) => ({
      ...prev,
      step2: { ...prev.step2, [key]: value },
    }));
  };

  const handleChangeStep3 = <K extends keyof SignupStep3Data>(
    key: K,
    value: SignupStep3Data[K]
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
        const passwordRegex =
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{8,}$/;
        if (
          !s1.businessName ||
          !s1.businessEmail ||
          !s1.countryCode ||
          !s1.phoneNumber ||
          !s1.businessType ||
          !s1.employees
        ) {
          showToast("Please fill all business information fields.");
          return false;
        }

        if (!passwordRegex.test(s1.password)) {
          showToast(
            "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol."
          );
          return false;
        }

        return true;
      case 2:
        const s2 = data.step2;
        if (!s2.businessRegCert || !s2.taxIdDoc || !s2.proofOfAddress) {
          showToast("Please upload all required documents.");
          return false;
        }
        return true;
      case 3:
        const s3 = data.step3;
        if (
          !s3.storeName ||
          !s3.storeDescription ||
          !s3.storeLogo ||
          !s3.storeBanner ||
          !s3.location
        ) {
          showToast("Please complete your store setup.");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const showToast = (message: string) => {
    if (Platform.OS === "android") {
      Toast.show({ type: "error", text1: message });
    } else {
      Alert.alert("Error", message);
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
      await signupVendor(data);
      if (Platform.OS === "android") {
        Toast.show({
          type: "success",
          text1: "Account created successfully!",
          text2: "Please login to continue",
        });
      } else {
        Alert.alert(
          "Success",
          "Account created successfully! Please login to continue.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
      }
      // Navigate to login after short delay for Android toast
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 1500);
    } catch (err) {
      // Error handled in service
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

      <View style={styles.navBar}>
        <Pressable
          style={[styles.button, step === 1 && { opacity: 0.5 }]}
          onPress={() => step > 1 && setStep(step - 1)}
          disabled={step === 1 || submitting}
        >
          <ThemedText type="defaultSemiBold">Back</ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.button,
            styles.nextButton,
            { backgroundColor: "#E5A503" },
            submitting && { opacity: 0.5 },
          ]}
          onPress={handleNext}
          disabled={submitting}
        >
          <ThemedText type="defaultSemiBold">
            {submitting ? "Creating account..." : step < 4 ? "Next" : "Submit"}
          </ThemedText>
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
    padding: 16,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: -2 },
    elevation: 5,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  nextButton: {
    flex: 1,
  },
});
