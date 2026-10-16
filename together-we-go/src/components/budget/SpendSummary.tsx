import { View } from 'react-native';

import { Donut } from '@/components/ui/Donut';
import { T } from '@/components/ui/T';
import { Card } from '@/components/ui/bits';
import { categoryColors, colors } from '@/theme';

import { styles } from './styles';

/** The donut chart of spending by category, plus the per-person and daily-allowance tiles. */
export function SpendSummary({ byCat, spent, budget, remaining, per, daysLeft, fmt }: {
  byCat: [string, number][];
  spent: number;
  budget: number;
  remaining: number;
  per: number;
  daysLeft: number;
  /** Formats a US-dollar amount in the currency the user is viewing. */
  fmt: (usd: number) => string;
}) {
  return (
    <>
    <Card style={[styles.card, { marginTop: 14 }]}>
      <View style={styles.donutRow}>
        <Donut
          size={132}
          parts={byCat.map(([c, v]) => ({ value: v, color: categoryColors[c] ?? colors.textMuted }))}
          centerLabel={remaining < 0 ? 'OVER' : 'LEFT'}
          centerValue={fmt(Math.abs(remaining))}
        />
        <View style={{ flex: 1, gap: 8 }}>
          <T variant="kicker" weight="bold" color={colors.textSecondary} numberOfLines={1} adjustsFontSizeToFit style={styles.tinyKicker}>
            {`Spent ${fmt(spent)} / ${fmt(budget)}`}
          </T>
          {byCat.map(([c, v]) => (
            <View key={c} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: categoryColors[c] ?? colors.textMuted }]} />
              <T variant="small" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                {c}
              </T>
              <T variant="small" weight="bold">
                {fmt(v)}
              </T>
            </View>
          ))}
          {!byCat.length ? (
            <T variant="small" color={colors.textMuted}>
              No expenses yet. Tap + to add your first one.
            </T>
          ) : null}
        </View>
      </View>
    </Card>
    <View style={styles.tiles}>
      <Card style={[styles.card, styles.tile]}>
        <T variant="kicker" weight="bold" color={colors.textSecondary} style={styles.tinyKicker}>
          Per person
        </T>
        <T variant="h2" weight="extrabold" numberOfLines={1} adjustsFontSizeToFit>
          {fmt(per)}
        </T>
      </Card>
      <Card style={[styles.card, styles.tile]}>
        <T variant="kicker" weight="bold" color={colors.textSecondary} style={styles.tinyKicker}>
          Daily allowance
        </T>
        <T variant="h2" weight="extrabold" numberOfLines={1} adjustsFontSizeToFit>
          {fmt(Math.max(0, remaining) / daysLeft)}
        </T>
      </Card>
    </View>
    </>
  );
}
