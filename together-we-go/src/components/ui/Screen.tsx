import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_WIDTH, colors } from '@/theme';

import { Press } from './Press';
import { FadeIn } from './motion';
import { T } from './T';

/** Classic has no wash; every other theme tints the top of the page with its colours. */
const hasWash = colors.washFrom !== colors.bg;

/** Page container: the page colour, a soft wash of the theme at the top, safe-area padding and a phone-width column on big screens. */
export function Screen({
  children,
  scroll = true,
  padded = true,
  contentStyle,
  header,
  footer,
  fab,
  fabBottom = 20,
  bottomInset = 24,
  onRefresh,
  refreshing,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  header?: ReactNode;
  footer?: ReactNode;
  /** A floating action button (see Fab), bottom right. Room is left under the content so it never covers the last row. */
  fab?: ReactNode;
  /** Distance of the fab from the bottom edge. Tab screens use the default; a stack screen passes `insets.bottom + 16` to clear the home indicator. */
  fabBottom?: number;
  bottomInset?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const inner = [padded && { paddingHorizontal: 20 }, { paddingBottom: bottomInset + (footer ? 0 : insets.bottom) + (fab ? 72 : 0) }, contentStyle];
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* The wash is a background only: it never sits behind a button or text that needs to be read on its own. */}
      {hasWash ? <LinearGradient pointerEvents="none" colors={[colors.washFrom, colors.washTo, colors.bg]} locations={[0, 0.5, 1]} style={styles.wash} /> : null}
      <View style={styles.column}>
        {header}
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={inner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.text} /> : undefined}>
            <FadeIn duration={320} distance={10}>
              {children}
            </FadeIn>
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, inner]}>{children}</View>
        )}
        {fab ? (
          <View pointerEvents="box-none" style={[styles.fab, { bottom: footer ? 16 : fabBottom }]}>
            {fab}
          </View>
        ) : null}
        {footer}
      </View>
    </View>
  );
}

/** Stack-screen header: a back button, a big condensed title with a small kicker above and a subtitle below, optional right actions. */
export function Header({ title, subtitle, kicker, right, onBack, back = true, backLabel = 'Back' }: { title: string; subtitle?: string; kicker?: string; right?: ReactNode; onBack?: () => void; back?: boolean; backLabel?: string }) {
  return (
    <View style={styles.header}>
      {back ? (
        <Press
          accessibilityLabel={`Go back to ${backLabel}`}
          style={styles.back}
          onPress={() => {
            if (onBack) onBack();
            else if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/explore');
          }}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
          <T variant="small" weight="bold">
            {backLabel}
          </T>
        </Press>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {kicker ? (
            <T variant="kicker" color={colors.textSecondary}>
              {kicker}
            </T>
          ) : null}
          <T variant="display" numberOfLines={2} accessibilityRole="header">
            {title}
          </T>
          {subtitle ? (
            <T variant="small" color={colors.textSecondary} numberOfLines={2} style={{ marginTop: 4 }}>
              {subtitle}
            </T>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', overflow: 'hidden' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  fab: { position: 'absolute', right: 20 },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16, gap: 6 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44, marginLeft: -6, paddingRight: 10 },
});
