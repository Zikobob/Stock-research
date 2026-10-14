import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CurrencyConverter } from '@/components/CurrencyConverter';
import { NoTrip } from '@/components/trip/NoTrip';
import { expenseCategories, placeCategoryIcon } from '@/components/trip/meta';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarStack, Card, Chip, Pill } from '@/components/ui/bits';
import { Donut } from '@/components/ui/Donut';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { placesFor } from '@/data/places';
import { useRatesLoader } from '@/hooks/useTrip';
import { useT } from '@/i18n';
import { convert, useRates } from '@/services/currency';
import { deleteLocalFile, pickImage } from '@/services/files';
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
  const [receiptBig, setReceiptBig] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [daily, setDaily] = useState(String(dest?.dailyCost ?? 120));
  const [today] = useState(() => todayInTz(dest?.tz ?? 'UTC'));

  // add-expense form
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [entryCur, setEntryCur] = useState<'USD' | string>('USD');
  const [cat, setCat] = useState<ExpenseCategory>('Food');
  const [paidBy, setPaidBy] = useState(userId);
  const [split, setSplit] = useState<string[]>(trip.members.map((m) => m.id));
  const [receipt, setReceipt] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const viewCode = view === 'home' ? home : local;
  const fmt = (usd: number) => money(convert(usd, 'USD', viewCode, rates), viewCode);

  const spent = totalSpent(trip);
  const per = spent / Math.max(1, trip.members.length);
  const catTotals: Record<string, number> = {};
  trip.expenses.filter((e) => !e.settlement).forEach((e) => (catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount));
  const byCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const bal = balances(trip);
  const plan = settlePlan(trip);
  const tripLen = daysBetween(trip.startDate, trip.endDate) + 1;
  const daysLeft = Math.max(1, Math.min(tripLen, daysBetween(today, trip.endDate) + 1));
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
    setAddOpen(false);
    if (spent + usd > trip.budget && spent <= trip.budget) toast('Heads up: this puts the group over budget', { tone: 'warn' });
  };

  const openDetail = (e: Expense) => {
    setReceiptBig(false);
    setDetail(e);
  };

  const firstName = (id: string, name: string) => (id === userId ? 'You' : name.split(' ')[0]);

  return (
    <Screen bottomInset={30}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
            {trip.name}
          </T>
          <T variant="display" accessibilityRole="header">
            {t('budget.title')}
          </T>
        </View>
        <Press onPress={() => setAddOpen(true)} style={styles.plus} accessibilityLabel="Add expense" testID="add-expense-open">
          <Ionicons name="add" size={26} color={colors.onPrimary} />
        </Press>
      </View>

      <Segmented
        options={[
          { key: 'home', label: `Home · ${home}` },
          { key: 'local', label: `Local · ${local}` },
        ]}
        value={view}
        onChange={setView}
      />

      <Card style={[styles.card, { marginTop: 14 }]}>
        <View style={styles.donutRow}>
          <Donut
            size={132}
            parts={byCat.map(([c, v]) => ({ value: v, color: categoryColors[c] ?? colors.textMuted }))}
            centerLabel={remaining < 0 ? 'OVER' : 'LEFT'}
            centerValue={fmt(Math.abs(remaining))}
          />
          <View style={{ flex: 1, gap: 8 }}>
            <T variant="kicker" weight="bold" color={colors.textSecondary} numberOfLines={1} adjustsFontSizeToFit style={styles.tinyKicker}>
              {`Spent ${fmt(spent)} / ${fmt(trip.budget)}`}
            </T>
            {byCat.map(([c, v]) => (
              <View key={c} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: categoryColors[c] ?? colors.textMuted }]} />
                <T variant="small" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                  {c}
                </T>
                <T variant="small" weight="bold">
                  {fmt(v)}
                </T>
              </View>
            ))}
            {!byCat.length ? (
              <T variant="small" color={colors.textMuted}>
                No expenses yet. Tap + to add your first one.
              </T>
            ) : null}
          </View>
        </View>
      </Card>

      <View style={styles.tiles}>
        <Card style={[styles.card, styles.tile]}>
          <T variant="kicker" weight="bold" color={colors.textSecondary} style={styles.tinyKicker}>
            Per person
          </T>
          <T variant="h2" weight="extrabold" numberOfLines={1} adjustsFontSizeToFit>
            {fmt(per)}
          </T>
        </Card>
        <Card style={[styles.card, styles.tile]}>
          <T variant="kicker" weight="bold" color={colors.textSecondary} style={styles.tinyKicker}>
            Daily allowance
          </T>
          <T variant="h2" weight="extrabold" numberOfLines={1} adjustsFontSizeToFit>
            {fmt(Math.max(0, remaining) / daysLeft)}
          </T>
        </Card>
      </View>

      <View style={styles.sectionRow}>
        <T variant="headline" accessibilityRole="header" style={{ flexShrink: 1 }}>
          Who owes who
        </T>
        <Button label={t('budget.settle')} size="sm" full={false} variant="soft" icon="swap-horizontal" onPress={() => setSettleOpen(true)} />
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

      <T variant="headline" accessibilityRole="header" style={styles.section}>
        Converter
      </T>
      <Card style={styles.card}>
        <CurrencyConverter from={conv[0]} to={conv[1]} onChange={(a, b) => setConv([a, b])} />
      </Card>

      <T variant="headline" accessibilityRole="header" style={styles.section}>
        {t('budget.planner')}
      </T>
      <Card style={[styles.card, { gap: 12 }]}>
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
              <Ionicons name={plannedTotal <= remaining ? 'checkmark-circle' : 'alert-circle'} size={16} color={plannedTotal <= remaining ? colors.positive : colors.orange} />
              <T variant="caption" style={{ flex: 1 }}>
                {tripLen} days × {trip.members.length} people = {money(plannedTotal)} on the ground ·{' '}
                {plannedTotal <= remaining ? `fits the ${money(remaining)} left` : `${money(plannedTotal - remaining)} more than what’s left`}
              </T>
            </View>
            <T variant="small" weight="bold" style={{ marginTop: 2 }}>
              Budget finds near {dest?.city} (≤ {money(activityAllowance)} each)
            </T>
            {finds.map(({ p, km }) => (
              <Press key={p.id} onPress={() => router.push({ pathname: '/nearby', params: { focus: p.id, maxCost: String(Math.round(activityAllowance)) } })} style={styles.findRow}>
                <View style={styles.findIcon}>
                  <Ionicons name={placeCategoryIcon[p.category]} size={15} color={colors.text} />
                </View>
                <T variant="small" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
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

      <View style={[styles.sectionRow, { marginTop: 26 }]}>
        <T variant="headline" accessibilityRole="header" style={{ flexShrink: 1 }}>
          {t('budget.expenses')}
        </T>
        <View style={styles.capBox}>
          <T variant="caption" weight="semibold" color={colors.textSecondary}>
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
        <T variant="caption" color={colors.red} style={{ marginBottom: 8, marginTop: -4 }}>
          {capErr}
        </T>
      ) : null}
      <View style={{ gap: 10 }}>
        {trip.expenses.map((e) => (
          <Card key={e.id} padded={false} onPress={() => openDetail(e)} style={styles.expense} accessibilityLabel={`${e.title}, ${fmt(e.amount)}`}>
            <View style={[styles.expenseDot, { backgroundColor: e.settlement ? colors.textMuted : categoryColors[e.category] ?? colors.textMuted }]} />
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <T variant="bodySm" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {e.title}
                </T>
                {e.receipt ? <Ionicons name="attach" size={15} color={colors.textMuted} accessibilityLabel="Has receipt" /> : null}
              </View>
              <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
                {e.settlement ? 'Settlement' : e.category} · {t('budget.paidBy', { name: memberById(trip, e.paidBy)?.name.split(' ')[0] ?? '—' })}
                {e.original ? ` · ${money(e.original.amount, e.original.currency)}` : ''}
              </T>
            </View>
            <T variant="small" weight="extrabold">
              {fmt(e.amount)}
            </T>
          </Card>
        ))}
      </View>

      {/* Add expense */}
      <Sheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
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

      {/* Expense detail */}
      <Sheet visible={!!detail} onClose={() => setDetail(null)} title={detail?.title} subtitle={detail ? `${detail.category} · ${detail.date}` : undefined}>
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
                setDetail(null);
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
            <Ionicons name="checkmark-circle" size={40} color={colors.positive} />
            <T variant="title">Everyone is square! 🎉</T>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 12, marginBottom: 14 },
  plus: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  card: { borderRadius: radius.xl },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  tinyKicker: { fontSize: 10.5, letterSpacing: 0.6 },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 12 },
  tile: { flex: 1, gap: 4, paddingHorizontal: 16, paddingVertical: 14 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 12 },
  section: { marginTop: 24, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  balDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  nameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dailyInput: { width: 96, height: 46, borderRadius: radius.md, backgroundColor: colors.bgAlt, paddingHorizontal: 14, fontFamily: fonts.semibold, fontSize: 17, color: colors.text, ...({ outlineStyle: 'none' } as object) },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between' },
  splitCell: { alignItems: 'center', gap: 2 },
  fit: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: radius.md },
  findRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  findIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  capBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  capInput: { width: 80, height: 34, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, textAlign: 'center', fontFamily: fonts.bold, fontSize: 13, color: colors.text, ...({ outlineStyle: 'none' } as object) },
  expense: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 14 },
  expenseDot: { width: 11, height: 11, borderRadius: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  curToggle: { flexDirection: 'row', height: 50, borderRadius: radius.md, padding: 4, gap: 4, backgroundColor: colors.bgAlt },
  curBtn: { paddingHorizontal: 12, borderRadius: radius.sm, justifyContent: 'center' },
  curOn: { backgroundColor: colors.primary },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.bgAlt },
  thumbX: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.white },
  receiptSmall: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.bgAlt },
  receiptBig: { width: '100%', height: 380, borderRadius: radius.md, backgroundColor: colors.bgAlt },
  settleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.bgAlt },
});
