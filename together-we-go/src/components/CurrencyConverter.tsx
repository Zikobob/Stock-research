import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { convert, useRates } from '@/services/currency';
import { colors, fonts, line, radius } from '@/theme';
import { money } from '@/utils/format';
import { parseAmount } from '@/utils/validation';

import { CurrencyPickerSheet } from './CurrencyPickerSheet';
import { IconButton } from './ui/bits';
import { Press } from './ui/Press';
import { Stamp } from './ui/Stamp';
import { T } from './ui/T';

/**
 * Two-way converter used on the Budget tab and the Currency screen. Two outlined boxes like the lines of an exchange board: what you have
 * (type it) and what you get (a big mono number), each with its currency on the right, and a square swap button between them.
 */
export function CurrencyConverter({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const rates = useRates();
  const [amount, setAmount] = useState('50');
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const n = parseAmount(amount);
  const out = n === null ? null : convert(n, from, to, rates);
  const unit = convert(1, from, to, rates);
  const shown = out === null ? '—' : money(out, to, { decimals: true });

  const code = (which: 'from' | 'to', c: string) => (
    <Press onPress={() => setPicking(which)} style={styles.code} accessibilityLabel={`Change ${which} currency, currently ${c}`}>
      <T variant="kicker" color={colors.ink} style={{ fontSize: 14 }}>
        {c}
      </T>
      <Ionicons name="chevron-down" size={16} color={colors.ink} />
    </Press>
  );

  return (
    <View style={{ gap: 8 }}>
      <T variant="kicker" color={colors.textSecondary}>
        You have
      </T>
      <View style={[styles.box, n === null && !!amount && { borderColor: colors.red, backgroundColor: colors.redSoft }]}>
        <TextInput
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))}
          keyboardType="decimal-pad"
          style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
          accessibilityLabel={`Amount in ${from}`}
          maxLength={12}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
        {code('from', from)}
      </View>

      <View style={styles.between}>
        <T variant="kicker" color={colors.textSecondary}>
          You get
        </T>
        <IconButton icon="swap-vertical" label="Swap currencies" onPress={() => onChange(to, from)} />
      </View>
      <View style={[styles.box, { backgroundColor: colors.bgAlt }]}>
        <T variant="numeral" numberOfLines={1} style={{ flex: 1, minWidth: 0, fontSize: shown.length > 11 ? 20 : shown.length > 9 ? 24 : 28 }}>
          {shown}
        </T>
        {code('to', to)}
      </View>

      {n === null && amount ? (
        <T variant="caption" color={colors.red}>
          Enter a number, e.g. 25 or 25.50
        </T>
      ) : null}
      <View style={styles.rateRow}>
        <T variant="caption" color={colors.textSecondary} style={{ flexShrink: 1 }}>
          1 {from} = {unit < 0.01 ? unit.toFixed(5) : unit.toFixed(unit > 100 ? 1 : 4)} {to}
        </T>
        <Stamp label={rates.live ? 'Live rate' : 'Offline rate'} tone={rates.live ? 'positive' : 'muted'} icon={rates.live ? 'radio-outline' : 'cloud-offline-outline'} rotate={0} />
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
  box: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, paddingLeft: 14, overflow: 'hidden' },
  // a text field cannot use the T component, so the mono face is named here
  input: { flex: 1, minWidth: 0, fontFamily: fonts.mono, fontSize: 28, color: colors.text, paddingVertical: 8 },
  code: { alignSelf: 'stretch', minWidth: 96, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, marginLeft: 8, borderLeftWidth: line, borderLeftColor: colors.ink, backgroundColor: colors.primarySoft },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 4 },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 4 },
});
