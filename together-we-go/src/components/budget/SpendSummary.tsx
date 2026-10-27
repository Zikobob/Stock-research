import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Plate } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { Stamp, type StampTone } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import { colors, isDark, line, radius } from '@/theme';
import { categoryPalette } from '@/theme/palettes';
import { mix } from '@/utils/contrast';

import { BigAmount } from './BigAmount';
import { barShares, budgetState, leftLabel, type BudgetTone } from './logic';

/** The one loud object on the screen is an ink block, so everything on it is paper-coloured; secondary text is paper mixed back toward ink. */
const dim = mix(colors.ink, colors.bg, 0.72);
const faint = mix(colors.ink, colors.bg, 0.35);
/** The category colours were picked for paper. On an ink block the other mode's set reads better (and "Stays" is no longer ink on ink). */
const onInk = categoryPalette(isDark ? 'light' : 'dark');

const STAMP: Record<BudgetTone, StampTone> = { ok: 'positive', warn: 'warn', over: 'danger', none: 'accent' };

const stubSize = (text: string) => (text.length <= 7 ? 28 : 22);

/**
 * The top of Budget: an ink boarding pass with an accent plate. The money still to spend is the huge number, the budget sits beside it
 * (tap it to change it), a bar shows where the spending went, and a stamp says in words how the budget is doing. Below the tear line:
 * what each person has spent and what the group can spend a day.
 */
export function SpendSummary({ byCat, spent, budget, remaining, per, daysLeft, fmt, onEditBudget }: {
  byCat: [string, number][];
  spent: number;
  budget: number;
  remaining: number;
  per: number;
  daysLeft: number;
  /** Formats a US-dollar amount in the currency the user is viewing. */
  fmt: (usd: number) => string;
  onEditBudget: () => void;
}) {
  const state = budgetState(spent, budget);
  const shares = barShares(byCat, budget);
  // The stamp slams when the state changes (a new expense tips the budget to Close or Over), never on the first draw.
  const [seen, setSeen] = useState(state.tone);
  const [slam, setSlam] = useState(false);
  if (state.tone !== seen) {
    setSeen(state.tone);
    setSlam(true);
  }
  const left = fmt(Math.abs(remaining));
  const daily = fmt(Math.max(0, remaining) / daysLeft);
  const perText = fmt(per);

  return (
    <Plate color={colors.accent} corner={radius.card}>
      <Ticket
        plated={false}
        tone="ink"
        stub={
          <View style={styles.stub}>
            <View style={styles.stubCol}>
              <T variant="kicker" color={dim}>
                Per person
              </T>
              <T variant="numeral" color={colors.bg} style={{ fontSize: stubSize(perText), lineHeight: 34 }} numberOfLines={1}>
                {perText}
              </T>
            </View>
            <View style={[styles.stubCol, styles.stubSplit]}>
              <T variant="kicker" color={dim}>
                Daily allowance
              </T>
              <T variant="numeral" color={colors.bg} style={{ fontSize: stubSize(daily), lineHeight: 34 }} numberOfLines={1}>
                {daily}
              </T>
              <T variant="caption" color={dim}>
                {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
              </T>
            </View>
          </View>
        }>
        <View style={styles.main}>
          <View style={styles.topRow}>
            <T variant="kicker" color={dim} style={{ flexShrink: 1 }}>
              {leftLabel(remaining)}
            </T>
            <Stamp key={state.tone} label={state.label} tone={STAMP[state.tone]} icon={state.icon} slam={slam} />
          </View>

          <View style={styles.numRow}>
            <BigAmount text={left} color={colors.bg} testID="budget-left" />
            <Press onPress={onEditBudget} accessibilityLabel={`Group budget ${fmt(budget)}. Change it`} testID="budget-cap-open" style={styles.cap} scaleTo={0.97}>
              <View>
                <T variant="kicker" color={dim}>
                  of
                </T>
                <T variant="numeralSm" color={colors.bg}>
                  {fmt(budget)}
                </T>
              </View>
              <Ionicons name="create-outline" size={16} color={colors.bg} />
            </Press>
          </View>

          <View style={{ gap: 10 }}>
            <T variant="kicker" color={dim}>
              {byCat.length ? `Spent ${fmt(spent)} · ${state.pct}%` : 'Nothing spent yet'}
            </T>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.bar}>
              {shares.map((s) => (
                <View key={s.key} style={{ width: `${s.share * 100}%`, backgroundColor: onInk[s.key] ?? dim, borderRightWidth: line, borderRightColor: colors.ink }} />
              ))}
            </View>
            {byCat.length ? (
              <View style={styles.legend}>
                {byCat.map(([c, v]) => (
                  <View key={c} style={styles.legendItem} accessibilityLabel={`${c} ${fmt(v)}`}>
                    <View style={[styles.swatch, { backgroundColor: onInk[c] ?? dim }]} />
                    <T variant="caption" color={colors.bg} numberOfLines={1} style={{ flex: 1 }}>
                      {c}
                    </T>
                    <T variant="numeralSm" color={colors.bg} style={{ fontSize: 15, lineHeight: 20 }}>
                      {fmt(v)}
                    </T>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Ticket>
    </Plate>
  );
}

const styles = StyleSheet.create({
  main: { padding: 18, gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  numRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', columnGap: 12, rowGap: 2 },
  cap: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingBottom: 6 },
  bar: { height: 24, flexDirection: 'row', borderWidth: line, borderColor: colors.bg, borderRadius: radius.xs, overflow: 'hidden', backgroundColor: colors.ink },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '46%', minWidth: 132 },
  swatch: { width: 12, height: 12, borderWidth: 1.5, borderColor: colors.bg },
  stub: { flexDirection: 'row', paddingHorizontal: 18, paddingBottom: 16, paddingTop: 2, gap: 16 },
  stubCol: { flex: 1, gap: 2 },
  stubSplit: { paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: faint },
});
