import { View } from 'react-native';

import { themes, type ModePref, type ThemeKey } from '@/theme';

import { Tx } from '../kit';
import type { Pal } from '../palette';
import { ModePicker, StepHeading, ThemeGrid } from '../parts';

/** Step 2: six themes and Light / Dark / System. Picking one repaints this whole screen, so the person sees the answer at once. */
export function StepLook({ pal, theme, mode, onTheme, onMode }: { pal: Pal; theme: ThemeKey; mode: ModePref; onTheme: (k: ThemeKey) => void; onMode: (m: ModePref) => void }) {
  return (
    <View style={{ gap: 20 }}>
      <StepHeading pal={pal} kicker="02 / 05 · Look" title="Pick your look" sub="Tap one and watch this screen repaint." />
      <ThemeGrid pal={pal} theme={theme} mode={mode} onPick={onTheme} />
      <Tx pal={pal} tone="secondary" variant="small" accessibilityLiveRegion="polite">
        {themes[theme].name}: {themes[theme].vibe.toLowerCase()}.
      </Tx>
      <View style={{ gap: 8 }}>
        <Tx pal={pal} tone="secondary" variant="kicker">
          Light or dark
        </Tx>
        <ModePicker pal={pal} value={mode} onChange={onMode} />
        <Tx pal={pal} tone="muted" variant="caption">
          System follows your phone. Grape picks Dark.
        </Tx>
      </View>
    </View>
  );
}
