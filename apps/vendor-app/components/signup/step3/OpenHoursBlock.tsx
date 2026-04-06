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
  const textMuted = useThemeColor({}, "textMuted");
  const brandPrimary = useThemeColor({}, "brandPrimary");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ gap: 4 }}
    >
      <ThemedText type="defaultSemiBold" style={styles.blockTitle}>
        Open Hours <ThemedText style={{ color: useThemeColor({}, "statusError") }}>*</ThemedText>
      </ThemedText>

      {DAYS.map((day, i) => {
        const h = value[day] || {};

        const update = (patch: Partial<OpenHour>) =>
          onChange({
            ...value,
            [day]: { ...h, ...patch },
          });

        return (
          <View
            key={day}
            style={[
              styles.dayRow,
              {
                borderBottomColor:
                  i < DAYS.length - 1 ? borderDefault : "transparent",
              },
            ]}
          >
            {/* Day name */}
            <ThemedText style={styles.dayLabel}>
              {day.charAt(0).toUpperCase() + day.slice(1)}
            </ThemedText>

            {h.closed ? (
              <ThemedText style={[styles.closedText, { color: textMuted }]}>
                Closed
              </ThemedText>
            ) : h.is24Hours ? (
              <ThemedText style={[styles.closedText, { color: brandPrimary }]}>
                24 hrs
              </ThemedText>
            ) : (
              <View style={styles.timesRow}>
                <ThemedInput
                  style={styles.timeInput}
                  editable
                  value={h.open}
                  onChangeText={(v) => update({ open: v })}
                  placeholder="09:00"
                  keyboardType="numeric"
                />
                <ThemedText style={{ color: textMuted }}>–</ThemedText>
                <ThemedInput
                  style={styles.timeInput}
                  editable
                  value={h.close}
                  onChangeText={(v) => update({ close: v })}
                  placeholder="18:00"
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Options */}
            <View style={styles.optionsRow}>
              <View style={styles.checkboxItem}>
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
                <ThemedText style={styles.checkboxLabel}>24h</ThemedText>
              </View>

              <Switch
                value={!!h.closed}
                onValueChange={(v) => update({ closed: v })}
                trackColor={{ true: brandPrimary }}
              />
            </View>
          </View>
        );
      })}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  blockTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  dayLabel: {
    width: 75,
    fontSize: 13,
    fontWeight: "500",
    flexShrink: 0,
  },
  timesRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeInput: {
    width: 70,
    textAlign: "center",
  },
  closedText: {
    flex: 1,
    fontSize: 13,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 12,
  },
});
