import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Plate } from '@/components/ui/Plate';
import { T } from '@/components/ui/T';
import { colors, fonts, line, radius } from '@/theme';

/**
 * The first thing in the Add expense sheet: the amount as a big mono number, like the total on a receipt. An ink outline, with the accent
 * plate under it while you type. (A text field cannot use the T component, so the mono face is named here once.)
 */
export function AmountField({ value, onChange, symbol, error, testID, label = 'Amount', suffix, compact, onSubmit }: { value: string; onChange: (v: string) => void; symbol: string; error?: string | null; testID?: string; /** What a screen reader calls the field. */ label?: string; /** Small words after the number, like "per day". */ suffix?: string; compact?: boolean; onSubmit?: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Plate offset={3} corner={radius.button} color={error ? colors.red : focused ? colors.accent : 'transparent'}>
        <View style={[styles.box, compact && styles.boxCompact, error ? { borderColor: colors.red, backgroundColor: colors.redSoft } : null]}>
          <T variant={compact ? 'numeralSm' : 'numeral'} color={colors.textMuted} importantForAccessibility="no">
            {symbol}
          </T>
          <TextInput
            value={value}
            onChangeText={onChange}
            onSubmitEditing={onSubmit}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            maxLength={10}
            accessibilityLabel={label}
            testID={testID}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[styles.input, compact && styles.inputCompact, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
          />
          {suffix ? (
            <T variant="small" color={colors.textSecondary}>
              {suffix}
            </T>
          ) : null}
        </View>
      </Plate>
      {error ? (
        <T variant="caption" color={colors.red} accessibilityLiveRegion="polite">
          {error}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  boxCompact: { minHeight: 56, paddingHorizontal: 14 },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.mono, fontSize: 40, color: colors.text, paddingVertical: 10 },
  inputCompact: { fontSize: 24, paddingVertical: 6 },
});
