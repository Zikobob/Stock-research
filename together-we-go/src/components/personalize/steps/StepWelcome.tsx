import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { StaggerText } from '@/components/ui/StaggerText';
import { T } from '@/components/ui/T';
import type { Personal } from '@/store/types';
import { fonts, hair, line, radius } from '@/theme';

import { PalStamp, PalTicket, Tx } from '../kit';
import { EMOJIS } from '../options';
import type { Pal } from '../palette';
import { StepKicker, type SetPersonal } from '../parts';

/**
 * Step 1: the promise, then a boarding pass to fill in. The name is typed on the pass; the avatar (the one place emoji are allowed,
 * because the person picks it) is chosen on the stub.
 */
export function StepWelcome({ pal, p, set, firstName, onSubmit }: { pal: Pal; p: Personal; set: SetPersonal; firstName: string; onSubmit: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 10 }}>
        <StepKicker pal={pal} text="01 / 05 · Welcome" />
        <StaggerText text="Let’s make it yours" variant="display" color={pal.text} />
        <Tx pal={pal} tone="secondary" variant="body">
          4 quick picks, about a minute. Skip any of them and change them later in Settings.
        </Tx>
      </View>

      <PalTicket
        pal={pal}
        stub={
          <View style={styles.stub}>
            <Tx pal={pal} tone="secondary" variant="kicker">
              Your avatar
            </Tx>
            <View style={styles.emojis} accessibilityRole="radiogroup" accessibilityLabel="Travel avatar">
              {EMOJIS.map((e) => {
                const on = p.emoji === e;
                return (
                  <Press
                    key={e}
                    onPress={() => set({ emoji: e })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Avatar ${e}`}
                    scaleTo={0.9}
                    style={[styles.emoji, on ? { backgroundColor: pal.accent, borderColor: pal.ink, borderWidth: line } : { borderColor: pal.border, borderWidth: hair }]}>
                    <T variant="numeralSm" importantForAccessibility="no">
                      {e}
                    </T>
                  </Press>
                );
              })}
            </View>
          </View>
        }>
        <View style={styles.main}>
          <View style={styles.topRow}>
            <Tx pal={pal} tone="secondary" variant="kicker" style={{ flex: 1 }}>
              Crew pass
            </Tx>
            <PalStamp pal={pal} label="About 1 min" tone="accent" />
          </View>
          <View style={styles.passenger}>
            <View style={[styles.avatar, { backgroundColor: pal.accent, borderColor: pal.ink }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <T variant="numeral">{p.emoji}</T>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Tx pal={pal} tone="secondary" variant="kicker">
                Passenger
              </Tx>
              <TextInput
                value={p.nickname}
                onChangeText={(v) => set({ nickname: v })}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={onSubmit}
                returnKeyType="next"
                placeholder={firstName}
                placeholderTextColor={pal.textMuted}
                maxLength={20}
                autoCapitalize="words"
                accessibilityLabel="Nickname"
                style={[styles.input, { color: pal.text, borderBottomColor: focused ? pal.accentText : pal.ink }]}
              />
            </View>
          </View>
          <Tx pal={pal} tone="muted" variant="caption">
            What should we call you? This shows on Home.
          </Tx>
        </View>
      </PalTicket>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { padding: 16, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  passenger: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: radius.button, borderWidth: line, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 44, borderBottomWidth: line, paddingVertical: 6, fontFamily: fonts.bold, fontSize: 24, ...({ outlineStyle: 'none' } as object) },
  stub: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2, gap: 10 },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emoji: { width: 44, height: 44, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center' },
});
