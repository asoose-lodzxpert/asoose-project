import React, { memo } from "react";
import { ScrollView, Pressable, StyleSheet, View } from "react-native";
// import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  categories: CategoryOption[];
  active: string | null;
  onSelect: (categoryId: string | null) => void;
  counts?: Record<string, number>;
}

export const MenuFilters = memo(
  ({ categories, active, onSelect, counts = {} }: Props) => {
    const primary = useThemeColor({}, "brandPrimary");
    const border = useThemeColor({}, "borderDefault");
    const textSecondary = useThemeColor({}, "textSecondary");
    const textOnPrimary = useThemeColor({}, "textOnPrimary");

    return (
      <View style={styles.wrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          <FilterPill
            label="All items"
            active={active === null}
            count={Object.values(counts).reduce((a, b) => a + b, 0)}
            onPress={() => onSelect(null)}
            primary={primary}
            border={border}
            textOnPrimary={textOnPrimary}
            textSecondary={textSecondary}
          />

          {categories.map((category) => (
            <FilterPill
              key={category.id}
              label={category.name}
              active={active === category.id}
              count={counts[category.id]}
              onPress={() => onSelect(category.id)}
              primary={primary}
              border={border}
              textOnPrimary={textOnPrimary}
              textSecondary={textSecondary}
            />
          ))}
        </ScrollView>
      </View>
    );
  },
);

MenuFilters.displayName = "MenuFilters";

interface PillProps {
  label: string;
  active: boolean;
  count?: number;
  onPress: () => void;
  primary: string;
  border: string;
  textSecondary: string;
  textOnPrimary: string;
}

const FilterPill = ({
  label,
  active,
  count,
  onPress,
  primary,
  border,
  textSecondary,
  textOnPrimary,
}: PillProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          borderColor: active ? primary : border,
          backgroundColor: active ? primary : "transparent",
        },
      ]}
    >
      <ThemedText
        type="defaultSemiBold"
        style={{ color: active ? textOnPrimary : textSecondary }}
      >
        {label}
      </ThemedText>

      {/* {typeof count === "number" && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[
            styles.badge,
            { backgroundColor: active ? textOnPrimary : primary },
          ]}
        >
          <ThemedText
            style={{
              fontSize: 12,
              color: active ? primary : "#fff",
            }}
          >
            {count}
          </ThemedText>
        </Animated.View>
      )} */}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    // borderBottomWidth: StyleSheet.hairlineWidth,
    // borderColor: "#E5E7EB",
  },

  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,

    paddingHorizontal: 14,
    paddingVertical: 6,

    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,

    alignSelf: "flex-start",
  },

  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,

    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
});
