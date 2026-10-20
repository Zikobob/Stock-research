import { View } from 'react-native';

import { celebrate } from '@/components/ui/Confetti';
import { TRIVIA_REMINDER } from '@/data/personal';
import type { Personal } from '@/store/types';

import { EFFECT_OPTIONS } from '../options';
import type { Pal } from '../palette';
import { OptionRow, StepHeading, SwitchRow, Tx, type SetPersonal } from '../parts';

/** Step 5: how big the celebrations are (tap to try one) and the daily trivia reminder. */
export function StepVibe({ pal, p, set, onTrivia }: { pal: Pal; p: Personal; set: SetPersonal; onTrivia: (on: boolean) => void }) {
  return (
    <View style={{ gap: 20 }}>
      <StepHeading pal={pal} title="Set the vibe" sub="How big should celebrations be? Tap one to try it." />
      <View accessibilityRole="radiogroup" accessibilityLabel="Effects" style={{ gap: 10 }}>
        {EFFECT_OPTIONS.map((o) => (
          <OptionRow
            key={o.key}
            pal={pal}
            on={p.effects === o.key}
            emoji={o.emoji}
            label={o.label}
            sub={o.sub}
            onPress={() => {
              set({ effects: o.key });
              // a preview of this setting (it is not saved until the end); Chill has no confetti, so it says so
              celebrate(o.key === 'chill' ? 'Chill: a calm tick, no confetti' : undefined, o.key);
            }}
          />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <SwitchRow pal={pal} icon="notifications-outline" label="Daily trivia reminder" sub={`One question a day at ${TRIVIA_REMINDER.timeLabel}. Keep your streak going.`} value={p.triviaReminder} onChange={onTrivia} />
        <Tx pal={pal} tone="muted" variant="caption">
          Off by default. You can change both in Settings.
        </Tx>
      </View>
    </View>
  );
}
