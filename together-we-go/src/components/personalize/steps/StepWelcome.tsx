import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { StaggerText } from '@/components/ui/StaggerText';
import { T } from '@/components/ui/T';
import type { Personal } from '@/store/types';
import { fonts, radius } from '@/theme';

import { EMOJIS } from '../options';
import type { Pal } from '../palette';
import { Tx, type SetPersonal } from '../parts';

/** Step 1: the promise, then a nickname and a face (a playful touch that shows up on Home). */
export function StepWelcome({ pal, p, set, firstName, onSubmit }: { pal: Pal; p: Personal; set: SetPersonal; firstName: string; onSubmit: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 10 }}>
        <StaggerText text="Let’s make it yours" variant="display" color={pal.text} />
        <Tx pal={pal} tone="secondary" variant="body">
          4 quick picks, about a minute. Skip any of them and change them later in Settings.
        </Tx>
      </View>

      <View style={{ gap: 8 }}>
        <Tx pal={pal} variant="small" weight="bold">
          What should we call you?
        </Tx>
        <View style={styles.nameRow}>
          <View style={[styles.disc, { backgroundColor: pal.accent }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <T style={{ fontSize: 32, lineHeight: 40 }}>{p.emoji}</T>
          </View>
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
            style={[styles.input, { color: pal.text, backgroundColor: focused ? pal.card : pal.bgAlt, borderColor: focused ? pal.text : pal.border }]}
          />
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Tx pal={pal} variant="small" weight="bold">
          Pick your travel buddy
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
                scaleTo={0.88}
                style={[styles.emoji, { backgroundColor: on ? pal.card : pal.bgAlt, borderColor: on ? pal.primary : 'transparent' }]}>
                <T style={{ fontSize: 24, lineHeight: 30 }}>{e}</T>
              </Press>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  disc: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: 56, borderRadius: radius.button, borderWidth: 1.5, paddingHorizontal: 16, fontFamily: fonts.semibold, fontSize: 17, ...({ outlineStyle: 'none' } as object) },
  emojis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emoji: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
