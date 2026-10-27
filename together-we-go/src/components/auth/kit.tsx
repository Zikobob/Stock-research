/** The small parts the first-run, sign-in, sign-up and reset screens share. Everything is drawn from tokens, so it reads in light and dark. */
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode, RefObject } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { showLegal } from './legal';
import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import type { IconName } from '@/components/ui/bits';
import { colors, line, radius } from '@/theme';

import { meterView, type MeterTone } from './logic';

/**
 * The page of a form screen: paper, an optional header, and a scroll that keeps clear of the keyboard (on iPhone the page is lifted by the
 * keyboard's height, as in Chat and Make it yours; on Android the window resizes).
 */
export function AuthScreen({ header, children, scrollRef, top = 8 }: { header?: ReactNode; children: ReactNode; scrollRef?: RefObject<ScrollView | null>; top?: number }) {
  return (
    <Screen scroll={false} padded={false} bottomInset={0} header={header}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: top, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <FadeIn duration={320} distance={10}>
            {children}
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const TONE = {
  danger: { fg: colors.red, bg: colors.redSoft, border: colors.red },
  warn: { fg: colors.warn, bg: colors.warnSoft, border: colors.warn },
  positive: { fg: colors.positive, bg: colors.positiveSoft, border: colors.positive },
} as const;

/** A message with a state colour, an icon and words (never colour alone): the sign-in error, for example. */
export function Notice({ tone = 'danger', icon = 'alert-circle', children }: { tone?: keyof typeof TONE; icon?: IconName; children: ReactNode }) {
  const c = TONE[tone];
  return (
    <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={[styles.notice, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Ionicons name={icon} size={20} color={c.fg} />
      <T variant="small" weight="semibold" color={c.fg} style={{ flex: 1 }}>
        {children}
      </T>
    </View>
  );
}

/** The invite code someone arrived with, kept until they are signed in: a dashed outline like the invite chip on a ticket. */
export function InviteNote({ code, onRemove }: { code: string; onRemove?: () => void }) {
  return (
    <View style={styles.invite}>
      <Ionicons name="ticket-outline" size={22} color={colors.ink} />
      <View style={{ flex: 1 }}>
        <T variant="kicker" color={colors.textSecondary} style={{ fontSize: 10 }}>
          Invite code
        </T>
        <T variant="numeralSm" style={{ fontSize: 18, lineHeight: 22 }}>
          {code}
        </T>
        <T variant="caption" color={colors.textSecondary}>
          Sign in or create an account and you land in the trip.
        </T>
      </View>
      {onRemove ? (
        <Press onPress={onRemove} accessibilityLabel="Remove the invite code" style={styles.remove}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </Press>
      ) : null}
    </View>
  );
}

/**
 * A tick box you can hit: a 56 high row, an outlined square that fills with the accent and shows a tick when chosen.
 * One control (a checkbox), so put no other button inside it.
 */
export function CheckRow({ checked, onPress, label, error, children }: { checked: boolean; onPress: () => void; label?: string; error?: string | null; children: ReactNode }) {
  return (
    <View style={{ gap: 4 }}>
      <Press onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} scaleTo={0.99} style={styles.check}>
        <View style={[styles.box, checked && { backgroundColor: colors.accent }, !!error && { borderColor: colors.red }]}>
          {checked ? <Ionicons name="checkmark" size={18} color={colors.onAccent} /> : null}
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </Press>
      {error ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={16} color={colors.red} />
          <T variant="caption" color={colors.red} style={{ flex: 1 }}>
            {error}
          </T>
        </View>
      ) : null}
    </View>
  );
}

/** Four segments that fill as the password gets stronger: red, amber, green, each with an icon and a word. */
export function PasswordMeter({ password }: { password: string }) {
  const v = meterView(password);
  if (!v) return null;
  const c = TONE[v.tone as MeterTone];
  return (
    <View style={{ gap: 6 }} accessibilityLabel={`Password strength: ${v.label}`}>
      <View style={styles.segRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.meterSeg, i < v.filled && { backgroundColor: c.fg }]} />
        ))}
      </View>
      <View style={styles.errorRow}>
        <Ionicons name={v.icon} size={16} color={c.fg} />
        <T variant="caption" weight="semibold" color={c.fg}>
          {v.label}
        </T>
      </View>
    </View>
  );
}

/** "Step 2 of 3" as a row of ticket stubs: the ones behind you are inked, the one you are on is the accent. */
export function StepSegments({ now, total, label = 'Step' }: { now: number; total: number; label?: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={`${label} ${now} of ${total}`} accessibilityValue={{ min: 1, max: total, now }} style={styles.segRow}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.seg, { backgroundColor: i + 1 < now ? colors.ink : i + 1 === now ? colors.accent : 'transparent' }]} />
      ))}
    </View>
  );
}

/** Terms and Privacy as two real links (each 44 high) that open the short notes. */
export function LegalLinks({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.legal, style]}>
      {(['Terms of Service', 'Privacy Policy'] as const).map((title) => (
        <Press key={title} onPress={() => showLegal(title)} accessibilityRole="link" accessibilityLabel={`Read the ${title}`} style={styles.legalLink}>
          <T variant="kicker" color={colors.textSecondary} style={{ textDecorationLine: 'underline' }}>
            {title}
          </T>
        </Press>
      ))}
    </View>
  );
}

/** A quiet underlined text link, 44 high: "Forgot password?". */
export function TextLink({ label, onPress, role = 'link', style }: { label: string; onPress?: () => void; role?: 'link' | 'button'; style?: StyleProp<ViewStyle> }) {
  return (
    <Press onPress={onPress} accessibilityRole={role} accessibilityLabel={label} style={[styles.textLink, style]}>
      <T variant="small" weight="bold" style={{ textDecorationLine: 'underline' }}>
        {label}
      </T>
    </Press>
  );
}

const styles = StyleSheet.create({
  invite: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.chip, borderWidth: line, borderStyle: 'dashed', borderColor: colors.ink, backgroundColor: colors.accentSoft },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, borderRadius: radius.button, borderWidth: line },
  check: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
  box: { width: 28, height: 28, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  segRow: { flexDirection: 'row', gap: 5 },
  meterSeg: { flex: 1, height: 12, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: 'transparent' },
  seg: { flex: 1, height: 12, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink },
  legal: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20 },
  legalLink: { minHeight: 44, justifyContent: 'center' },
  textLink: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-start' },
});
