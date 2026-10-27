import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Plate, PlatePress } from '@/components/ui/Plate';
import { Rule } from '@/components/ui/Rule';
import { useAppStore } from '@/store/useAppStore';
import { colors, fonts, line, radius } from '@/theme';

const MIN = 48;
const MAX = 120;
const PAD = 12;

/** The message box and send button at the bottom of the chat: an outlined field and a plated square, on a ruled strip of paper. */
export function Composer({ value, onChange, onSend, placeholder }: { value: string; onChange: (v: string) => void; onSend: () => void; placeholder: string }) {
  const [focused, setFocused] = useState(false);
  const [grown, setHeight] = useState(MIN);
  const scale = useAppStore((s) => s.settings.textScale);
  const empty = !value.trim();
  // an empty box is one line tall again (after Send); a phone shrinks it by itself as lines are deleted, a browser only grows it
  if (!value && grown !== MIN) setHeight(MIN);
  const height = value ? grown : MIN;
  return (
    <View style={styles.wrap}>
      <Rule />
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Plate offset={3} corner={radius.button} color={focused ? colors.accent : 'transparent'}>
            <View style={[styles.field, { height }]}>
              <TextInput
                value={value}
                onChangeText={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                onContentSizeChange={(e) => setHeight(Math.max(MIN, Math.min(MAX, Math.ceil(e.nativeEvent.contentSize.height) + 2 * line)))}
                style={[styles.input, { fontSize: 15 * scale }]}
                multiline
                maxLength={1000}
                // on the web a text area starts two rows tall; on a phone a fixed line count would stop it growing
                {...(Platform.OS === 'web' ? { numberOfLines: 1 } : null)}
                accessibilityLabel="Message"
                onSubmitEditing={onSend}
                submitBehavior="submit"
                returnKeyType="send"
                testID="chat-input"
              />
            </View>
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
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  // the outline sits on a View around the input (an input is not a positioned box on the web, so a plate drawn behind it would paint over it)
  field: { borderRadius: radius.button, backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, overflow: 'hidden' },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: PAD,
    fontFamily: fonts.regular,
    color: colors.text,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  send: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: line, borderColor: colors.ink, borderRadius: radius.button },
});
