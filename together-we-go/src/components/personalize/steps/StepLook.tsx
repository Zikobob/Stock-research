import { View } from 'react-native';

import type { ModePref, ThemeKey } from '@/theme';

import type { Pal } from '../palette';
import { ModePicker, StepHeading, ThemeGrid, Tx } from '../parts';

/** Step 2: six themes and Light / Dark / System. Picking one repaints this whole screen, so the person sees the answer at once. */
export function StepLook({ pal, theme, mode, onTheme, onMode }: { pal: Pal; theme: ThemeKey; mode: ModePref; onTheme: (k: ThemeKey) => void; onMode: (m: ModePref) => void }) {
  return (
    <View style={{ gap: 20 }}>
      <StepHeading pal={pal} title="Pick your look" sub="Tap one. This whole screen repaints so you can see it." />
      <ThemeGrid pal={pal} theme={theme} mode={mode} onPick={onTheme} />
      <View style={{ gap: 8 }}>
        <Tx pal={pal} variant="small" weight="bold">
          Light or dark
        </Tx>
        <ModePicker pal={pal} value={mode} onChange={onMode} />
        <Tx pal={pal} tone="muted" variant="caption">
          System follows your phone. Midnight switches to Dark, and you can switch it back.
        </Tx>
      </View>
    </View>
  );
}
