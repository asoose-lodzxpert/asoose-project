import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */
type DatePickerProps = {
  value?: string | Date;
  onChange: (date: Date) => void;

  label?: string;
  prompt?: string;

  minimumDate?: Date;
  maximumDate?: Date;

  placeholder?: string;
  inputProps?: Partial<React.ComponentProps<typeof ThemedInput>>;

  /* Optional styling */
  activeTextColor?: string;
  inactiveTextColor?: string;
  backgroundColor?: string;
  highlightColor?: string;
};

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const SHEET_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS + 64;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ------------------------------------------------------------------ */
/* Main Input Component */
/* ------------------------------------------------------------------ */
export function DatePicker({
  value,
  onChange,
  label,
  prompt,
  minimumDate,
  maximumDate,
  placeholder = "Select date",
  inputProps,

  activeTextColor = "#111827",
  inactiveTextColor = "#9CA3AF",
  backgroundColor = "#FFFFFF",
  highlightColor = "#E5E7EB",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const date =
    typeof value === "string" ? (value ? new Date(value) : undefined) : value;

  return (
    <View style={styles.container}>
      {label && <ThemedText type="defaultSemiBold">{label}</ThemedText>}

      <Pressable onPress={() => setOpen(true)}>
        <ThemedInput
          {...inputProps}
          editable={false}
          pointerEvents="none"
          placeholder={placeholder}
          value={date ? date.toLocaleDateString() : ""}
        />
      </Pressable>

      {prompt && <ThemedText style={styles.prompt}>{prompt}</ThemedText>}

      <WheelDateModal
        visible={open}
        value={date}
        onCancel={() => setOpen(false)}
        onConfirm={(d) => {
          onChange(d);
          setOpen(false);
        }}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        title={label ?? "Select date"}
        activeTextColor={activeTextColor}
        inactiveTextColor={inactiveTextColor}
        backgroundColor={backgroundColor}
        highlightColor={highlightColor}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom Sheet Wheel Modal */
/* ------------------------------------------------------------------ */
function WheelDateModal({
  visible,
  value,
  onCancel,
  onConfirm,
  minimumDate,
  maximumDate,
  title,
  activeTextColor,
  inactiveTextColor,
  backgroundColor,
  highlightColor,
}: {
  visible: boolean;
  value?: Date;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  title: string;

  activeTextColor: string;
  inactiveTextColor: string;
  backgroundColor: string;
  highlightColor: string;
}) {
  const initial = value ?? maximumDate ?? new Date();

  const [month, setMonth] = useState(initial.getMonth());
  const [day, setDay] = useState(initial.getDate());
  const [year, setYear] = useState(initial.getFullYear());

  const [ready, setReady] = useState(false);

  const monthRef = useRef<FlatList<string>>(null);
  const dayRef = useRef<FlatList<number>>(null);
  const yearRef = useRef<FlatList<number>>(null);

  const daysInMonth = useMemo(
    () => new Date(year, month + 1, 0).getDate(),
    [year, month]
  );

  const years = useMemo(() => {
    const min = minimumDate?.getFullYear() ?? 1950;
    const max = maximumDate?.getFullYear() ?? new Date().getFullYear();
    return Array.from({ length: max - min + 1 }, (_, i) => max - i);
  }, [minimumDate, maximumDate]);

  useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [daysInMonth]);

  // Scroll wheels to initial index when modal opens
  useEffect(() => {
    if (visible) {
      setReady(true);
    } else {
      setReady(false);
    }
  }, [visible]);

  useEffect(() => {
    if (ready) {
      monthRef.current?.scrollToOffset({
        offset: month * ITEM_HEIGHT,
        animated: false,
      });
      dayRef.current?.scrollToOffset({
        offset: (day - 1) * ITEM_HEIGHT,
        animated: false,
      });
      yearRef.current?.scrollToOffset({
        offset: years.indexOf(year) * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [ready, month, day, year, years]);

  function confirm() {
    const selected = new Date(year, month, day);
    if (minimumDate && selected < minimumDate) return;
    if (maximumDate && selected > maximumDate) return;
    onConfirm(selected);
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onCancel} />

      <View style={[styles.sheet, { backgroundColor }]}>
        {/* Toolbar */}
        <View style={styles.toolbar}>
          <Pressable onPress={onCancel}>
            <Text style={{ fontSize: 18 }}>‹</Text>
          </Pressable>

          <ThemedText type="defaultSemiBold">{title}</ThemedText>

          <Pressable onPress={confirm}>
            <ThemedText>Done</ThemedText>
          </Pressable>
        </View>

        {/* Highlight */}
        <View style={[styles.highlight, { borderColor: highlightColor }]} />

        {/* Wheels */}
        <View style={styles.wheels}>
          <Wheel
            ref={monthRef}
            data={MONTHS}
            index={month}
            onChange={setMonth}
            activeTextColor={activeTextColor}
            inactiveTextColor={inactiveTextColor}
            ready={ready}
          />
          <Wheel
            ref={dayRef}
            data={Array.from({ length: daysInMonth }, (_, i) => i + 1)}
            index={day - 1}
            onChange={(i) => setDay(i + 1)}
            activeTextColor={activeTextColor}
            inactiveTextColor={inactiveTextColor}
            ready={ready}
          />
          <Wheel
            ref={yearRef}
            data={years}
            index={years.indexOf(year)}
            onChange={(i) => setYear(years[i])}
            activeTextColor={activeTextColor}
            inactiveTextColor={inactiveTextColor}
            ready={ready}
          />
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Wheel */
/* ------------------------------------------------------------------ */
type WheelProps<T extends string | number> = {
  data: T[];
  index: number;
  onChange: (index: number) => void;
  activeTextColor: string;
  inactiveTextColor: string;
  ready: boolean;
};

const Wheel = React.forwardRef<FlatList<any>, WheelProps<any>>(
  (
    { data, index, onChange, activeTextColor, inactiveTextColor, ready },
    ref
  ) => {
    return (
      <FlatList
        ref={ref}
        data={data}
        keyExtractor={(_, i) => i.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          onChange(i);
        }}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2,
        }}
        renderItem={({ item, index: i }) => {
          const isActive = i === index;
          return (
            <View style={styles.item}>
              <Text
                style={{
                  fontSize: isActive ? 16 : 13,
                  color: isActive ? activeTextColor : inactiveTextColor,
                  opacity: isActive ? 1 : 0.6,
                }}
              >
                {item}
              </Text>
            </View>
          );
        }}
      />
    );
  }
);

/* ------------------------------------------------------------------ */
/* Styles */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    gap: 6,
  },
  prompt: {
    fontSize: 12,
    opacity: 0.6,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    height: SHEET_HEIGHT,
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  toolbar: {
    height: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wheels: {
    flexDirection: "row",
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  highlight: {
    position: "absolute",
    top: ITEM_HEIGHT * 2 + 44,
    height: ITEM_HEIGHT,
    width: "100%",
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
});
