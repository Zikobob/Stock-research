import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { Avatar, Card, EmptyState } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { celebrate } from '@/components/ui/Confetti';
import { tap } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { toast } from '@/components/ui/feedback';
import type { Trip } from '@/store/types';
import { memberById, settlePlan, useAppStore } from '@/store/useAppStore';
import { colors, hair } from '@/theme';
import { money } from '@/utils/format';

import { settleExplain } from './logic';

/**
 * "Settle up": says in plain words why these payments, then lists them (who pays whom, how much) each with a Mark paid button.
 * Marking the last one paid closes the sheet and celebrates, so the SETTLED stamp is what you see behind it.
 */
export function SettleSheet({ visible, onClose, trip, onAllSettled }: { visible: boolean; onClose: () => void; trip: Trip; onAllSettled?: () => void }) {
  const settleUp = useAppStore((s) => s.settleUp);
  const plan = settlePlan(trip);
  return (
    <Sheet visible={visible} onClose={onClose} title="Settle up">
      {plan.length ? (
        <>
          <T variant="small" color={colors.textSecondary}>
            {settleExplain(plan.length)}
          </T>
          <Card padded={false}>
            {plan.map((p, i) => {
              const from = memberById(trip, p.from);
              const to = memberById(trip, p.to);
              return (
                <View key={`${p.from}-${p.to}`} style={[{ padding: 14, gap: 10 }, i > 0 && { borderTopWidth: hair, borderTopColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar name={from?.name ?? '?'} src={from?.avatar} size={34} />
                    <Ionicons name="arrow-forward" size={16} color={colors.ink} />
                    <Avatar name={to?.name ?? '?'} src={to?.avatar} size={34} />
                    <T variant="small" weight="bold" style={{ flex: 1 }} numberOfLines={2}>
                      {from?.name.split(' ')[0]} pays {to?.name.split(' ')[0]}
                    </T>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <T variant="numeralSm">{money(p.amount, 'USD', { decimals: true })}</T>
                    <Button
                      label="Mark paid"
                      size="sm"
                      variant="secondary"
                      full={false}
                      onPress={() => {
                        settleUp(trip.id, p.from, p.to, p.amount);
                        if (plan.length === 1) {
                          // that was the last payment: everyone is square
                          celebrate('All settled up');
                          onAllSettled?.();
                          onClose();
                        } else {
                          tap('success');
                          toast('Payment recorded');
                        }
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </Card>
        </>
      ) : (
        <EmptyState icon="checkmark-done-outline" title="All square" body="Everyone paid their share. Nobody owes anybody.">
          <Button label="Done" onPress={onClose} />
        </EmptyState>
      )}
    </Sheet>
  );
}
