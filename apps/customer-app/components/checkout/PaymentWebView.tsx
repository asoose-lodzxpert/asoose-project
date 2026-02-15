import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { checkPaymentStatus } from "@/services/payment.service";
import Toast from "react-native-toast-message";

interface PaymentWebViewProps {
  visible: boolean;
  url: string;
  reference: string;
  paymentMethod?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onPaymentComplete?: () => void | Promise<void>;
}

export function PaymentWebView({
  visible,
  url,
  reference,
  paymentMethod,
  onSuccess,
  onCancel,
  onPaymentComplete,
}: PaymentWebViewProps) {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const accent = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textPrimary = useThemeColor({}, "textPrimary");

  const handleNavigationStateChange = async (navState: any) => {
    const { url: currentUrl } = navState;

    // Try to extract reference and status from URL
    let urlReference: string | null = null;
    let urlStatus: string | null = null;

    try {
      const urlObj = new URL(currentUrl);
      urlReference =
        urlObj.searchParams.get("reference") ||
        urlObj.searchParams.get("tx_ref");
      urlStatus = urlObj.searchParams.get("status");
    } catch (e) {
      // Invalid URL, ignore
    }

    // Check for native app callback URL (asoose-app://payment-callback or asoose-app://...)
    if (currentUrl.startsWith("asoose-app://")) {
      setVerifying(true);

      try {
        if (urlStatus === "success") {
          // Verify payment status with backend for extra security
          const result = await checkPaymentStatus(
            urlReference || reference,
            paymentMethod as any,
          );

          if (
            result.success ||
            result.status === "SUCCESS" ||
            result.status === "COMPLETED"
          ) {
            // Execute post-payment callback before success
            if (onPaymentComplete) {
              await Promise.resolve(onPaymentComplete());
            }
            onSuccess();
          } else {
            Toast.show({
              text1: "Payment verification failed. Please contact support.",
              type: "error",
            });
            onCancel();
          }
        } else if (urlStatus === "failed") {
          onCancel();
        }
      } catch (error) {
        console.error("Payment callback error:", error);
        Toast.show({
          text1: "Failed to verify payment. Please contact support.",
          type: "error",
        });
        onCancel();
      } finally {
        setVerifying(false);
      }
      return;
    }

    // Check if URL contains our payment reference - verify status regardless of callback URL
    if (urlReference && urlReference === reference) {
      setVerifying(true);

      try {
        // Verify payment status with backend
        const result = await checkPaymentStatus(
          reference,
          paymentMethod as any,
        );

        if (
          result.success ||
          result.status === "SUCCESS" ||
          result.status === "COMPLETED"
        ) {
          // Execute post-payment callback before success
          if (onPaymentComplete) {
            await Promise.resolve(onPaymentComplete());
          }
          onSuccess();
        } else if (
          result.status === "FAILED" ||
          result.status === "CANCELLED" ||
          urlStatus === "failed" ||
          urlStatus === "cancelled"
        ) {
          onCancel();
        }
        // If status is still pending, keep waiting
      } catch (error) {
        console.error("Payment verification error:", error);
        Toast.show({
          text1: "Failed to verify payment. Please contact support.",
          type: "error",
        });
        onCancel();
      } finally {
        setVerifying(false);
      }
      return;
    }

    // Check if payment was successful (generic success indicators)
    if (
      currentUrl.includes("myapp://checkout/success") ||
      (currentUrl.includes("/payment/callback") && urlStatus === "success")
    ) {
      setVerifying(true);

      try {
        // Verify payment status with backend
        const result = await checkPaymentStatus(
          reference,
          paymentMethod as any,
        );

        if (
          result.success ||
          result.status === "SUCCESS" ||
          result.status === "COMPLETED"
        ) {
          // Execute post-payment callback before success
          if (onPaymentComplete) {
            await Promise.resolve(onPaymentComplete());
          }
          onSuccess();
        } else {
          Toast.show({
            text1: "Payment verification failed. Please contact support.",
            type: "error",
          });
          onCancel();
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        Toast.show({
          text1: "Failed to verify payment. Please contact support.",
          type: "error",
        });
        onCancel();
      } finally {
        setVerifying(false);
      }
      return;
    }

    // Check if payment was cancelled
    if (
      currentUrl.includes("cancelled") ||
      currentUrl.includes("cancel") ||
      urlStatus === "failed"
    ) {
      onCancel();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: surface }]}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle">Complete Payment</ThemedText>
          <Pressable onPress={onCancel} style={styles.closeButton}>
            <IconSymbol name="xmark" size={24} color={textPrimary} />
          </Pressable>
        </View>

        {/* WebView */}
        {verifying ? (
          <View style={styles.verifyingContainer}>
            <ActivityIndicator size="large" color={accent} />
            <ThemedText style={styles.verifyingText}>
              Verifying payment...
            </ThemedText>
          </View>
        ) : (
          <>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={accent} />
              </View>
            )}
            <WebView
              source={{ uri: url }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onNavigationStateChange={handleNavigationStateChange}
              style={styles.webView}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
            />
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },

  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1,
  },

  webView: {
    flex: 1,
  },

  verifyingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },

  verifyingText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
