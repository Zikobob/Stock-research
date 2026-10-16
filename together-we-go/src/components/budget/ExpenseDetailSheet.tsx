import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { AvatarStack, Pill } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { deleteLocalFile } from '@/services/files';
import type { Expense, Trip } from '@/store/types';
import { memberById, useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { money } from '@/utils/format';

import { styles } from './styles';

/** Details of one expense: amount, who paid, the split, the receipt photo, and a Delete button. */
export function ExpenseDetailSheet({ detail, onClose, trip, fmt }: { detail: Expense | null; onClose: () => void; trip: Trip; fmt: (usd: number) => string }) {
  const deleteExpense = useAppStore((s) => s.deleteExpense);
  const [receiptBig, setReceiptBig] = useState(false);
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
          {detail.receipt ? (
            <View style={{ gap: 8 }}>
              <T variant="kicker" color={colors.textSecondary}>
                Receipt
              </T>
              <Press onPress={() => setReceiptBig((b) => !b)} scaleTo={0.99} accessibilityLabel={receiptBig ? 'Shrink receipt' : 'Enlarge receipt'} style={{ alignSelf: receiptBig ? 'stretch' : 'flex-start' }}>
                <Image source={{ uri: detail.receipt }} style={receiptBig ? styles.receiptBig : styles.receiptSmall} contentFit={receiptBig ? 'contain' : 'cover'} accessibilityLabel="Receipt photo" />
              </Press>
            </View>
          ) : null}
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
