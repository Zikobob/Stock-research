import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { Press } from '@/components/ui/Press';
import { colors, fonts } from '@/theme';

/** The message box and send button at the bottom of the chat. */
export function Composer({ value, onChange, onSend, placeholder }: { value: string; onChange: (v: string) => void; onSend: () => void; placeholder: string }) {
  return (
    <View style={styles.inputBar}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        multiline
        maxLength={1000}
        accessibilityLabel="Message"
        onSubmitEditing={onSend}
        submitBehavior="submit"
        returnKeyType="send"
        testID="chat-input"
      />
      <Press onPress={onSend} style={[styles.send, !value.trim() && { opacity: 0.4 }]} disabled={!value.trim()} accessibilityLabel="Send message" testID="chat-send">
        <Ionicons name="arrow-up" size={20} color={colors.white} />
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    ...({ outlineStyle: 'none' } as object),
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
});
