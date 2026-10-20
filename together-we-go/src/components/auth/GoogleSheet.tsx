import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Press } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { DEMO_EMAIL } from '@/store/seed';
import { colors, radius } from '@/theme';
import { validateEmail, validateName } from '@/utils/validation';

/** Simulated Google account chooser — a production build would use OAuth via expo-auth-session. */
export function GoogleSheet({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (email: string, name: string) => void }) {
  const [other, setOther] = useState(false);
  const [mail, setMail] = useState('');
  const [name, setName] = useState('');
  const [errs, setErrs] = useState<{ mail?: string | null; name?: string | null }>({});
  return (
    <Sheet visible={visible} onClose={onClose} title="Choose an account" subtitle="to continue to TogetherWeGo">
      <Press onPress={() => onPick(DEMO_EMAIL, 'Maya Chen')} style={styles.gAcct}>
        <View style={[styles.gAvatar, { backgroundColor: colors.primary }]}>
          <T variant="title" color={colors.white}>
            M
          </T>
        </View>
        <View style={{ flex: 1 }}>
          <T variant="bodySm" weight="semibold">
            Maya Chen
          </T>
          <T variant="caption" color={colors.textSecondary}>
            {DEMO_EMAIL}
          </T>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Press>
      {other ? (
        <View style={{ gap: 12 }}>
          <Input label="Name" value={name} onChangeText={setName} error={errs.name} autoCapitalize="words" icon="person-outline" />
          <Input label="Google email" value={mail} onChangeText={setMail} error={errs.mail} autoCapitalize="none" keyboardType="email-address" icon="mail-outline" />
          <Button
            label="Continue"
            onPress={() => {
              const e = { mail: validateEmail(mail), name: validateName(name) };
              setErrs(e);
              if (!e.mail && !e.name) onPick(mail, name.trim());
            }}
          />
        </View>
      ) : (
        <Press onPress={() => setOther(true)} style={styles.gAcct}>
          <View style={[styles.gAvatar, { backgroundColor: colors.bgAlt }]}>
            <Ionicons name="person-add-outline" size={18} color={colors.textSecondary} />
          </View>
          <T variant="bodySm" weight="medium">
            Use another account
          </T>
        </Press>
      )}
      <T variant="caption" color={colors.textMuted}>
        Demo sign-in: in a store build this opens Google’s secure OAuth screen.
      </T>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  gAcct: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  gAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
