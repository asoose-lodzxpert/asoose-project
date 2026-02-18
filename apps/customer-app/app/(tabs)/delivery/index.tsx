import { LocationCard } from "@/components/delivery/LocationCard";
import { PackageDetailsSection } from "@/components/delivery/PackageDetailsSection";
import { PackageSizeSelector } from "@/components/delivery/PackageSizeSelector";
import { QuoteBottomSheet } from "@/components/delivery/QuoteBottomSheet";
import { ThemedView } from "@/components/themed-view";
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  View,
  StyleSheet,
} from "react-native";
import { useEffect, useState } from "react";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function SendPackageScreen() {
  return <Screen />;
}

function Screen() {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const textSecondary = useThemeColor({}, "textSecondary");

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
      <View style={styles.header}>
        <ThemedText type="title">Request Delivery</ThemedText>
        <ThemedText type="caption" style={{ color: textSecondary }}>
          Enter your delivery details
        </ThemedText>
      </View>
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

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
});
