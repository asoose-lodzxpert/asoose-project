import React, { useState } from 'react';
import { View, Pressable, StyleSheet, FlatList } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface SelectInputProps<T extends string> {
  options: readonly T[];
  selected?: T;
  placeholder?: string;
  onSelect: (value: T) => void;
  style?: object;
}

export function SelectInput<T extends string>({
  options,
  selected,
  placeholder = 'Select',
  onSelect,
  style,
}: SelectInputProps<T>) {
  const [open, setOpen] = useState(false);
  const borderColor = useThemeColor({}, 'borderDefault');
  const primary = useThemeColor({}, 'brandPrimary');

  return (
    <View style={[styles.container, style]}>
      <Pressable
        style={[styles.input, { borderColor }]}
        onPress={() => setOpen(!open)}
      >
        <ThemedText style={{ color: selected ? undefined : '#9CA3AF' }}>
          {selected ?? placeholder}
        </ThemedText>
      </Pressable>

      {open && (
        <View style={[styles.dropdown, { borderColor }]}>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                }}
              >
                <ThemedText style={{ color: item === selected ? primary : undefined }}>
                  {item}
                </ThemedText>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', width: '100%' },
  input: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#FFF',
    zIndex: 10,
    maxHeight: 200,
  },
  option: {
    padding: 12,
  },
});
