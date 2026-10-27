import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { expenseCategories } from '@/components/trip/meta';
import { Chip } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { toast } from '@/components/ui/feedback';
import { currencyByCode } from '@/data/reference';
import { destinationById } from '@/data/destinations';
import { useDraft } from '@/hooks/useDraft';
import { useT } from '@/i18n';
import { convert, useRates } from '@/services/currency';
import { deleteLocalFile, pickImage } from '@/services/files';
import type { ExpenseCategory, Trip } from '@/store/types';
import { totalSpent, useAppStore } from '@/store/useAppStore';
import { colors, line, radius } from '@/theme';
import { money } from '@/utils/format';
import { guessExpenseCategory } from '@/utils/guess';
import { todayInTz } from '@/utils/time';
import { firstError, maxLen, parseAmount, required, validateAmount } from '@/utils/validation';

import { AmountField } from './AmountField';
import { EMPTY_DRAFT, activePayer, activeSplit, summaryLine, type ExpenseDraft } from './logic';

/**
 * Logging an expense in as few taps as possible: the amount first, as a big number; then what it was for. The category is guessed from
 * those words and shown as one chip; who paid and who shares it are one plain line ("Paid by you · split with everyone") with a Change
 * button for the rare case. A half-typed expense is kept (useDraft) if the sheet is closed, and cleared when it is added.
 */
