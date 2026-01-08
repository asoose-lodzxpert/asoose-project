import React, { useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { ThemedView } from "@/components/themed-view";

import { SignupStepper } from "@/components/signup/SignupStepper";
import { SignupNavigation } from "@/components/signup/SignupNavigation";
import { StepPersonalDetails } from "@/components/signup/StepPersonalDetails";
import { StepVehicleInfo } from "@/components/signup/StepVehicleInfo";

import { SignupForm, SignupStep } from "@/types/signup";
import { StepAccountDetails } from "@/components/signup/StepAccountDetails";
import { SignupSuccess } from "@/components/signup/SignupSuccess";

export default function SignupScreen() {
  const [step, setStep] = useState<SignupStep>(1);

  const [form, setForm] = useState<SignupForm>({
    fullName: "",
    address: "",
    phoneCode: "",
    phoneNumber: "",
    dob: "",
    language: null,
    state: null,
    city: null,

    vehicleType: null,
    make: "",
    model: "",
    color: "",
    plateNumber: "",
    documents: {
      id: null,
      license: null,
      insurance: null,
    },

    bank: null,
    accountNumber: "",
    accountName: "",
  });

  function update<K extends keyof SignupForm>(key: K, value: SignupForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (step === 4) {
    return <SignupSuccess />;
  }

  return (
    <ThemedView style={styles.container}>
      <SignupStepper step={step} total={3} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {step === 1 && <StepPersonalDetails data={form} onChange={update} />}
        {step === 2 && <StepVehicleInfo data={form} onChange={update} />}
        {step === 3 && <StepAccountDetails data={form} onChange={update} />}
      </ScrollView>

      {/* Bottom navigation */}
      <SignupNavigation
        step={step}
        onBack={() => setStep((s) => (s - 1) as SignupStep)}
        onNext={() => setStep((s) => (s + 1) as SignupStep)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
});
