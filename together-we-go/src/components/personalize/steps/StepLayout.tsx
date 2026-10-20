import { View } from 'react-native';

import { FadeIn } from '@/components/ui/motion';
import { LAYOUTS, layoutAnswers, type Preset } from '@/data/layouts';
import type { Personal } from '@/store/types';

import type { Pal } from '../palette';
import { LayoutCard, StepHeading, Tx, type SetPersonal } from '../parts';

const PRESETS = Object.keys(LAYOUTS) as Preset[];

/** Step 4: three thumbnails of the Home order. Picking one sets the order, which blocks are on, and the layout. */
export function StepLayout({ pal, p, set }: { pal: Pal; p: Personal; set: SetPersonal }) {
  const chosen = p.layout !== 'custom' ? LAYOUTS[p.layout] : null;
  return (
    <View style={{ gap: 20 }}>
      <StepHeading pal={pal} title="Shape your Home" sub="Pick what Home shows first." />
      <View accessibilityRole="radiogroup" accessibilityLabel="Home layout" style={{ flexDirection: 'row', gap: 10 }}>
        {PRESETS.map((k, i) => (
          <FadeIn key={k} delay={i * 50} distance={12} duration={260} style={{ flex: 1 }}>
            <LayoutCard pal={pal} preset={k} selected={p.layout === k} onPress={() => set(layoutAnswers(k))} />
          </FadeIn>
        ))}
      </View>
      <View style={{ gap: 6 }} accessibilityLiveRegion="polite">
        <Tx pal={pal} variant="title" weight="bold">
          {chosen ? `${chosen.name}: ${chosen.blurb.charAt(0).toLowerCase()}${chosen.blurb.slice(1)}` : 'Custom: arranged by hand'}
        </Tx>
        <Tx pal={pal} tone="secondary" variant="small">
          {chosen ? 'Hide or move any block later in Settings.' : 'Pick a layout to start over, or keep yours and tap Continue.'}
        </Tx>
      </View>
    </View>
  );
}
