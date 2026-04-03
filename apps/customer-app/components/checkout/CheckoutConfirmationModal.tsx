import React from 'react';
import { Modal, View, StyleSheet, Pressable, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

interface CheckoutConfirmationModalProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CheckoutConfirmationModal({ isVisible, onConfirm, onCancel }: CheckoutConfirmationModalProps) {
  const primary = useThemeColor({}, 'brandPrimary');
  const bg = useThemeColor({}, 'surfaceBackground');
  const card = useThemeColor({}, 'surfaceCard');
  const border = useThemeColor({}, 'borderDefault');
  const textMain = useThemeColor({}, 'textPrimary');
  const textSub = useThemeColor({}, 'textSecondary');
  const onPrimary = useThemeColor({}, 'textOnPrimary');
  const warning = "#F59E0B"; // Amber-500

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={[styles.content, { backgroundColor: card }]}>
          <View style={[styles.handle, { backgroundColor: border }]} />
          
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: `${warning}15` }]}>
              <IconSymbol name="phone.fill" size={32} color={warning} />
            </View>
            <ThemedText style={[styles.title, { color: textMain }]}>Order Confirmation</ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSub }]}>
              Our platform may call you to verify if an item you ordered is available or in stock.
            </ThemedText>
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={onConfirm}
              style={[styles.btn, { backgroundColor: primary }]}
            >
              <ThemedText style={[styles.btnText, { color: onPrimary }]}>Continue to Checkout</ThemedText>
            </Pressable>
            
            <Pressable
              onPress={onCancel}
              style={[styles.cancelBtn]}
            >
              <ThemedText style={[styles.cancelText, { color: textSub }]}>Go Back</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  content: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  footer: {
    gap: 12,
  },
  btn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cancelBtn: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
