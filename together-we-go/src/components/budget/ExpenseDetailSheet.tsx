import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { AvatarStack, Pill } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { deleteLocalFile } from '@/services/files';
import type { Expense, Trip } from '@/store/types';
import { memberById, useAppStore } from '@/store/useAppStore';
import { useSharedFile } from '@/sync/useFile';
import { colors } from '@/theme';
import { money } from '@/utils/format';

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
          <Image source={{ uri }} style={big ? styles.receiptBig : styles.receiptSmall} contentFit={big ? 'contain' : 'cover'} accessibilityLabel="Receipt photo" />
        </Press>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator color={colors.primary} />
          <T variant="small" color={colors.textSecondary}>
            Getting the receipt…
          </T>
        </View>
      )}
    </View>
  );
}

/** Details of one expense: amount, who paid, the split, the receipt photo, and a Delete button. */
export function ExpenseDetailSheet({ detail, onClose, trip, fmt }: { detail: Expense | null; onClose: () => void; trip: Trip; fmt: (usd: number) => string }) {
  const deleteExpense = useAppStore((s) => s.deleteExpense);
  return (
    <Sheet visible={!!detail} onClose={onClose} title={detail?.title} subtitle={detail ? `${detail.category} · ${detail.date}` : undefined}>
      {detail ? (
        <>
          <View style={styles.rowBetween}>
            <T variant="display" style={{ fontSize: 36, lineHeight: 40 }}>
              {fmt(detail.amount)}
            </T>
            {detail.original ? <Pill label={`Paid as ${money(detail.original.amount, detail.original.currency)}`} tone="blue" /> : null}
          </View>
          <View style={styles.rowBetween}>
            <T variant="small" color={colors.textSecondary}>
              Paid by {memberById(trip, detail.paidBy)?.name}
            </T>
            <T variant="small" weight="bold">
              {fmt(detail.amount / Math.max(1, detail.splitBetween.length))} each
            </T>
          </View>
          <AvatarStack people={detail.splitBetween.map((id) => memberById(trip, id)).filter((m): m is NonNullable<typeof m> => !!m)} max={6} size={30} />
          <Receipt expense={detail} />
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
        </>
      ) : null}
    </Sheet>
  );
}
