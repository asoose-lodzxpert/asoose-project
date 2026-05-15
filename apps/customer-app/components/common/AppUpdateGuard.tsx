import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  Dimensions,
} from "react-native";
import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { API_BASE } from "@/constants/static-config";

const { width } = Dimensions.get("window");

interface AppVersionInfo {
  version: string;
  releaseDate: string;
}

interface AppVersionsResponse {
  customer: AppVersionInfo;
  rider: AppVersionInfo;
  vendor: AppVersionInfo;
}

// Update these with actual Store URLs
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.asoose.app";
const APP_STORE_URL = "https://apps.apple.com/app/id6470123456"; // Replace with actual ID

export const AppUpdateGuard: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<{
    isVisible: boolean;
    isMandatory: boolean;
    latestVersion: string;
  }>({
    isVisible: false,
    isMandatory: false,
    latestVersion: "",
  });

  const currentVersion = Constants.expoConfig?.version || "1.0.0";

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings/app-versions`);
      const data: AppVersionsResponse = await response.json();
      
      const latestInfo = data.customer;
      if (!latestInfo) return;

      if (isVersionLower(currentVersion, latestInfo.version)) {
        const releaseDate = new Date(latestInfo.releaseDate);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - releaseDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        setUpdateInfo({
          isVisible: true,
          isMandatory: diffDays >= 7,
          latestVersion: latestInfo.version,
        });
      }
    } catch (error) {
      console.error("Failed to check app version:", error);
    }
  };

  const isVersionLower = (current: string, latest: string) => {
    const v1 = current.split(".").map(Number);
    const v2 = latest.split(".").map(Number);
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      if (num1 < num2) return true;
      if (num1 > num2) return false;
    }
    return false;
  };

  const handleUpdate = () => {
    const url = Platform.OS === "ios" ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(url);
  };

  if (!updateInfo.isVisible) return null;

  return (
    <Modal transparent visible={updateInfo.isVisible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeInDown.springify()}
          exiting={FadeOutUp}
          style={styles.modalContainer}
        >
          <ThemedView style={styles.card}>
            <LinearGradient
              colors={["rgba(14, 165, 233, 0.1)", "transparent"]}
              style={styles.gradientHeader}
            />
            
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={["#0EA5E9", "#2563EB"]}
                style={styles.iconCircle}
              >
                <ThemedText style={styles.iconText}>🚀</ThemedText>
              </LinearGradient>
            </View>

            <ThemedText type="subtitle" style={styles.title}>
              {updateInfo.isMandatory ? "Critical Update Required" : "New Version Available"}
            </ThemedText>
            
            <ThemedText style={styles.description}>
              {updateInfo.isMandatory 
                ? "This version is no longer supported. Please update to the latest version to continue using ASOOSE."
                : `A new version (${updateInfo.latestVersion}) is available with improved features and stability.`}
            </ThemedText>

            <View style={styles.buttonContainer}>
              <TouchableOpacity activeOpacity={0.8} onPress={handleUpdate} style={styles.updateButtonWrapper}>
                <LinearGradient
                  colors={["#0EA5E9", "#2563EB"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.updateButton}
                >
                  <ThemedText style={styles.updateButtonText}>Update Now</ThemedText>
                </LinearGradient>
              </TouchableOpacity>

              {!updateInfo.isMandatory && (
                <TouchableOpacity 
                  onPress={() => setUpdateInfo(prev => ({ ...prev, isVisible: false }))}
                  style={styles.laterButton}
                >
                  <ThemedText style={styles.laterButtonText}>Maybe Later</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </ThemedView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  gradientHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  iconContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#0EA5E9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "800",
  },
  description: {
    textAlign: "center",
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
  updateButtonWrapper: {
    width: "100%",
  },
  updateButton: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  updateButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  laterButton: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  laterButtonText: {
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: 14,
  },
});
