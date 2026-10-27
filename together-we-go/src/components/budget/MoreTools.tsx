import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { Rule } from '@/components/ui/Rule';
import { T } from '@/components/ui/T';
import { colors } from '@/theme';

import { styles as shared } from './styles';

/**
 * The things most people use once or never (the currency converter, the daily planner) folded under one line, so the page stays short.
 * Open it and they unfold in place.
 */
export function MoreTools({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Rule />
      <Press onPress={() => setOpen((o) => !o)} accessibilityLabel="More budget tools" accessibilityState={{ expanded: open }} scaleTo={0.99} style={[shared.ledgerRow, { minHeight: 64 }]}>
        <View style={shared.iconBox}>
          <Ionicons name="calculator-outline" size={20} color={colors.ink} />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="title" weight="bold">
            More budget tools
          </T>
          <T variant="caption" color={colors.textSecondary}>
            Converter and daily planner
          </T>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.ink} />
      </Press>
      {open ? <View style={styles.body}>{children}</View> : <Rule weight={1} style={{ backgroundColor: colors.border }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 28, paddingTop: 16 },
});
