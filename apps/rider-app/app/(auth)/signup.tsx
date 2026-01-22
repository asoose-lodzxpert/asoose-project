import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import Toast from "react-native-toast-message";

import { SignupStepper } from "@/components/signup/SignupStepper";
import { SignupNavigation } from "@/components/signup/SignupNavigation";
import { StepPersonalDetails } from "@/components/signup/StepPersonalDetails";
import { StepVehicleInfo } from "@/components/signup/StepVehicleInfo";

import { SignupForm, SignupStep } from "@/types/signup";
import { StepAccountDetails } from "@/components/signup/StepAccountDetails";
import { SignupSuccess } from "@/components/signup/SignupSuccess";
import { registerRider, uploadDocument } from "@/services/signup";
import { useRouter } from "expo-router";

export default function SignupScreen() {
  const [step, setStep] = useState<SignupStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<SignupForm>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "RIDER",
    address: "",
    phoneCode: "+234",
    phoneNumber: "",
    dob: "",
    language: null,
    state: null,
    city: null,

    vehicleType: null,
    make: "",
    model: "",
    year: "",
    color: "",
    plateNumber: "",
    documents: {
      idCard: null,
      driverLicense: null,
      vehicleInsurance: null,
      vehicleRegistration: null,
    },

    bank: null,
    accountNumber: "",
    accountName: "",
  });

  const router = useRouter();

  function update<K extends keyof SignupForm>(key: K, value: SignupForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateStep1(): boolean {
    if (!form.fullName.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("Valid email is required");
      return false;
    }
    if (!form.password || form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!form.phoneNumber.trim()) {
      setError("Phone number is required");
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (!form.vehicleType) {
      setError("Vehicle type is required");
      return false;
    }
    if (!form.make.trim()) {
      setError("Vehicle make/brand is required");
      return false;
    }
    if (!form.model.trim()) {
      setError("Vehicle model is required");
      return false;
    }
    if (!form.plateNumber.trim()) {
      setError("Plate number is required");
      return false;
    }
    if (!form.documents.driverLicense) {
      setError("Driver's license is required");
      return false;
    }
    return true;
  }

  function validateStep3(): boolean {
    if (!form.bank) {
      setError("Bank selection is required");
      return false;
    }
    if (!form.accountNumber.trim() || form.accountNumber.length < 10) {
      setError("Valid account number is required (10 digits)");
      return false;
    }
    if (!form.accountName.trim()) {
      setError("Account name is required");
      return false;
    }
    return true;
  }

  async function handleNext() {
    setError("");

    // Validate current step
    if (step === 1 && !validateStep1()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: error,
      });
      return;
    }

    if (step === 2 && !validateStep2()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: error,
      });
      return;
    }

    if (step === 3) {
      if (!validateStep3()) {
        Toast.show({
          type: "error",
          text1: "Validation Error",
          text2: error,
        });
        return;
      }

      // Submit form
      await handleSubmit();
      return;
    }

    // Move to next step
    setStep((s) => (s + 1) as SignupStep);
  }

  async function handleSubmit() {
    try {
      setLoading(true);

      // Register rider
      const response = await registerRider(form);

      Toast.show({
        type: "success",
        text1: "Registration Successful!",
        text2: "Your account has been created.",
      });

      // Move to success screen
      setStep(4);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.replace("/(auth)/signin");
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Registration failed");
      Toast.show({
        type: "error",
        text1: "Registration Failed",
        text2: e.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }

  if (step === 4) {
    return <SignupSuccess />;
  }

  return (
    <ThemedView style={styles.container}>
      <SignupStepper step={step} total={3} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {step === 1 && (
              <StepPersonalDetails data={form} onChange={update} />
            )}
            {step === 2 && <StepVehicleInfo data={form} onChange={update} />}
            {step === 3 && <StepAccountDetails data={form} onChange={update} />}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Bottom navigation */}
      <SignupNavigation
        step={step}
        loading={loading}
        onBack={() => setStep((s) => (s - 1) as SignupStep)}
        onNext={handleNext}
      />

      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
});
