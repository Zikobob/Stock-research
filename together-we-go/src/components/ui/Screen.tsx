import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_WIDTH, colors } from '@/theme';

import { IconButton } from './bits';
import { FadeIn } from './motion';
import { T } from './T';

/** Page container: cream background, safe-area padding and a phone-width column on big screens. */
export function Screen({
  children,
  scroll = true,
  padded = true,
  contentStyle,
  header,
  footer,
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
  bottomInset?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const inner = [padded && { paddingHorizontal: 20 }, { paddingBottom: bottomInset + (footer ? 0 : insets.bottom) }, contentStyle];
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Soft wash of the theme colour behind the top of every page. */}
      <LinearGradient pointerEvents="none" colors={[colors.primarySoft, colors.primarySofter, colors.bg]} locations={[0, 0.45, 1]} style={styles.wash} />
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.column}>
        {header}
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={inner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}>
            <FadeIn duration={360} distance={12}>
              {children}
            </FadeIn>
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, inner]}>{children}</View>
        )}
        {footer}
      </View>
    </View>
  );
}

/** Stack-screen header: round back button, title + subtitle, optional right actions. */
export function Header({ title, subtitle, kicker, right, onBack, back = true }: { title: string; subtitle?: string; kicker?: string; right?: ReactNode; onBack?: () => void; back?: boolean }) {
  return (
    <View style={styles.header}>
      {back ? (
        <IconButton
          icon="chevron-back"
          label="Go back"
          onPress={() => {
            if (onBack) onBack();
            else if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/explore');
          }}
        />
      ) : null}
      <View style={{ flex: 1 }}>
        {kicker ? (
          <T variant="kicker" color={colors.textSecondary}>
            {kicker}
          </T>
        ) : null}
        <T variant="h3" numberOfLines={1} accessibilityRole="header">
          {title}
        </T>
        {subtitle ? (
          <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', overflow: 'hidden' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  glow: { position: 'absolute', top: -90, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: colors.accent, opacity: 0.12 },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
});
