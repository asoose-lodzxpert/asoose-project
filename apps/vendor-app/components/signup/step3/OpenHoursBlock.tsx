import React from "react";
import {
  View,
  StyleSheet,
  Switch,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { OpenHour } from "@/types/signup";
import { DAYS } from "@/config/signup";
import { Checkbox } from "react-native-paper";
import { useThemeColor } from "@/hooks/use-theme-color";

interface Props {
  value: Record<string, OpenHour>;
  onChange: (v: Record<string, OpenHour>) => void;
}

export const OpenHoursBlock: React.FC<Props> = ({ value, onChange }) => {
  const borderDefault = useThemeColor({}, "borderDefault");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ gap: 12 }}
    >
      <ThemedText>Open Hours</ThemedText>

      {DAYS.map((day) => {
        const h = value[day] || {};

        const update = (patch: Partial<OpenHour>) =>
          onChange({
            ...value,
            [day]: { ...h, ...patch },
          });

        return (
          <View
            key={day}
            style={[styles.dayContainer, { borderColor: borderDefault }]}
          >
            <ThemedText style={styles.dayLabel}>
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </ThemedText>

            <View style={styles.inputsRow}>
              <View style={styles.inputContainer}>
                <ThemedText>Open</ThemedText>
                <ThemedInput
                  style={styles.timeInput}
                  editable={!h.closed && !h.is24Hours}
                  value={h.open}
                  onChangeText={(v) => update({ open: v })}
                  placeholder="HH:MM"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <ThemedText>Close</ThemedText>
                <ThemedInput
                  style={styles.timeInput}
                  editable={!h.closed && !h.is24Hours}
                  value={h.close}
                  onChangeText={(v) => update({ close: v })}
                  placeholder="HH:MM"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.optionsRow}>
              <View style={styles.checkboxContainer}>
                <Checkbox
                  status={h.is24Hours ? "checked" : "unchecked"}
                  onPress={() =>
                    update({
                      is24Hours: !h.is24Hours,
                      open: !h.is24Hours ? "00:00" : h.open,
                      close: !h.is24Hours ? "24:00" : h.close,
                    })
                  }
                />
                <ThemedText>24 Hours</ThemedText>
              </View>

              <View style={styles.checkboxContainer}>
                <Switch
                  value={h.closed}
                  onValueChange={(v) => update({ closed: v })}
                />
                <ThemedText>Closed</ThemedText>
              </View>
            </View>
          </View>
        );
      })}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  dayContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },

  dayLabel: {
    fontWeight: "bold",
    fontSize: 16,
  },

  inputsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  inputContainer: {
    flex: 1,
    gap: 4,
  },

  timeInput: {
    width: "100%",
  },

  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
