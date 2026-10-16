import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { expenseCategories } from '@/components/trip/meta';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { Chip } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { destinationById } from '@/data/destinations';
import { useT } from '@/i18n';
import { convert, useRates } from '@/services/currency';
import { deleteLocalFile, pickImage } from '@/services/files';
import type { ExpenseCategory, Trip } from '@/store/types';
import { totalSpent, useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { money } from '@/utils/format';
import { todayInTz } from '@/utils/time';
import { firstError, maxLen, parseAmount, required, validateAmount } from '@/utils/validation';

import { styles } from './styles';

/** The "Add expense" form in a bottom sheet: description, amount (any currency), category, who paid, split, receipt. */
export function AddExpenseSheet({ visible, onClose, trip, userId }: { visible: boolean; onClose: () => void; trip: Trip; userId: string }) {
  const t = useT();
  const rates = useRates();
  const addExpense = useAppStore((s) => s.addExpense);
  const dest = destinationById(trip.destinationId);
  const local = dest?.currency ?? 'EUR';

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [entryCur, setEntryCur] = useState<'USD' | string>('USD');
  const [cat, setCat] = useState<ExpenseCategory>('Food');
  const [paidBy, setPaidBy] = useState(userId);
  const [split, setSplit] = useState<string[]>(trip.members.map((m) => m.id));
  const [receipt, setReceipt] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const attach = async (camera: boolean) => {
    setAttaching(true);
    try {
      const f = await pickImage(camera);
      if (f) {
        deleteLocalFile(receipt ?? undefined);
        setReceipt(f.uri);
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t open photos', { tone: 'warn' });
    } finally {
      setAttaching(false);
    }
  };

  const removeReceipt = () => {
    deleteLocalFile(receipt ?? undefined);
    setReceipt(null);
  };

  const submit = () => {
    const e = {
      title: firstError(title, required('what it was for'), maxLen(40, 'Description')),
      amount: validateAmount(amount, { max: 100000 }),
      split: split.length ? null : 'Pick at least one person to split with',
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) return tap('warning');
    const n = parseAmount(amount)!;
    const usd = entryCur === 'USD' ? n : convert(n, entryCur, 'USD', rates);
    const spent = totalSpent(trip);
    addExpense(trip.id, {
      title: title.trim(),
      amount: Math.round(usd * 100) / 100,
      category: cat,
      paidBy,
      splitBetween: split,
      date: todayInTz(dest?.tz ?? 'UTC'),
      original: entryCur === 'USD' ? undefined : { amount: n, currency: entryCur },
      receipt: receipt ?? undefined,
    });
    tap('success');
    toast(`Added ${money(usd)} · ${money(usd / split.length)} each`);
    setTitle('');
    setAmount('');
    setReceipt(null);
    onClose();
    if (spent + usd > trip.budget && spent <= trip.budget) toast('Heads up: this puts the group over budget', { tone: 'warn' });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('budget.addExpense')}
      footer={<Button label={t('budget.add')} icon="add" onPress={submit} testID="add-expense" />}>
      <View style={{ gap: 12 }}>
        <Input placeholder={t('budget.whatFor')} value={title} onChangeText={setTitle} error={errors.title} maxLength={45} testID="expense-title" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Input placeholder="100" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={errors.amount} containerStyle={{ flex: 1 }} icon="cash-outline" testID="expense-amount" />
          <View style={styles.curToggle}>
            {['USD', local].filter((c, i, a) => a.indexOf(c) === i).map((c) => (
              <Press key={c} onPress={() => setEntryCur(c)} style={[styles.curBtn, entryCur === c && styles.curOn]} accessibilityLabel={`Enter amount in ${c}`}>
                <T variant="caption" weight="semibold" color={entryCur === c ? colors.onPrimary : colors.textSecondary}>
                  {c}
                </T>
              </Press>
            ))}
          </View>
        </View>
        {entryCur !== 'USD' && parseAmount(amount) ? (
          <T variant="caption" color={colors.textSecondary}>
            ≈ {money(convert(parseAmount(amount)!, entryCur, 'USD', rates), 'USD', { decimals: true })} — saved in USD so the group can compare
          </T>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {expenseCategories.map((c) => (
            <Chip key={c.key} small label={c.key} icon={c.icon} active={cat === c.key} onPress={() => setCat(c.key)} />
          ))}
        </ScrollView>
        <T variant="caption" weight="semibold" color={colors.textSecondary}>
          Paid by
        </T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {trip.members.map((m) => (
            <Chip key={m.id} small label={m.name.split(' ')[0]} image={m.avatar} active={paidBy === m.id} onPress={() => setPaidBy(m.id)} />
          ))}
        </ScrollView>
        <View style={styles.rowBetween}>
          <T variant="caption" weight="semibold" color={colors.textSecondary}>
            Split between ({split.length})
          </T>
          <Press onPress={() => setSplit(split.length === trip.members.length ? [userId] : trip.members.map((m) => m.id))} hitSlop={8}>
            <T variant="caption" weight="bold">
              {split.length === trip.members.length ? 'Just me' : 'Everyone'}
            </T>
          </Press>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {trip.members.map((m) => (
            <Chip
              key={m.id}
              small
              label={m.name.split(' ')[0]}
              icon={split.includes(m.id) ? 'checkmark' : undefined}
              active={split.includes(m.id)}
              onPress={() => setSplit((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))}
            />
          ))}
        </View>
        {errors.split ? (
          <T variant="caption" color={colors.red}>
            {errors.split}
          </T>
        ) : null}
        <View style={styles.receiptRow}>
          <Button label="Attach receipt" icon="camera-outline" variant="soft" size="md" loading={attaching} onPress={() => attach(false)} style={{ flex: 1 }} />
          {Platform.OS !== 'web' ? <Button label="Take photo" icon="scan-outline" variant="soft" size="md" disabled={attaching} onPress={() => attach(true)} style={{ flex: 1 }} /> : null}
        </View>
        {receipt ? (
          <View style={styles.receiptRow}>
            <View>
              <Image source={{ uri: receipt }} style={styles.thumb} contentFit="cover" accessibilityLabel="Receipt photo" />
              <Press onPress={removeReceipt} style={styles.thumbX} hitSlop={8} accessibilityLabel="Remove receipt">
                <Ionicons name="close" size={13} color={colors.onPrimary} />
              </Press>
            </View>
            <T variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
              Receipt attached. It is saved with the expense.
            </T>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
