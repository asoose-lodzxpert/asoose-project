import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from "react-native";
import { ThemedInput } from "@/components/ThemedInput";
import { ThemedText } from "@/components/themed-text";
import { CustomDropdown } from "@/components/CustomDropdown";
import {
  BUSINESS_TYPES,
  EMPLOYEE_RANGES,
  COUNTRY_CODES,
  BusinessType,
  EmployeeRange,
  CountryCode,
} from "@/config/signup";
import { SignupStep1Data } from "@/types/signup";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Step1Props {
  data: SignupStep1Data;
  onChange: <K extends keyof SignupStep1Data>(
    key: K,
    value: SignupStep1Data[K]
  ) => void;
}

export const Step1BusinessInfo: React.FC<Step1Props> = ({ data, onChange }) => {
  const brandPrimary = useThemeColor({}, "brandPrimary");
  const successColor = useThemeColor({}, "statusSuccess");
  const errorColor = useThemeColor({}, "statusError");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // Password validation state
  const [validations, setValidations] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  });

  useEffect(() => {
    setValidations({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-[\]{};':"\\|,.<>/?]/.test(password),
    });
    onChange("password", password);
  }, [password]);

  const renderValidation = (label: string, valid: boolean) => (
    <View style={styles.validationRow} key={label}>
      <IconSymbol
        name={valid ? "check" : "xmark"}
        size={16}
        color={valid ? successColor : errorColor}
      />
      <ThemedText style={{ color: valid ? successColor : errorColor }}>
        {label}
      </ThemedText>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title">Let's get started</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Tell us about your business
        </ThemedText>

        {/* Business Name */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Business name</ThemedText>
          <ThemedInput
            placeholder="What is your registered business name?"
            value={data.businessName}
            onChangeText={(v) => onChange("businessName", v)}
          />
        </View>

        {/* Business Email */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Business email</ThemedText>
          <ThemedInput
            placeholder="Where can we reach your business?"
            value={data.businessEmail}
            onChangeText={(v) => onChange("businessEmail", v)}
            keyboardType="email-address"
          />
        </View>

        {/* Phone */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Business phone number</ThemedText>
          <View style={styles.row}>
            <CustomDropdown
              data={COUNTRY_CODES.map((code) => ({ label: code, value: code }))}
              value={data.countryCode || null}
              onChange={(v) => onChange("countryCode", v as CountryCode)}
              placeholder="Code"
              containerStyle={{ flex: 2 }}
            />
            <ThemedInput
              placeholder="Enter phone number"
              value={data.phoneNumber}
              onChangeText={(v) => onChange("phoneNumber", v)}
              keyboardType="phone-pad"
              containerStyle={{ flex: 4 }}
            />
          </View>
        </View>

        {/* Business Type */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Type of business</ThemedText>
          <CustomDropdown
            data={BUSINESS_TYPES.map((type) => ({ label: type, value: type }))}
            value={data.businessType || null}
            onChange={(v) => onChange("businessType", v as BusinessType)}
            placeholder="Select your business category"
          />
        </View>

        {/* Employees */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Number of employees</ThemedText>
          <CustomDropdown
            data={EMPLOYEE_RANGES.map((range) => ({
              label: range,
              value: range,
            }))}
            value={data.employees || null}
            onChange={(v) => onChange("employees", v as EmployeeRange)}
            placeholder="Choose an employee range"
          />
        </View>

        {/* Password */}
        <View style={styles.field}>
          <ThemedText type="defaultSemiBold">Password</ThemedText>
          <ThemedInput
            placeholder="Password"
            secureTextEntry={secure}
            value={password}
            onFocus={() => {
              setIsPasswordFocused(true);
              scrollRef.current?.scrollToEnd({ animated: true });
            }}
            onBlur={() => setIsPasswordFocused(false)}
            onChangeText={(text) => setPassword(text)}
            iconRight={
              <Pressable onPress={() => setSecure(!secure)}>
                <IconSymbol
                  size={24}
                  name={secure ? "eye.fill" : "eye.slash.fill"}
                  color={brandPrimary}
                />
              </Pressable>
            }
          />
          {isPasswordFocused && (
            <View style={styles.validationContainer}>
              {renderValidation("At least 8 characters", validations.length)}
              {renderValidation(
                "At least 1 uppercase letter",
                validations.uppercase
              )}
              {renderValidation(
                "At least 1 lowercase letter",
                validations.lowercase
              )}
              {renderValidation("At least 1 number", validations.number)}
              {renderValidation("At least 1 symbol", validations.symbol)}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 16,
    paddingBottom: 24,
  },
  subtitle: {
    marginVertical: 8,
  },
  field: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  validationContainer: {
    marginTop: 8,
    gap: 4,
  },
  validationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
