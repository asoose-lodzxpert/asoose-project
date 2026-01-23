import { LocationCard } from "@/components/delivery/LocationCard";
import { PackageDetailsSection } from "@/components/delivery/PackageDetailsSection";
import { PackageSizeSelector } from "@/components/delivery/PackageSizeSelector";
import { QuoteBottomSheet } from "@/components/delivery/QuoteBottomSheet";
import { SendPackageHeader } from "@/components/delivery/SendPackageHeader";
import { ThemedView } from "@/components/themed-view";
import { useSendPackage } from "@/context/SendPackageContext";
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { useEffect, useState } from "react";

export default function SendPackageScreen() {
  return <Screen />;
}

function Screen() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return (
    <ThemedView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 10}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: keyboardVisible ? 16 : 100,
          }}
        >
          <LocationCard type="pickup" title="Pickup Location" />

          <LocationCard type="delivery" title="Delivery Location" />
          <PackageSizeSelector />
          <PackageDetailsSection />
        </ScrollView>
      </KeyboardAvoidingView>

      <QuoteBottomSheet />
    </ThemedView>
  );
}
