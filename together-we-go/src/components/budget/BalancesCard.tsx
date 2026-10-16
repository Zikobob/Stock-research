import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { T } from '@/components/ui/T';
import { Avatar, Card } from '@/components/ui/bits';
import { useT } from '@/i18n';
import type { Trip } from '@/store/types';
import { balances } from '@/store/useAppStore';
import { colors } from '@/theme';

import { styles } from './styles';

/** "Who owes who": every member's balance, plus the Settle up button. */
export function BalancesCard({ trip, userId, fmt, onSettle }: { trip: Trip; userId: string; fmt: (usd: number) => string; onSettle: () => void }) {
  const t = useT();
  const bal = balances(trip);
  const firstName = (id: string, name: string) => (id === userId ? 'You' : name.split(' ')[0]);
  return (
    <>
    <View style={styles.sectionRow}>
      <T variant="headline" accessibilityRole="header" style={{ flexShrink: 1 }}>
        Who owes who
      </T>
      <Button label={t('budget.settle')} size="sm" full={false} variant="soft" icon="swap-horizontal" onPress={onSettle} />
    </View>
    <Card padded={false} style={styles.card}>
      {trip.members.map((m, i) => {
        const v = bal[m.id] ?? 0;
        return (
          <View key={m.id} style={[styles.balRow, i > 0 && styles.balDivider]}>
            <Avatar name={m.name} src={m.avatar} size={34} />
            <View style={styles.nameWrap}>
              <T variant="bodySm" weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {firstName(m.id, m.name)}
              </T>
              {m.role === 'Treasurer' ? (
                <View style={styles.badge}>
                  <T variant="micro" weight="bold" color={colors.onAccent}>
                    Treasurer
                  </T>
                </View>
              ) : null}
            </View>
            <T variant="small" weight="bold" color={Math.abs(v) < 0.5 ? colors.textMuted : v > 0 ? colors.positive : colors.red}>
              {Math.abs(v) < 0.5 ? 'settled' : v > 0 ? `gets back ${fmt(v)}` : `owes ${fmt(-v)}`}
            </T>
          </View>
        );
      })}
    </Card>
    </>
  );
}