export function AddExpenseSheet({ visible, onClose, trip, userId }: { visible: boolean; onClose: () => void; trip: Trip; userId: string }) {
  const t = useT();
  const rates = useRates();
  const addExpense = useAppStore((s) => s.addExpense);
  const dest = destinationById(trip.destinationId);
  const local = dest?.currency ?? 'EUR';
  const memberIds = trip.members.map((m) => m.id);

  const [d, setD, clearDraft] = useDraft<ExpenseDraft>(`add-expense-${trip.id}`, EMPTY_DRAFT);
  const patch = (p: Partial<ExpenseDraft>) => setD((cur) => ({ ...cur, ...p }));
  const [more, setMore] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const paidBy = activePayer(d.paidBy, userId, memberIds);
  const split = activeSplit(d.split, memberIds);
  const payer = paidBy === userId ? 'you' : (trip.members.find((m) => m.id === paidBy)?.name.split(' ')[0] ?? 'someone');
  const currencies = ['USD', local].filter((c, i, a) => a.indexOf(c) === i);
  const cur = currencies.includes(d.cur) ? d.cur : 'USD';
  const symbol = cur === 'USD' ? '$' : (currencyByCode(cur)?.symbol ?? cur);
  const catIcon = expenseCategories.find((c) => c.key === d.cat)?.icon ?? 'ellipsis-horizontal';
  const typed = parseAmount(d.amount);

  const attach = async (camera: boolean) => {
    setAttaching(true);
    try {
      const f = await pickImage(camera);
      if (f) {
        deleteLocalFile(d.receipt ?? undefined);
        patch({ receipt: f.uri });
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t open photos', { tone: 'warn' });
    } finally {
      setAttaching(false);
    }
  };

  const removeReceipt = () => {
    deleteLocalFile(d.receipt ?? undefined);
    patch({ receipt: null });
  };

  const submit = () => {
    const e = {
      title: firstError(d.title, required('what it was for'), maxLen(40, 'Description')),
      amount: validateAmount(d.amount, { max: 100000 }),
      split: split.length ? null : 'Pick at least one person to split with',
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      if (e.split) setMore(true);
      return tap('warning');
    }
    const n = parseAmount(d.amount)!;
    const usd = cur === 'USD' ? n : convert(n, cur, 'USD', rates);
    const spent = totalSpent(trip);
    addExpense(trip.id, {
      title: d.title.trim(),
      amount: Math.round(usd * 100) / 100,
      category: d.cat,
      paidBy,
      splitBetween: split,
      date: todayInTz(dest?.tz ?? 'UTC'),
      original: cur === 'USD' ? undefined : { amount: n, currency: cur },
      receipt: d.receipt ?? undefined,
    });
    tap('success');
    if (trip.budget > 0 && spent <= trip.budget && spent + usd > trip.budget) toast(`Added ${money(usd)}. This puts the group over budget`, { tone: 'warn' });
    else toast(`Added ${money(usd)} · ${money(usd / split.length)} each`);
    clearDraft();
    setErrors({});
    setMore(false);
    onClose();
  };

  const pickCat = (c: ExpenseCategory) => patch({ cat: c, catTouched: true });
  /** Closing keeps what was typed (the draft) but not the red error messages. */
  const close = () => {
    setErrors({});
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={close} title={t('budget.addExpense')} footer={<Button label={t('budget.add')} icon="add" onPress={submit} testID="add-expense" />}>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <View style={styles.between}>
            <T variant="kicker">How much</T>
            {currencies.length > 1 ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {currencies.map((c) => (
                  <Chip key={c} small label={c} active={cur === c} onPress={() => patch({ cur: c })} />
                ))}
              </View>
            ) : null}
          </View>
          <AmountField value={d.amount} onChange={(v) => patch({ amount: v })} symbol={symbol} error={errors.amount} testID="expense-amount" />
          {cur !== 'USD' && typed ? (
            <T variant="caption" color={colors.textSecondary}>
              ≈ {money(convert(typed, cur, 'USD', rates), 'USD', { decimals: true })} · saved in USD so the group can compare
            </T>
          ) : null}
        </View>

        <Input
          placeholder={t('budget.whatFor')}
          value={d.title}
          onChangeText={(text) => patch({ title: text, ...(d.catTouched ? null : { cat: guessExpenseCategory(text) }) })}
          error={errors.title}
          maxLength={45}
          style={{ minHeight: 44 }}
          testID="expense-title"
        />

        <View style={styles.summary}>
          <View style={styles.between}>
            {more ? <T variant="kicker">Category</T> : <Chip label={d.cat} icon={catIcon} active onPress={() => setMore(true)} />}
            <Press onPress={() => setMore((m) => !m)} style={styles.change} accessibilityLabel="Change who paid, the split or the category" accessibilityState={{ expanded: more }}>
              <T variant="small" weight="bold">
                {more ? 'Done' : 'Change'}
              </T>
              <Ionicons name={more ? 'chevron-up' : 'chevron-down'} size={16} color={colors.ink} />
            </Press>
          </View>
          {more ? (
            <View style={styles.wrap}>
              {expenseCategories.map((c) => (
                <Chip key={c.key} small label={c.key} icon={c.icon} active={d.cat === c.key} onPress={() => pickCat(c.key)} />
              ))}
            </View>
          ) : (
            <T variant="small" color={colors.textSecondary}>
              {summaryLine(payer, split, memberIds, userId)}
            </T>
          )}
        </View>

        {more ? (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 8 }}>
              <T variant="kicker">Paid by</T>
              <View style={styles.wrap}>
                {trip.members.map((m) => (
                  <Chip key={m.id} small label={m.id === userId ? 'You' : m.name.split(' ')[0]} image={m.avatar} active={paidBy === m.id} onPress={() => patch({ paidBy: m.id })} />
                ))}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <View style={styles.between}>
                <T variant="kicker">Split between ({split.length})</T>
                <Press onPress={() => patch({ split: split.length === memberIds.length ? [userId] : null })} style={styles.change} accessibilityLabel={split.length === memberIds.length ? 'Split just for me' : 'Split with everyone'}>
                  <T variant="small" weight="bold">
                    {split.length === memberIds.length ? 'Just me' : 'Everyone'}
                  </T>
                </Press>
              </View>
              <View style={styles.wrap}>
                {trip.members.map((m) => (
                  <Chip
                    key={m.id}
                    small
                    label={m.id === userId ? 'You' : m.name.split(' ')[0]}
                    active={split.includes(m.id)}
                    onPress={() => patch({ split: split.includes(m.id) ? split.filter((x) => x !== m.id) : [...split, m.id] })}
                  />
                ))}
              </View>
              {errors.split ? (
                <T variant="caption" color={colors.red}>
                  {errors.split}
                </T>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={{ gap: 12 }}>
          <View style={styles.receiptRow}>
            <Button label="Attach receipt" icon="camera-outline" variant="soft" size="md" loading={attaching} onPress={() => attach(false)} style={{ flex: 1 }} />
            {Platform.OS !== 'web' ? <Button label="Take photo" icon="scan-outline" variant="soft" size="md" disabled={attaching} onPress={() => attach(true)} style={{ flex: 1 }} /> : null}
          </View>
          {d.receipt ? (
            <View style={styles.receiptRow}>
              <Image source={{ uri: d.receipt }} style={styles.thumb} contentFit="cover" accessibilityLabel="Receipt photo" />
              <View style={{ flex: 1 }}>
                <T variant="small" color={colors.textSecondary}>
                  Receipt attached. It is saved with the expense.
                </T>
                <Press onPress={removeReceipt} style={styles.change} accessibilityLabel="Remove receipt">
                  <Ionicons name="trash-outline" size={16} color={colors.ink} />
                  <T variant="small" weight="bold">
                    Remove
                  </T>
                </Press>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  summary: { gap: 8 },
  change: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 8, alignSelf: 'flex-start' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt },
});
