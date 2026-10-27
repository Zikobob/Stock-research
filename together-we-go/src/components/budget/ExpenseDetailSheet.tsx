import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar, AvatarStack } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Press';
import { Rule } from '@/components/ui/Rule';
import { Sheet } from '@/components/ui/Sheet';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { confirmAction, toast } from '@/components/ui/feedback';
import { deleteLocalFile } from '@/services/files';
import type { Expense, Trip } from '@/store/types';
import { memberById, useAppStore } from '@/store/useAppStore';
import { useSharedFile } from '@/sync/useFile';
import { colors, line, radius } from '@/theme';
import { money } from '@/utils/format';
import { dayLabel } from '@/utils/time';

import { BigAmount } from './BigAmount';
import { styles } from './styles';

/** The receipt photo: this phone's own, or the copy from the friend who paid. Tap to enlarge. */
function Receipt({ expense }: { expense: Expense }) {
  const [big, setBig] = useState(false);
  const { uri, loading } = useSharedFile(expense.receipt, expense.receiptBlob);
  if (!uri && !loading) return null;
  return (
    <View style={{ gap: 8 }}>
      <T variant="kicker" color={colors.textSecondary}>
        Receipt
      </T>
      {uri ? (
        <Press onPress={() => setBig((b) => !b)} scaleTo={0.99} accessibilityLabel={big ? 'Shrink receipt' : 'Enlarge receipt'} style={{ alignSelf: big ? 'stretch' : 'flex-start' }}>
          <Image source={{ uri }} style={big ? local.big : local.small} contentFit={big ? 'contain' : 'cover'} accessibilityLabel="Receipt photo" />
        </Press>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator color={colors.ink} />
          <T variant="small" color={colors.textSecondary}>
            Getting the receipt…
          </T>
        </View>
      )}
    </View>
  );
}

/**
 * One expense as a receipt: what it cost in a big mono number, who paid, who shares it, the photo of the paper receipt, and (apart from
 * everything else, at the bottom) Delete.
 */
export function ExpenseDetailSheet({ detail, onClose, trip, fmt }: { detail: Expense | null; onClose: () => void; trip: Trip; fmt: (usd: number) => string }) {
  const deleteExpense = useAppStore((s) => s.deleteExpense);
  const payer = detail ? memberById(trip, detail.paidBy) : undefined;
  const sharers = detail ? detail.splitBetween.map((id) => memberById(trip, id)).filter((m): m is NonNullable<typeof m> => !!m) : [];
  return (
    <Sheet visible={!!detail} onClose={onClose} title={detail?.title} subtitle={detail ? `${detail.settlement ? 'Settlement' : detail.category} · ${dayLabel(detail.date)}` : undefined}>
      {detail ? (
        <>
          <View style={styles.rowBetween}>
            <BigAmount text={fmt(detail.amount)} size={48} />
            {detail.original ? <Stamp label={`Paid as ${money(detail.original.amount, detail.original.currency)}`} tone="ink" /> : null}
          </View>
          <Rule weight={1} />
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
              <Avatar name={payer?.name ?? '?'} src={payer?.avatar} size={36} />
              <View style={{ flexShrink: 1 }}>
                <T variant="kicker" color={colors.textSecondary}>
                  Paid by
                </T>
                <T variant="title" weight="bold" numberOfLines={1}>
                  {payer?.name ?? 'Someone'}
                </T>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.ink} />
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <AvatarStack people={sharers} max={4} size={30} />
              <T variant="small" color={colors.textSecondary}>
                <T variant="numeralSm" style={{ fontSize: 17, lineHeight: 22 }}>
                  {fmt(detail.amount / Math.max(1, detail.splitBetween.length))}
                </T>{' '}
                each
              </T>
            </View>
          </View>
          <Receipt expense={detail} />
          <View style={{ marginTop: 12 }}>
            <Button
              label="Delete expense"
              variant="danger"
              icon="trash-outline"
              onPress={() => {
                const d = detail;
                onClose();
                confirmAction('Delete expense?', `${d.title} (${money(d.amount)}) will be removed.`, () => {
                  deleteExpense(trip.id, d.id);
                  deleteLocalFile(d.receipt);
                  toast('Expense deleted');
                }, { destructive: true, confirmLabel: 'Delete' });
              }}
            />
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

const local = StyleSheet.create({
  small: { width: 112, height: 112, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt },
  big: { width: '100%', height: 380, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt },
});
