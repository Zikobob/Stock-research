import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Divider } from '@/components/ui/bits';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Press } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { DEMO_EMAIL } from '@/store/seed';
import { colors, radius } from '@/theme';
import { validateEmail, validateName } from '@/utils/validation';

/** Simulated Google account chooser: a production build would use OAuth via expo-auth-session. */
export function GoogleSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (email: string, name: string) => void }) {
  const [other, setOther] = useState(false);
  const [mail, setMail] = useState('');
  const [name, setName] = useState('');
  const [shown, setShown] = useState(false);
  const nameErr = shown ? validateName(name) : null;
  const mailErr = shown ? validateEmail(mail) : null;
  return (
    <Sheet visible={visible} onClose={onClose} title="Choose an account" subtitle="to continue to TogetherWeGo">
      <Card padded={false}>
        <Press onPress={() => onPick(DEMO_EMAIL, 'Maya Chen')} accessibilityLabel={`Maya Chen, ${DEMO_EMAIL}`} scaleTo={0.99} style={styles.row}>
          <Avatar name="Maya Chen" src="avatar-maya" size={40} />
          <View style={{ flex: 1 }}>
            <T variant="bodySm" weight="bold">
              Maya Chen
            </T>
            <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {DEMO_EMAIL}
            </T>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.ink} />
        </Press>
        <Divider />
        <Press onPress={() => setOther(true)} accessibilityLabel="Use another account" accessibilityState={{ expanded: other }} scaleTo={0.99} style={styles.row}>
          <View style={styles.plus}>
            <Ionicons name="person-add-outline" size={18} color={colors.ink} />
          </View>
          <T variant="bodySm" weight="bold" style={{ flex: 1 }}>
            Use another account
          </T>
          <Ionicons name={other ? 'remove' : 'add'} size={20} color={colors.ink} />
        </Press>
      </Card>
      {other ? (
        <View style={{ gap: 16 }}>
          <Input label="Name" value={name} onChangeText={setName} error={nameErr} autoCapitalize="words" icon={nameErr ? 'alert-circle' : 'person-outline'} />
          <Input label="Google email" value={mail} onChangeText={setMail} error={mailErr} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" icon={mailErr ? 'alert-circle' : 'mail-outline'} />
          <Button
            label="Continue"
            onPress={() => {
              setShown(true);
              if (!validateEmail(mail) && !validateName(name)) onPick(mail, name.trim());
            }}
          />
        </View>
      ) : null}
      <T variant="caption" color={colors.textMuted}>
        Demo sign-in: in a store build this opens Google’s secure OAuth screen.
      </T>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 64 },
  plus: { width: 40, height: 40, borderRadius: radius.button, borderWidth: 2, borderColor: colors.ink, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
});
