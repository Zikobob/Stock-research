import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { convert, useRates } from '@/services/currency';
import { colors, fonts, radius } from '@/theme';
import { money } from '@/utils/format';
import { parseAmount } from '@/utils/validation';

import { CurrencyPickerSheet } from './CurrencyPickerSheet';
import { Press } from './ui/Press';
import { T } from './ui/T';

/** Two-way converter used on the Budget tab and the Currency screen. */
export function CurrencyConverter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const rates = useRates();
  const [amount, setAmount] = useState('50');
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const n = parseAmount(amount);
  const out = n === null ? null : convert(n, from, to, rates);
  const unit = convert(1, from, to, rates);

  const code = (which: 'from' | 'to', c: string) => (
    <Press onPress={() => setPicking(which)} style={styles.code} accessibilityLabel={`Change ${which} currency, currently ${c}`}>
      <T variant="small" weight="bold" color={colors.primary}>
        {c}
      </T>
      <Ionicons name="chevron-down" size={12} color={colors.primary} />
    </Press>
  );

  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.box, n === null && !!amount && { borderColor: colors.red }]}>
        <TextInput
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          style={styles.input}
          accessibilityLabel={`Amount in ${from}`}
          maxLength={12}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
        {code('from', from)}
      </View>
      <View style={styles.swapRow}>
        <View style={styles.line} />
        <Press onPress={() => onChange(to, from)} style={styles.swap} accessibilityLabel="Swap currencies">
          <Ionicons name="swap-vertical" size={17} color={colors.white} />
        </Press>
        <View style={styles.line} />
      </View>
      <View style={[styles.box, styles.result]}>
        <T variant="h2" numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1 }}>
          {out === null ? '—' : money(out, to, { decimals: true })}
        </T>
        {code('to', to)}
      </View>
      {n === null && amount ? (
        <T variant="caption" color={colors.red}>
          Enter a number, e.g. 25 or 25.50
        </T>
      ) : null}
      <View style={styles.rateRow}>
        <View style={[styles.liveDot, { backgroundColor: rates.live ? '#3FA34D' : colors.orange }]} />
        <T variant="caption" color={colors.textSecondary}>
          1 {from} = {unit < 0.01 ? unit.toFixed(5) : unit.toFixed(unit > 100 ? 1 : 4)} {to} · {rates.live ? 'live rate' : 'offline rate'}
        </T>
      </View>
      <CurrencyPickerSheet
        visible={!!picking}
        onClose={() => setPicking(null)}
        value={picking === 'from' ? from : to}
        onPick={(c) => (picking === 'from' ? onChange(c, to) : onChange(from, c))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: 54, borderRadius: radius.md, backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 8, gap: 8 },
  result: { backgroundColor: colors.primarySofter, borderColor: colors.primaryLine },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.semibold, fontSize: 20, color: colors.text, ...({ outlineStyle: 'none' } as object) },
  code: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primarySoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999 },
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  swap: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
});
