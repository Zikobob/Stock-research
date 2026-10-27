import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { IconButton } from '@/components/ui/bits';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import { copy } from '@/services/share';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/store/seed';
import { colors, line, radius } from '@/theme';

const ROWS = [
  { key: 'Email', value: DEMO_EMAIL },
  { key: 'Password', value: DEMO_PASSWORD },
] as const;

/**
 * The way in for judges and first-time visitors, drawn as a boarding pass with an accent-coloured main part: pressing the main part fills the sign-in
 * form with Maya's account; under the tear line are the email and password in print, each with its own copy button. The copy buttons
 * sit beside the text, never inside another button (a button inside a button is invalid on the web).
 */
export function DemoTicket({ title, onFill, filled }: { title: string; onFill: () => void; filled?: boolean }) {
  // on a very narrow phone the email needs a smaller print to stay on one line
  const narrow = useWindowDimensions().width < 350;
  return (
    <Ticket
      stub={
        <View style={styles.stub}>
          {ROWS.map((r) => (
            <View key={r.key} style={styles.row}>
              <View style={{ flex: 1 }}>
                <T variant="kicker" color={colors.textSecondary} style={{ fontSize: 10 }}>
                  {r.key}
                </T>
                <T variant="numeralSm" style={[styles.value, narrow && { fontSize: 12.5, letterSpacing: -0.5 }]} selectable>
                  {r.value}
                </T>
              </View>
              <IconButton icon="copy-outline" label={`Copy demo ${r.key.toLowerCase()}`} onPress={() => void copy(r.value, `${r.key} copied`)} bordered={false} bg="transparent" />
            </View>
          ))}
        </View>
      }>
      <Press onPress={onFill} scaleTo={0.99} accessibilityLabel="Use the demo account" accessibilityHint="Fills in the email and password" style={styles.main}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.top}>
            <T variant="kicker" color={colors.onAccent}>
              For judges and first looks
            </T>
          </View>
          <T variant="headline" color={colors.onAccent}>
            {title}
          </T>
          <T variant="small" color={colors.onAccent}>
            Maya’s Amalfi trip, already planned. One tap fills in the form.
          </T>
        </View>
        {filled ? (
          <View style={styles.done}>
            <Ionicons name="checkmark-circle" size={24} color={colors.onAccent} />
            <T variant="kicker" color={colors.onAccent} style={{ fontSize: 10 }}>
              Filled in
            </T>
          </View>
        ) : (
          <Ionicons name="arrow-forward" size={22} color={colors.onAccent} />
        )}
      </Press>
    </Ticket>
  );
}

const styles = StyleSheet.create({
  // the main part is the accent block (the highlighter); its top corners follow the ticket's outline
  main: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 56, backgroundColor: colors.accent, borderTopLeftRadius: radius.card - line, borderTopRightRadius: radius.card - line },
  top: { flexDirection: 'row', alignItems: 'center' },
  done: { alignItems: 'center', gap: 2 },
  stub: { paddingLeft: 16, paddingRight: 6, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56 },
  value: { fontSize: 14, lineHeight: 20, letterSpacing: -0.3 },
});
