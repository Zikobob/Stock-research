import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { currencies } from '@/data/reference';
import { colors, hair, line, radius } from '@/theme';

import { Input } from './ui/Input';
import { Press } from './ui/Press';
import { Sheet } from './ui/Sheet';
import { T } from './ui/T';

/**
 * Pick a currency: search, then tap a row. A row is a code in mono, the name, and a symbol in a small square; the chosen one is filled
 * with the accent and has a check.
 */
export function CurrencyPickerSheet({ visible, onClose, value, onPick, title = 'Choose currency' }: { visible: boolean; onClose: () => void; value: string; onPick: (code: string) => void; title?: string }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const list = currencies.filter((c) => !needle || c.code.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle));
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Input icon="search-outline" value={q} onChangeText={setQ} placeholder="Search currency" autoCapitalize="none" accessibilityLabel="Search currency" style={{ minHeight: 44 }} />
      <View style={styles.list}>
        {list.map((c, i) => {
          const on = c.code === value;
          return (
            <Press
              key={c.code}
              onPress={() => {
                onPick(c.code);
                onClose();
              }}
              accessibilityLabel={`${c.code}, ${c.name}`}
              accessibilityState={{ selected: on }}
              scaleTo={0.99}
              style={[styles.row, i > 0 && styles.divider, on && { backgroundColor: colors.accent }]}>
              <View style={[styles.sym, on && { backgroundColor: colors.card }]}>
                <T variant="kicker" color={colors.ink} style={{ fontSize: 12, letterSpacing: 0 }}>
                  {c.symbol.length > 3 ? c.code.slice(0, 1) : c.symbol}
                </T>
              </View>
              <T variant="kicker" color={on ? colors.onAccent : colors.ink} style={{ width: 44, fontSize: 14 }}>
                {c.code}
              </T>
              <T variant="small" color={on ? colors.onAccent : colors.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
                {c.name}
              </T>
              {on ? <Ionicons name="checkmark" size={18} color={colors.onAccent} /> : null}
            </Press>
          );
        })}
        {!list.length ? (
          <T variant="small" color={colors.textSecondary} style={{ padding: 16 }}>
            No currency matches “{q}”.
          </T>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { borderWidth: line, borderColor: colors.ink, borderRadius: radius.card, backgroundColor: colors.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, paddingVertical: 6 },
  divider: { borderTopWidth: hair, borderTopColor: colors.border },
  sym: { minWidth: 34, height: 34, paddingHorizontal: 4, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt, alignItems: 'center', justifyContent: 'center' },
});
