import { Ionicons } from '@expo/vector-icons';
import { Switch, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import type { Personal } from '@/store/types';
import { cornerStyles, type CornerStyle } from '@/theme';

import type { Pal } from '../palette';
import { styles } from '../styles';
import { SECTIONS } from '../options';
import { StepTitle } from '../parts';
import type { SetPersonal } from '../parts';

export function StepHome({ pal, p, set, corners, setCorners }: { pal: Pal; p: Personal; set: SetPersonal; corners: CornerStyle; setCorners: (c: CornerStyle) => void }) {
  return (
    <View>
      <StepTitle pal={pal} kicker="Your home screen" title="Build your Explore page" sub="Switch sections on or off, pick a card shape and decide how lively it should feel." />
      <View style={[styles.card, { backgroundColor: pal.card, borderColor: pal.border }]}>
        {SECTIONS.map((s, i) => (
          <View
            key={s.key}
            style={[
              styles.secRow,
              i > 0 && {
                borderTopWidth: 1,
                borderTopColor: pal.border,
              },
            ]}>
            <View style={[styles.secIcon, { backgroundColor: pal.primarySofter }]}>
              <Ionicons name={s.icon} size={17} color={pal.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <T variant="small" weight="semibold" color={pal.text}>
                {s.label}
              </T>
              <T variant="caption" color={pal.textSecondary}>
                {s.sub}
              </T>
            </View>
            <Switch
              value={p.sections[s.key]}
              onValueChange={(v) => set({ sections: { ...p.sections, [s.key]: v } })}
              trackColor={{
                true: pal.primary,
                false: pal.borderStrong,
              }}
              thumbColor="#FFFFFF"
              accessibilityLabel={`Show ${s.label}`}
            />
          </View>
        ))}
      </View>

      <T variant="title" color={pal.text} style={{ marginTop: 18, marginBottom: 8 }}>
        Card shape
      </T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(Object.keys(cornerStyles) as CornerStyle[]).map((c) => {
          const on = corners === c;
          return (
            <Press
              key={c}
              onPress={() => setCorners(c)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${cornerStyles[c].name} corners`}
              style={[
                styles.cornerOpt,
                {
                  backgroundColor: on ? pal.primarySoft : pal.card,
                  borderColor: on ? pal.primary : pal.border,
                },
              ]}>
              <View
                style={[
                  styles.cornerDemo,
                  {
                    borderRadius: Math.round(14 * cornerStyles[c].scale),
                    backgroundColor: pal.primary,
                  },
                ]}
              />
              <T variant="small" weight="semibold" color={on ? pal.primary : pal.text}>
                {cornerStyles[c].name}
              </T>
            </Press>
          );
        })}
      </View>

      <View
        style={[
          styles.card,
          styles.secRow,
          {
            backgroundColor: pal.card,
            borderColor: pal.border,
            marginTop: 14,
          },
        ]}>
        <View style={[styles.secIcon, { backgroundColor: pal.accentSoft }]}>
          <Ionicons name="sparkles" size={17} color={pal.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="small" weight="semibold" color={pal.text}>
            Animations
          </T>
          <T variant="caption" color={pal.textSecondary}>
            Flying plane, floating cards, smooth entrances
          </T>
        </View>
        <Switch value={p.motion} onValueChange={(v) => set({ motion: v })} trackColor={{ true: pal.primary, false: pal.borderStrong }} thumbColor="#FFFFFF" accessibilityLabel="Animations" />
      </View>
    </View>
  );
}
