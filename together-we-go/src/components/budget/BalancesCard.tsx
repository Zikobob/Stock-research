import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Avatar, type IconName } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Rule } from '@/components/ui/Rule';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import type { Trip } from '@/store/types';
import { balances, settlePlan } from '@/store/useAppStore';
import { colors } from '@/theme';

import { balanceSentence, balanceView, isSettled, type BalanceTone } from './logic';
import { styles } from './styles';

const ICON: Record<BalanceTone, IconName> = { owes: 'arrow-up', gets: 'arrow-down', square: 'checkmark' };
const COLOR: Record<BalanceTone, string> = { owes: colors.red, gets: colors.positive, square: colors.textMuted };

/**
 * "Who owes who": one line per person on the paper, the amount in mono with an arrow (up = owes, down = gets back) and a word, never colour
 * alone. Under it the clear next step, "Settle up". When the last payment is made a SETTLED stamp slams on (`slam`), and it stays.
 */
export function BalancesCard({ trip, userId, fmt, onSettle, slam }: { trip: Trip; userId: string; fmt: (usd: number) => string; onSettle: () => void; slam?: boolean }) {
  const t = useT();
  const bal = balances(trip);
  const plan = settlePlan(trip);
  const settled = isSettled(trip.expenses.some((e) => !e.settlement), plan.length);
  return (
    <View>
      <View style={styles.sectionTop}>
        <T variant="headline" accessibilityRole="header" style={{ flexShrink: 1 }}>
          Who owes who
        </T>
        {settled ? <Stamp label="Settled" tone="positive" icon="checkmark-circle-outline" slam={slam} /> : null}
      </View>
      <Rule />

      <View>
        {trip.members.map((m, i) => {
          const isYou = m.id === userId;
          const name = isYou ? 'You' : m.name.split(' ')[0];
          const v = balanceView(bal[m.id] ?? 0);
          const color = COLOR[v.tone];
          return (
            <View key={m.id} style={[styles.ledgerRow, i > 0 && styles.ledgerDivider]} accessibilityLabel={balanceSentence(name, isYou, bal[m.id] ?? 0, fmt)}>
              <Avatar name={m.name} src={m.avatar} size={40} />
              <View style={{ flex: 1, minWidth: 92 }}>
                <T variant="title" weight="bold" numberOfLines={1}>
                  {name}
                </T>
                {m.role === 'Treasurer' ? (
                  <T variant="kicker" color={colors.textSecondary} numberOfLines={1} style={{ fontSize: 10 }}>
                    Treasurer
                  </T>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                <Ionicons name={ICON[v.tone]} size={18} color={color} />
                {v.tone === 'square' ? (
                  <T variant="small" weight="bold" color={color}>
                    all square
                  </T>
                ) : (
                  <T variant="small" weight="semibold" color={color} style={{ textAlign: 'right', flexShrink: 1 }}>
                    {v.word}{' '}
                    <T variant="numeralSm" color={color}>
                      {fmt(v.amount)}
                    </T>
                  </T>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {settled ? (
        <T variant="small" color={colors.textSecondary} style={{ marginTop: 6 }}>
          Everyone is square. Nobody owes anybody.
        </T>
      ) : plan.length ? (
        <View style={{ marginTop: 12 }}>
          <Button label={t('budget.settle')} size="md" variant="secondary" icon="swap-horizontal" onPress={onSettle} />
        </View>
      ) : null}
    </View>
  );
}
