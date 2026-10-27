import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Plate, PlatePress } from '@/components/ui/Plate';
import { Rule } from '@/components/ui/Rule';
import { useAppStore } from '@/store/useAppStore';
import { colors, fonts, line, radius } from '@/theme';

/** The message box and send button at the bottom of the chat: an outlined field and a plated square, on a ruled strip of paper. */
export function Composer({ value, onChange, onSend, placeholder }: { value: string; onChange: (v: string) => void; onSend: () => void; placeholder: string }) {
  const [focused, setFocused] = useState(false);
  const scale = useAppStore((s) => s.settings.textScale);
  const empty = !value.trim();
  return (
    <View style={styles.wrap}>
      <Rule />
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Plate offset={3} corner={radius.button} color={focused ? colors.accent : 'transparent'}>
            <TextInput
              value={value}
              onChangeText={onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { fontSize: 15 * scale }]}
              multiline
              maxLength={1000}
              accessibilityLabel="Message"
              onSubmitEditing={onSend}
              submitBehavior="submit"
              returnKeyType="send"
              testID="chat-input"
            />
          </Plate>
        </View>
        <PlatePress
          onPress={onSend}
          disabled={empty}
          accessibilityLabel="Send message"
          testID="chat-send"
          offset={3}
          corner={radius.button}
          color={colors.accent}
          wrapperStyle={empty && { opacity: 0.45 }}
          style={styles.send}>
          <Ionicons name="arrow-up" size={22} color={colors.onPrimary} />
        </PlatePress>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  input: {
    minHeight: 48,
    maxHeight: 120,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    borderWidth: line,
    borderColor: colors.ink,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 13 : 11,
    paddingBottom: Platform.OS === 'ios' ? 13 : 11,
    fontFamily: fonts.regular,
    color: colors.text,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  send: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: line, borderColor: colors.ink, borderRadius: radius.button },
});
