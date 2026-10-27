import { StyleSheet, View } from 'react-native';

import { StaggerText } from '@/components/ui/StaggerText';
import { LAYOUTS } from '@/data/layouts';
import { TRIVIA_REMINDER, interestNames } from '@/data/personal';
import type { Personal } from '@/store/types';
import type { ModePref, ThemeKey } from '@/theme';

import { PalStamp, PalTicket, Tx } from '../kit';
import { barcodeWidths, lookLabel, styleCode } from '../look';
import { EFFECT_LABEL, STEP } from '../options';
import type { Pal } from '../palette';
import { StepKicker, SummaryRow } from '../parts';

/** The stripes of a barcode, drawn from the code so the same answers always print the same ones. */
function Barcode({ pal, code }: { pal: Pal; code: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.barcode}>
      {barcodeWidths(code).map((w, i) => (
        <View key={i} style={{ width: w * 2, height: '100%', backgroundColor: i % 2 === 0 ? pal.ink : 'transparent' }} />
      ))}
    </View>
  );
}

/** The last page: every answer on a boarding pass (tap a row to change it), and the build button below. */
export function StepReveal({ pal, p, theme, mode, shownName, onEdit }: { pal: Pal; p: Personal; theme: ThemeKey; mode: ModePref; shownName: string; onEdit: (step: number) => void }) {
  const layoutName = p.layout === 'custom' ? 'Custom' : LAYOUTS[p.layout].name;
  const code = styleCode(theme, layoutName, EFFECT_LABEL[p.effects]);
  const rows = [
    { label: 'Name', value: `${p.emoji}  ${shownName}`, step: STEP.welcome },
    { label: 'Look', value: lookLabel({ theme, mode }), step: STEP.look },
    { label: 'Interests', value: interestNames(p.interests), step: STEP.interests },
    { label: 'Home layout', value: layoutName, step: STEP.layout },
    { label: 'Effects', value: `${EFFECT_LABEL[p.effects]}${p.triviaReminder ? ` · trivia at ${TRIVIA_REMINDER.timeLabel}` : ''}`, step: STEP.vibe },
  ] as const;
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 10 }}>
        <StepKicker pal={pal} text="Ready to board" />
        <StaggerText text={`All set, ${shownName}`} variant="display" color={pal.text} />
        <Tx pal={pal} tone="secondary" variant="body">
          Here is your pass. Tap any line to change it.
        </Tx>
      </View>
      <PalTicket
        pal={pal}
        stub={
          <View style={styles.stub}>
            <Barcode pal={pal} code={code} />
            <Tx pal={pal} variant="numeralSm">
              {code}
            </Tx>
          </View>
        }>
        <View style={styles.main}>
          <View style={styles.top}>
            <Tx pal={pal} tone="secondary" variant="kicker" style={{ flex: 1 }}>
              Crew pass
            </Tx>
            <PalStamp pal={pal} label="Ready" tone="accent" slam />
          </View>
          {rows.map((r, i) => (
            <SummaryRow key={r.label} pal={pal} label={r.label} value={r.value} onPress={() => onEdit(r.step)} last={i === rows.length - 1} />
          ))}
        </View>
      </PalTicket>
      <Tx pal={pal} tone="muted" variant="caption">
        Language, home currency and corner style are in Settings.
      </Tx>
    </View>
  );
}

const styles = StyleSheet.create({
  main: { paddingHorizontal: 16, paddingTop: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6 },
  stub: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 },
  barcode: { flexDirection: 'row', height: 36, flexShrink: 1, overflow: 'hidden' },
});
