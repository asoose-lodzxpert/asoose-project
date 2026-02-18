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
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [progress, setProgress] = useState(0);

  const accent = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textPrimary = useThemeColor({}, "textPrimary");
  const border = useThemeColor({}, "borderDefault");

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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={[styles.container, { backgroundColor: surface }]}>
        {/* Modern Header with Handle */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <View style={styles.headerTop}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerContent}>
            <Pressable
              onPress={onCancel}
              style={styles.iconButton}
              hitSlop={20}
            >
              <IconSymbol name="xmark" size={20} color={textPrimary} />
            </Pressable>

            <View style={styles.titleContainer}>
              <ThemedText style={styles.title}>Secure Payment</ThemedText>
              <ThemedText style={styles.subtitleText}>
                Reference: {reference.slice(0, 8)}...
              </ThemedText>
            </View>

            <View style={styles.iconButtonPlaceholder} />
          </View>

          {/* Slim Progress Bar instead of huge spinner */}
          {loading && !verifying && (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: accent, width: `${progress * 100}%` },
                ]}
              />
            </View>
          )}
        </View>

        <View style={styles.webContainer}>
          {verifying ? (
            <View style={styles.verifyingContainer}>
              <ActivityIndicator size="small" color={accent} />
              <ThemedText style={styles.verifyingText}>
                Finalizing your transaction...
              </ThemedText>
            </View>
          ) : (
            <WebView
              source={{ uri: url }}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onLoadProgress={({ nativeEvent }) =>
                setProgress(nativeEvent.progress)
              }
              onNavigationStateChange={handleNavigationStateChange}
              style={styles.webView}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false} // We handle it with progress bar
            />
          )}
        </View>
        <SafeAreaView />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    paddingTop: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    alignItems: "center",
    marginBottom: 8,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E0E0E0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  subtitleText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonPlaceholder: {
    width: 32,
  },
  progressTrack: {
    height: 2,
    width: "100%",
    backgroundColor: "transparent",
  },
  progressBar: {
    height: "100%",
  },
  webContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  verifyingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    zIndex: 10,
  },
  verifyingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
});
