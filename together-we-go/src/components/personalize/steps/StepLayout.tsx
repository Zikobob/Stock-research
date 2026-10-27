import { View } from 'react-native';

import { FadeIn } from '@/components/ui/motion';
import { T } from '@/components/ui/T';
import { LAYOUTS, layoutAnswers, type Preset } from '@/data/layouts';
import type { Personal } from '@/store/types';

import { PalRule, Tx } from '../kit';
import type { Pal } from '../palette';
import { LayoutCard, StepHeading, type SetPersonal } from '../parts';

const PRESETS = Object.keys(LAYOUTS) as Preset[];

/** Step 4: three thumbnails of the Home order. Picking one sets the order, which blocks are on, and the layout. */
export function StepLayout({ pal, p, set }: { pal: Pal; p: Personal; set: SetPersonal }) {
  const chosen = p.layout !== 'custom' ? LAYOUTS[p.layout] : null;
  return (
    <View style={{ gap: 20 }}>
      <StepHeading pal={pal} kicker="04 / 05 · Layout" title="Shape your Home" sub="The boarding pass is always on top. Pick what comes after it." />
      <View accessibilityRole="radiogroup" accessibilityLabel="Home layout" style={{ flexDirection: 'row', gap: 10 }}>
        {PRESETS.map((k, i) => (
          <FadeIn key={k} delay={i * 50} distance={12} duration={240} style={{ flex: 1 }}>
            <LayoutCard pal={pal} preset={k} selected={p.layout === k} onPress={() => set(layoutAnswers(k))} />
          </FadeIn>
        ))}
      </View>
      <View style={{ gap: 10 }} accessibilityLiveRegion="polite">
        <PalRule pal={pal} />
        <T variant="headline" color={pal.text}>
          {chosen ? chosen.name : 'Custom'}
        </T>
        <Tx pal={pal} tone="secondary" variant="body">
          {chosen ? chosen.blurb : 'Arranged by hand in Settings. Pick a layout to start over, or keep yours and tap Continue.'}
        </Tx>
        <Tx pal={pal} tone="muted" variant="caption">
          Hide or move any block later in Settings.
        </Tx>
      </View>
    </View>
  );
}
