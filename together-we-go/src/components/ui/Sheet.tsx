import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_WIDTH, colors, radius } from '@/theme';

import { T } from './T';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Fraction of screen height the sheet may use. */
  maxHeight?: number;
  scroll?: boolean;
}

/** Bottom sheet with a drag-handle look, slide-up animation and a tappable backdrop. */
export function Sheet({ visible, onClose, title, subtitle, children, footer, maxHeight = 0.9, scroll = true }: SheetProps) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [anim] = useState(() => new Animated.Value(0));
  // Mount as soon as we're asked to show; unmount only after the close animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      Animated.timing(anim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    } else if (mounted) {
      Animated.timing(anim, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(() =>
        setMounted(false),
      );
    }
  }, [visible, anim, mounted]);

  if (!mounted) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, 0] });

  return (
    <Modal transparent visible={mounted} onRequestClose={onClose} statusBarTranslucent animationType="none">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: anim }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
        </Animated.View>
        <View style={styles.wrap} pointerEvents="box-none">
          <Animated.View
            accessibilityViewIsModal
            style={[styles.sheet, { maxHeight: height * maxHeight, paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY }] }]}>
            <View style={styles.handle} />
            {title ? (
              <View style={{ paddingHorizontal: 22, paddingTop: 6, paddingBottom: 10 }}>
                <T variant="h2" accessibilityRole="header">
                  {title}
                </T>
                {subtitle ? (
                  <T variant="small" color={colors.textSecondary} style={{ marginTop: 2 }}>
                    {subtitle}
                  </T>
                ) : null}
              </View>
            ) : null}
            {scroll ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 12, gap: 16 }}
                showsVerticalScrollIndicator={false}>
                {children}
              </ScrollView>
            ) : (
              <View style={{ paddingHorizontal: 22, flexShrink: 1 }}>{children}</View>
            )}
            {footer ? <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>{footer}</View> : null}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: MAX_WIDTH,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl + 4,
    borderTopRightRadius: radius.xl + 4,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginTop: 10,
    marginBottom: 10,
  },
});
