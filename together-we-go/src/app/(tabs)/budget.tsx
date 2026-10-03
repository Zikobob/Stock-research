import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CurrencyConverter } from '@/components/CurrencyConverter';
import { NoTrip } from '@/components/trip/NoTrip';
import { expenseCategories, placeCategoryIcon } from '@/components/trip/meta';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarStack, Card, Chip, Pill, ProgressBar } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { placesFor } from '@/data/places';
import { useRatesLoader } from '@/hooks/useTrip';
import { useT } from '@/i18n';
import { convert, useRates } from '@/services/currency';
import { balances, memberById, settlePlan, totalSpent, useActiveTrip, useAppStore } from '@/store/useAppStore';
import type { Expense, ExpenseCategory } from '@/store/types';
import { categoryColors, colors, fonts, radius } from '@/theme';
import { money, priceTier } from '@/utils/format';
import { distanceKm, kmLabel } from '@/utils/geo';
import { daysBetween, todayInTz } from '@/utils/time';
import { firstError, maxLen, parseAmount, required, validateAmount } from '@/utils/validation';

export default function Budget() {
  const trip = useActiveTrip();
  if (!trip) return <NoTrip />;
  return <BudgetInner key={trip.id} />;
}

function BudgetInner() {
  const t = useT();
  useRatesLoader();
  const trip = useActiveTrip()!;
  const rates = useRates();
  const home = useAppStore((s) => s.settings.homeCurrency);
  const userId = useAppStore((s) => s.session?.userId ?? '');
  const addExpense = useAppStore((s) => s.addExpense);
  const deleteExpense = useAppStore((s) => s.deleteExpense);
  const updateTrip = useAppStore((s) => s.updateTrip);
  const settleUp = useAppStore((s) => s.settleUp);
  const dest = destinationById(trip.destinationId);
  const local = dest?.currency ?? 'EUR';

  const [view, setView] = useState<'home' | 'local'>('home');
  const [conv, setConv] = useState<[string, string]>([home, local === home ? 'EUR' : local]);
  const [capText, setCapText] = useState(String(trip.budget));
  const [capErr, setCapErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<Expense | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [daily, setDaily] = useState(String(dest?.dailyCost ?? 120));

  // add-expense form
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [entryCur, setEntryCur] = useState<'USD' | string>('USD');
  const [cat, setCat] = useState<ExpenseCategory>('Food');
  const [paidBy, setPaidBy] = useState(userId);
  const [split, setSplit] = useState<string[]>(trip.members.map((m) => m.id));
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const viewCode = view === 'home' ? home : local;
  const fmt = (usd: number) => money(convert(usd, 'USD', viewCode, rates), viewCode);

  const spent = totalSpent(trip);
  const per = spent / Math.max(1, trip.members.length);
  const pct = spent / Math.max(1, trip.budget);
  const catTotals: Record<string, number> = {};
  trip.expenses.filter((e) => !e.settlement).forEach((e) => (catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount));
  const byCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const bal = balances(trip);
  const plan = settlePlan(trip);
  const tripLen = daysBetween(trip.startDate, trip.endDate) + 1;
  const dailyN = parseAmount(daily) ?? 0;
  const plannedTotal = dailyN * tripLen * trip.members.length;
  const remaining = trip.budget - spent;
  const activityAllowance = dailyN * 0.3;
  const finds = dest
    ? [trip.destinationId, ...trip.extraDestinationIds]
        .flatMap((id) => placesFor(id))
        .filter((p) => p.cost <= activityAllowance)
        .map((p) => ({ p, km: distanceKm(dest, p) }))
        .filter((x) => x.km <= 8)
        .sort((a, b) => b.p.rating - a.p.rating)
        .slice(0, 3)
    : [];

  const saveCap = () => {
    const e = validateAmount(capText, { min: 1, max: 1_000_000, label: 'a budget' });
    setCapErr(e);
    if (e) return;
    const v = parseAmount(capText)!;
    updateTrip(trip.id, { budget: v });
    toast(`Budget cap set to ${money(v)}`);
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
    addExpense(trip.id, {
      title: title.trim(),
      amount: Math.round(usd * 100) / 100,
      category: cat,
      paidBy,
      splitBetween: split,
      date: todayInTz(dest?.tz ?? 'UTC'),
      original: entryCur === 'USD' ? undefined : { amount: n, currency: entryCur },
    });
    tap('success');
    toast(`Added ${money(usd)} · ${money(usd / split.length)} each`);
    setTitle('');
    setAmount('');
    if (spent + usd > trip.budget && spent <= trip.budget) toast('Heads up: this puts the group over budget', { tone: 'warn' });
  };

  return (
    <Screen bottomInset={30}>
      <View style={styles.head}>
        <View>
          <T variant="kicker" color={colors.textSecondary}>
            {t('budget.kicker')}
          </T>
          <T variant="h1">{t('budget.title')}</T>
        </View>
        <View style={styles.seg} accessibilityRole="tablist">
          {(['home', 'local'] as const).map((v) => (
            <Press key={v} onPress={() => setView(v)} style={[styles.segBtn, view === v && styles.segOn]} accessibilityRole="tab" accessibilityState={{ selected: view === v }} accessibilityLabel={`Show amounts in ${v === 'home' ? home : local}`}>
              <T variant="caption" weight="semibold" color={view === v ? colors.white : colors.textSecondary}>
                {v === 'home' ? home : local}
              </T>
            </Press>
          ))}
        </View>
      </View>

      {/* Spent card */}
      <View style={styles.spent}>
        <T variant="kicker" color="rgba(255,255,255,0.7)">
          {t('budget.spent')}
        </T>
        <T variant="display" color={colors.white} style={{ fontSize: 36, lineHeight: 42, marginTop: 4 }}>
          {fmt(spent)}
        </T>
        <T variant="caption" color="rgba(255,255,255,0.8)">
          {t('budget.of', { total: fmt(trip.budget), per: fmt(per) })}
        </T>
        <View style={{ marginTop: 14 }}>
          <ProgressBar value={pct} color={pct > 1 ? '#FFB4B4' : colors.white} track="rgba(255,255,255,0.22)" height={7} />
        </View>
        <T variant="caption" color="rgba(255,255,255,0.8)" style={{ marginTop: 8 }}>
          {pct > 1 ? `Over budget by ${fmt(spent - trip.budget)}` : t('budget.used', { pct: Math.round(pct * 100) })}
        </T>
      </View>

      {/* Breakdown */}
      <Card style={{ marginTop: 14 }}>
        <T variant="title" style={{ marginBottom: 10 }}>
          {t('budget.breakdown')}
        </T>
        <View style={styles.stack}>
          {byCat.map(([c, v]) => (
            <View key={c} style={{ flex: v, backgroundColor: categoryColors[c] ?? colors.textMuted }} />
          ))}
        </View>
        {byCat.map(([c, v]) => (
          <View key={c} style={styles.catRow}>
            <View style={[styles.dot, { backgroundColor: categoryColors[c] }]} />
            <T variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
              {c}
            </T>
            <T variant="small" weight="semibold" style={{ width: 90, textAlign: 'right' }}>
              {fmt(v)}
            </T>
            <T variant="caption" color={colors.textMuted} style={{ width: 40, textAlign: 'right' }}>
              {Math.round((v / Math.max(1, spent)) * 100)}%
            </T>
          </View>
        ))}
        {!byCat.length ? (
          <T variant="small" color={colors.textMuted}>
            No expenses yet — add your first one below.
          </T>
        ) : null}
      </Card>

      {/* Currency */}
      <Card style={{ marginTop: 14 }}>
        <View style={styles.rowBetween}>
          <T variant="title">{t('budget.currency')}</T>
          <Pill label={`${conv[0]} → ${conv[1]}`} icon="swap-horizontal" />
        </View>
        <View style={{ marginTop: 10 }}>
          <CurrencyConverter from={conv[0]} to={conv[1]} onChange={(a, b) => setConv([a, b])} />
        </View>
      </Card>

      {/* Daily planner */}
      <Card style={{ marginTop: 14, gap: 10 }}>
        <View style={styles.rowBetween}>
          <T variant="title">{t('budget.planner')}</T>
          <Ionicons name="calculator-outline" size={18} color={colors.primary} />
        </View>
        <T variant="small" color={colors.textSecondary}>
          How much does each person want to spend per day in {dest?.city}? (Typical: {money(dest?.dailyCost ?? 0)})
        </T>
        <View style={styles.dailyRow}>
          <T variant="h3">$</T>
          <TextInput value={daily} onChangeText={(v) => setDaily(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={styles.dailyInput} accessibilityLabel="Daily spend per person in USD" maxLength={6} />
          <T variant="small" color={colors.textSecondary}>
            / person / day
          </T>
        </View>
        {dailyN > 0 ? (
          <>
            <View style={styles.splitRow}>
              {[
                ['Food', 0.35],
                ['Activities', 0.3],
                ['Transport', 0.15],
                ['Shopping', 0.12],
                ['Other', 0.08],
              ].map(([k, f]) => (
                <View key={k as string} style={styles.splitCell}>
                  <View style={[styles.dot, { backgroundColor: categoryColors[k as string] }]} />
                  <T variant="micro" color={colors.textSecondary}>
                    {k as string}
                  </T>
                  <T variant="small" weight="bold">
                    {money(dailyN * (f as number))}
                  </T>
                </View>
              ))}
            </View>
            <View style={[styles.fit, { backgroundColor: plannedTotal <= remaining ? colors.primarySofter : colors.orangeSoft }]}>
              <Ionicons name={plannedTotal <= remaining ? 'checkmark-circle' : 'alert-circle'} size={16} color={plannedTotal <= remaining ? colors.primary : colors.orange} />
              <T variant="caption" style={{ flex: 1 }}>
                {tripLen} days × {trip.members.length} people = {money(plannedTotal)} on the ground ·{' '}
                {plannedTotal <= remaining ? `fits the ${money(remaining)} left` : `${money(plannedTotal - remaining)} more than what’s left`}
              </T>
            </View>
            <T variant="small" weight="semibold" style={{ marginTop: 2 }}>
              Budget finds near {dest?.city} (≤ {money(activityAllowance)} each)
            </T>
            {finds.map(({ p, km }) => (
              <Press key={p.id} onPress={() => router.push({ pathname: '/nearby', params: { focus: p.id, maxCost: String(Math.round(activityAllowance)) } })} style={styles.findRow}>
                <Ionicons name={placeCategoryIcon[p.category]} size={15} color={colors.primary} />
                <T variant="small" style={{ flex: 1 }} numberOfLines={1}>
                  {p.name}
                </T>
                <T variant="caption" color={colors.textSecondary}>
                  {priceTier(p.cost)} · {kmLabel(km)}
                </T>
              </Press>
            ))}
          </>
        ) : (
          <T variant="caption" color={colors.red}>
            Enter a daily amount greater than 0
          </T>
        )}
      </Card>

      {/* Expenses */}
      <View style={[styles.rowBetween, { marginTop: 22, marginBottom: 10 }]}>
        <T variant="h3">{t('budget.expenses')}</T>
        <View style={styles.capBox}>
          <T variant="caption" color={colors.textSecondary}>
            {t('budget.cap')}
          </T>
          <TextInput
            value={capText}
            onChangeText={(v) => setCapText(v.replace(/[^0-9.]/g, ''))}
            onBlur={saveCap}
            onSubmitEditing={saveCap}
            keyboardType="decimal-pad"
            style={[styles.capInput, capErr && { borderColor: colors.red }]}
            accessibilityLabel="Group budget cap in USD"
            maxLength={8}
          />
        </View>
      </View>
      {capErr ? (
        <T variant="caption" color={colors.red} style={{ marginBottom: 8 }}>
          {capErr}
        </T>
      ) : null}
      <View style={{ gap: 8 }}>
        {trip.expenses.map((e) => (
          <Press key={e.id} onPress={() => setDetail(e)} style={styles.expense} scaleTo={0.99} accessibilityLabel={`${e.title}, ${fmt(e.amount)}`}>
            <View style={[styles.dot, { backgroundColor: e.settlement ? colors.textMuted : categoryColors[e.category] }]} />
            <View style={{ flex: 1 }}>
              <T variant="small" weight="semibold" numberOfLines={1}>
                {e.title}
              </T>
              <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {e.settlement ? 'Settlement' : e.category} · {t('budget.paidBy', { name: memberById(trip, e.paidBy)?.name.split(' ')[0] ?? '—' })}
                {e.original ? ` · ${money(e.original.amount, e.original.currency)}` : ''}
              </T>
            </View>
            <T variant="small" weight="bold">
              {fmt(e.amount)}
            </T>
          </Press>
        ))}
      </View>

      {/* Balances */}
      <Card style={{ marginTop: 14 }}>
        <View style={styles.rowBetween}>
          <T variant="title">Who owes who</T>
          <Button label={t('budget.settle')} size="sm" full={false} variant="soft" icon="swap-horizontal" onPress={() => setSettleOpen(true)} />
        </View>
        {trip.members.map((m) => {
          const v = bal[m.id] ?? 0;
          return (
            <View key={m.id} style={styles.balRow}>
              <Avatar name={m.name} src={m.avatar} size={28} />
              <T variant="small" style={{ flex: 1 }}>
                {m.name.split(' ')[0]}
                {m.id === userId ? ' (you)' : ''}
              </T>
              <T variant="small" weight="semibold" color={Math.abs(v) < 0.5 ? colors.textMuted : v > 0 ? colors.primary : colors.red}>
                {Math.abs(v) < 0.5 ? 'settled' : v > 0 ? `gets ${fmt(v)}` : `owes ${fmt(-v)}`}
              </T>
            </View>
          );
        })}
      </Card>

      {/* Add expense */}
      <Card style={{ marginTop: 14, gap: 12 }}>
        <T variant="title">{t('budget.addExpense')}</T>
        <Input placeholder={t('budget.whatFor')} value={title} onChangeText={setTitle} error={errors.title} maxLength={45} testID="expense-title" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Input placeholder="100" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={errors.amount} containerStyle={{ flex: 1 }} icon="cash-outline" testID="expense-amount" />
          <View style={styles.curToggle}>
            {['USD', local].filter((c, i, a) => a.indexOf(c) === i).map((c) => (
              <Press key={c} onPress={() => setEntryCur(c)} style={[styles.curBtn, entryCur === c && styles.segOn]} accessibilityLabel={`Enter amount in ${c}`}>
                <T variant="caption" weight="semibold" color={entryCur === c ? colors.white : colors.textSecondary}>
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
            <T variant="caption" weight="semibold" color={colors.primary}>
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
        <Button label={t('budget.add')} icon="add" onPress={submit} testID="add-expense" />
      </Card>

      {/* Expense detail */}
      <Sheet visible={!!detail} onClose={() => setDetail(null)} title={detail?.title} subtitle={detail ? `${detail.category} · ${detail.date}` : undefined}>
        {detail ? (
          <>
            <View style={styles.rowBetween}>
              <T variant="h1">{fmt(detail.amount)}</T>
              {detail.original ? <Pill label={`Paid as ${money(detail.original.amount, detail.original.currency)}`} tone="blue" /> : null}
            </View>
            <View style={styles.rowBetween}>
              <T variant="small" color={colors.textSecondary}>
                Paid by {memberById(trip, detail.paidBy)?.name}
              </T>
              <T variant="small" weight="semibold">
                {fmt(detail.amount / Math.max(1, detail.splitBetween.length))} each
              </T>
            </View>
            <AvatarStack people={detail.splitBetween.map((id) => memberById(trip, id)).filter((m): m is NonNullable<typeof m> => !!m)} max={6} size={30} />
            <Button
              label="Delete expense"
              variant="danger"
              icon="trash-outline"
              onPress={() => {
                const d = detail;
                setDetail(null);
                confirmAction('Delete expense?', `${d.title} (${money(d.amount)}) will be removed.`, () => {
                  deleteExpense(trip.id, d.id);
                  toast('Expense deleted');
                }, { destructive: true, confirmLabel: 'Delete' });
              }}
            />
          </>
        ) : null}
      </Sheet>

      {/* Settle up */}
      <Sheet visible={settleOpen} onClose={() => setSettleOpen(false)} title="Settle up" subtitle="Fewest payments to make everyone even">
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
            <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
            <T variant="title">Everyone is square! 🎉</T>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12, marginBottom: 14 },
  seg: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 999, borderWidth: 1, borderColor: colors.border, padding: 3 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  segOn: { backgroundColor: colors.primary },
  spent: { backgroundColor: colors.primary, borderRadius: radius.xl, padding: 20 },
  stack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 10, gap: 2 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyInput: { width: 90, height: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardMuted, paddingHorizontal: 10, fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  splitCell: { alignItems: 'center', gap: 2 },
  fit: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: radius.sm },
  findRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  capBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  capInput: { width: 76, height: 32, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  expense: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  curToggle: { flexDirection: 'row', height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 4, gap: 4, backgroundColor: colors.cardMuted },
  curBtn: { paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center' },
  settleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
});
