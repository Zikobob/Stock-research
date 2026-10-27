import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_WIDTH, colors, line, radius } from '@/theme';

import { PlatePress } from './Plate';
import { Rule } from './Rule';
import { FadeIn } from './motion';
import { T } from './T';

/** Page container: the paper (or night) colour, safe-area padding and a phone-width column on big screens. No gradients: the page is flat. */
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
      <View style={styles.column}>
        {header}
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={inner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.ink} /> : undefined}>
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

/**
 * Stack-screen header, like the top of a magazine page: a square back button, a mono kicker above, the title in heavy serif,
 * a subtitle, and an ink rule underneath. Optional right-hand actions.
 */
export function Header({ title, subtitle, kicker, right, onBack, back = true, backLabel = 'Back' }: { title: string; subtitle?: string; kicker?: string; right?: ReactNode; onBack?: () => void; back?: boolean; backLabel?: string }) {
  return (
    <View style={styles.header}>
      {back ? (
        <PlatePress
          accessibilityLabel={`Go back to ${backLabel}`}
          offset={3}
          corner={radius.button}
          wrapperStyle={styles.back}
          style={styles.backFace}
          onPress={() => {
            if (onBack) onBack();
            else if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/explore');
          }}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </PlatePress>
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1 }}>
          {kicker ? (
            <View style={styles.kickerRow}>
              <View style={styles.bullet} />
              <T variant="kicker" color={colors.textSecondary}>
                {kicker}
              </T>
            </View>
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
      <Rule style={{ marginTop: 14 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', overflow: 'hidden' },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  fab: { position: 'absolute', right: 20 },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16, gap: 10 },
  back: { alignSelf: 'flex-start' },
  backFace: { width: 44, height: 44, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  bullet: { width: 10, height: 10, backgroundColor: colors.accent, borderWidth: 1.5, borderColor: colors.ink },
});
