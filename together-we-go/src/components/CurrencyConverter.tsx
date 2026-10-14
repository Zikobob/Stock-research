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
      <T variant="small" weight="bold">
        {c}
      </T>
      <Ionicons name="chevron-down" size={16} color={colors.text} />
    </Press>
  );

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.row}>
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
        </View>
        {code('from', from)}
      </View>
      <View style={styles.swapRow}>
        <Press onPress={() => onChange(to, from)} style={styles.swap} accessibilityLabel="Swap currencies" hitSlop={8}>
          <Ionicons name="swap-vertical" size={16} color={colors.text} />
        </Press>
      </View>
      <View style={styles.row}>
        <View style={styles.box}>
          <T variant="h3" weight="bold" numberOfLines={1} adjustsFontSizeToFit style={{ flex: 1 }}>
            {out === null ? '—' : money(out, to, { decimals: true })}
          </T>
        </View>
        {code('to', to)}
      </View>
      {n === null && amount ? (
        <T variant="caption" color={colors.red}>
          Enter a number, e.g. 25 or 25.50
        </T>
      ) : null}
      <View style={styles.rateRow}>
        <View style={[styles.liveDot, { backgroundColor: rates.live ? colors.positive : colors.orange }]} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: { flex: 1, minWidth: 0, height: 50, borderRadius: radius.md, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.semibold, fontSize: 18, color: colors.text, ...({ outlineStyle: 'none' } as object) },
  code: { width: 108, height: 50, borderRadius: radius.md, backgroundColor: colors.bgAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  swapRow: { alignItems: 'center' },
  swap: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
});
