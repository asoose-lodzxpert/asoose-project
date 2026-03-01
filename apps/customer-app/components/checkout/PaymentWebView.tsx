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
  onFailure?: (message?: string) => void;
  onPaymentComplete?: () => void | Promise<void>;
}

export function PaymentWebView({
  visible,
  url,
  reference,
  paymentMethod,
  onSuccess,
  onCancel,
  onFailure,
  onPaymentComplete,
}: PaymentWebViewProps) {
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  const accent = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const subtle = useThemeColor({}, "surfaceSubtle");
  const textPrimary = useThemeColor({}, "textPrimary");
  const border = useThemeColor({}, "borderDefault");
  const danger = useThemeColor({}, "statusError");

  const handleFailure = (message?: string) => {
    setFailureMessage(message || "Your payment could not be completed.");
    setVerifying(false);
    if (onFailure) {
      onFailure(message);
    }
  };

  const handleNavigationStateChange = async (navState: any) => {
    const { url: currentUrl } = navState;

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

    // Native app callback URL
    if (currentUrl.startsWith("asoose-app://")) {
      setVerifying(true);
      try {
        if (urlStatus === "success") {
          const result = await checkPaymentStatus(
            urlReference || reference,
            paymentMethod as any,
          );
          if (
            result.success ||
            result.status === "SUCCESS" ||
            result.status === "COMPLETED"
          ) {
            if (onPaymentComplete) await Promise.resolve(onPaymentComplete());
            onSuccess();
          } else {
            handleFailure(
              "Payment verification failed. Please contact support.",
            );
          }
        } else if (urlStatus === "cancelled") {
          onCancel();
        } else if (urlStatus === "failed") {
          handleFailure("Your payment was declined. Please try again.");
        }
      } catch (error) {
        console.error("Payment callback error:", error);
        handleFailure("Failed to verify payment. Please contact support.");
      } finally {
        setVerifying(false);
      }
      return;
    }

    // URL contains our payment reference — verify
    if (urlReference && urlReference === reference) {
      setVerifying(true);
      try {
        const result = await checkPaymentStatus(
          reference,
          paymentMethod as any,
        );
        if (
          result.success ||
          result.status === "SUCCESS" ||
          result.status === "COMPLETED"
        ) {
          if (onPaymentComplete) await Promise.resolve(onPaymentComplete());
          onSuccess();
        } else if (result.status === "FAILED" || urlStatus === "failed") {
          handleFailure("Your payment was declined. Please try again.");
        } else if (result.status === "CANCELLED" || urlStatus === "cancelled") {
          onCancel();
        }
        // Pending — keep waiting
      } catch (error) {
        console.error("Payment verification error:", error);
        handleFailure("Failed to verify payment. Please contact support.");
      } finally {
        setVerifying(false);
      }
      return;
    }

    // Generic success indicators
    if (
      currentUrl.includes("myapp://checkout/success") ||
      (currentUrl.includes("/payment/callback") && urlStatus === "success")
    ) {
      setVerifying(true);
      try {
        const result = await checkPaymentStatus(
          reference,
          paymentMethod as any,
        );
        if (
          result.success ||
          result.status === "SUCCESS" ||
          result.status === "COMPLETED"
        ) {
          if (onPaymentComplete) await Promise.resolve(onPaymentComplete());
          onSuccess();
        } else {
          handleFailure("Payment verification failed. Please contact support.");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        handleFailure("Failed to verify payment. Please contact support.");
      } finally {
        setVerifying(false);
      }
      return;
    }

    // User cancelled on payment page
    if (currentUrl.includes("cancelled") || currentUrl.includes("cancel")) {
      onCancel();
      return;
    }

    // Explicit failure URL
    if (urlStatus === "failed") {
      handleFailure("Your payment was declined. Please try again.");
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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <View style={styles.headerTop}>
            <View style={[styles.handle, { backgroundColor: subtle }]} />
          </View>
          <View style={styles.headerContent}>
            <Pressable
              onPress={onCancel}
              style={[styles.iconButton, { backgroundColor: subtle }]}
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
          {failureMessage ? (
            <View
              style={[styles.failureContainer, { backgroundColor: surface }]}
            >
              <View
                style={[
                  styles.failureIconCircle,
                  { backgroundColor: danger + "1A" },
                ]}
              >
                <IconSymbol name="xmark.circle.fill" size={56} color={danger} />
              </View>
              <ThemedText style={styles.failureTitle}>
                Payment Failed
              </ThemedText>
              <ThemedText
                style={[styles.failureMessage, { color: textPrimary }]}
              >
                {failureMessage}
              </ThemedText>
              <Pressable
                style={[styles.failureBtn, { backgroundColor: accent }]}
                onPress={() => {
                  setFailureMessage(null);
                  onCancel();
                }}
              >
                <ThemedText style={styles.failureBtnText}>Close</ThemedText>
              </Pressable>
            </View>
          ) : verifying ? (
            <View
              style={[styles.verifyingContainer, { backgroundColor: surface }]}
            >
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
              startInLoadingState={false}
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
    opacity: 0.95,
    zIndex: 10,
  },
  verifyingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.3,
  },
  failureContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    zIndex: 10,
  },
  failureIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  failureTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  failureMessage: {
    fontSize: 15,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 22,
    marginBottom: 32,
  },
  failureBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
  },
  failureBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});
