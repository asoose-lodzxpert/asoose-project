import React from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  type TextInputProps,
} from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

type ThemedInputProps = TextInputProps & {
  iconRight?: React.ReactNode;
};

export function ThemedInput({ iconRight, style, ...props }: ThemedInputProps) {
  const backgroundColor = useThemeColor({}, 'surfaceCard');
  const borderColor = useThemeColor({}, 'borderDefault');
  const textColor = useThemeColor({}, 'textPrimary');
  const placeholderColor = useThemeColor({}, 'textDisabled');

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      <TextInput
        {...props}
        placeholderTextColor={placeholderColor}
        style={[
          styles.input,
          { color: textColor },
          style,
        ]}
      />
      {iconRight && <View style={styles.icon}>{iconRight}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  icon: {
    marginLeft: 8,
  },
});
