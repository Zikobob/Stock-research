import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { tap } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { Avatar } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import type { Trip } from '@/store/types';
import { memberById, settlePlan, useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { money } from '@/utils/format';

import { styles } from './styles';

/** "Settle up": the fewest payments that make everyone even, each with a Mark paid button. */
export function SettleSheet({ visible, onClose, trip }: { visible: boolean; onClose: () => void; trip: Trip }) {
  const settleUp = useAppStore((s) => s.settleUp);
  const plan = settlePlan(trip);
  return (
    <Sheet visible={visible} onClose={onClose} title="Settle up" subtitle="Fewest payments to make everyone even">
      {plan.length ? (
        plan.map((p) => {
          const from = memberById(trip, p.from);
          const to = memberById(trip, p.to);
          return (
            <View key={`${p.from}-${p.to}`} style={styles.settleRow}>
              <Avatar name={from?.name ?? '?'} src={from?.avatar} size={30} />
              <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
              <Avatar name={to?.name ?? '?'} src={to?.avatar} size={30} />
              <View style={{ flex: 1 }}>
                <T variant="small" weight="semibold">
                  {from?.name.split(' ')[0]} pays {to?.name.split(' ')[0]}
                </T>
                <T variant="caption" color={colors.textSecondary}>
                  {money(p.amount, 'USD', { decimals: true })}
                </T>
              </View>
              <Button
                label="Mark paid"
                size="sm"
                full={false}
                onPress={() => {
                  settleUp(trip.id, p.from, p.to, p.amount);
                  tap('success');
                  toast('Payment recorded ✅');
                }}
              />
            </View>
          );
        })
      ) : (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
          <Ionicons name="checkmark-circle" size={40} color={colors.positive} />
          <T variant="title">Everyone is square! 🎉</T>
        </View>
      )}
    </Sheet>
  );
}
