import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { WhoIsRidingModalProps } from "./WhoIsRidingModal.types";

// iOS — native pageSheet modal with swipe-to-dismiss feel
export default function WhoIsRidingModal({
  visible,
  onClose,
  onConfirmSelf,
  onSelectOther,
}: WhoIsRidingModalProps) {
  const [selected, setSelected] = useState<"self" | "other">("self");

  const handleContinue = () => {
    if (selected === "self") {
      onConfirmSelf();
    } else {
      onSelectOther();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Drag handle */}
        <View style={styles.handle} />

        <Text style={styles.title}>Who is this ride for?</Text>
        <Text style={styles.subtitle}>Select who will be taking this trip</Text>

        {/* Options */}
        <TouchableOpacity
          style={[styles.option, selected === "self" && styles.optionSelected]}
          onPress={() => setSelected("self")}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === "self" }}
        >
          <View style={[styles.radio, selected === "self" && styles.radioSelected]}>
            {selected === "self" && <View style={styles.radioDot} />}
          </View>
          <View>
            <Text style={styles.optionLabel}>For Me</Text>
            <Text style={styles.optionDesc}>I am the passenger</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, selected === "other" && styles.optionSelected]}
          onPress={() => setSelected("other")}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === "other" }}
        >
          <View style={[styles.radio, selected === "other" && styles.radioSelected]}>
            {selected === "other" && <View style={styles.radioDot} />}
          </View>
          <View>
            <Text style={styles.optionLabel}>For Someone Else</Text>
            <Text style={styles.optionDesc}>Book a ride for another person</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cta} onPress={handleContinue}>
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 28,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    backgroundColor: "#FAFAFA",
  },
  optionSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 13,
    color: "#6B7280",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#6366F1",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#6366F1",
  },
  cta: {
    backgroundColor: "#6366F1",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
