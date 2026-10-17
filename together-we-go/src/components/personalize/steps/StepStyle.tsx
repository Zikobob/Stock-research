import { View } from 'react-native';

import { T } from '@/components/ui/T';
import type { Personal } from '@/store/types';

import type { Pal } from '../palette';
import { PACE, BUDGET } from '../options';
import { OptionRow, StepTitle } from '../parts';
import type { SetPersonal } from '../parts';

export function StepStyle({ pal, p, set }: { pal: Pal; p: Personal; set: SetPersonal }) {
  return (
    <View>
      <StepTitle pal={pal} kicker="Travel style" title="How do you like to travel?" sub="Helps the Trip Assistant and recommendations match your pace and wallet." />
      <T variant="title" color={pal.text} style={{ marginBottom: 8 }}>
        Pace
      </T>
      <View style={{ gap: 8 }}>
        {PACE.map((o) => (
          <OptionRow key={o.key} pal={pal} on={p.travelStyle === o.key} emoji={o.emoji} label={o.label} sub={o.sub} onPress={() => set({ travelStyle: o.key })} />
        ))}
      </View>
      <T variant="title" color={pal.text} style={{ marginTop: 18, marginBottom: 8 }}>
        Budget
      </T>
      <View style={{ gap: 8 }}>
        {BUDGET.map((o) => (
          <OptionRow key={o.key} pal={pal} on={p.budgetStyle === o.key} emoji={o.emoji} label={o.label} sub={o.sub} onPress={() => set({ budgetStyle: o.key })} />
        ))}
      </View>
    </View>
  );
}
