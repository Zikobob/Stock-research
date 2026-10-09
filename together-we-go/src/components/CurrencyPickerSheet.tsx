import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { currencies } from '@/data/reference';
import { colors, fonts, radius } from '@/theme';

import { Press } from './ui/Press';
import { Sheet } from './ui/Sheet';
import { T } from './ui/T';

export function CurrencyPickerSheet({ visible, onClose, value, onPick, title = 'Choose currency' }: { visible: boolean; onClose: () => void; value: string; onPick: (code: string) => void; title?: string }) {
  const [q, setQ] = useState('');
  const list = currencies.filter((c) => !q || c.code.toLowerCase().includes(q.toLowerCase()) || c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <TextInput value={q} onChangeText={setQ} placeholder="Search currency…" placeholderTextColor={colors.textMuted} style={styles.search} autoCapitalize="none" />
      <View style={{ gap: 6 }}>
        {list.map((c) => (
          <Press
            key={c.code}
            onPress={() => {
              onPick(c.code);
              onClose();
            }}
            style={[styles.row, c.code === value && styles.rowOn]}
            accessibilityState={{ selected: c.code === value }}>
            <View style={styles.sym}>
              <T variant="small" weight="bold" color={colors.primary}>
                {c.symbol.length > 3 ? c.code.slice(0, 1) : c.symbol}
              </T>
            </View>
            <T variant="bodySm" weight="semibold" style={{ width: 48 }}>
              {c.code}
            </T>
            <T variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
              {c.name}
            </T>
          </Press>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  search: { height: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, fontFamily: fonts.regular, color: colors.text, backgroundColor: colors.cardMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.sm },
  rowOn: { backgroundColor: colors.primarySofter },
  sym: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
});
