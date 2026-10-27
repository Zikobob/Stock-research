import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { colors } from '@/theme';
import { normalizeInvite, validateInvite } from '@/utils/validation';

/**
 * "Join with a code" for someone who was invited and is not signed in yet. A trip needs a person in it, so this asks for the code
 * first and keeps it: after signing in (or creating an account) the app opens the trip's join page with the code already in.
 */
export function JoinCodeSheet({ visible, onClose, onDone, initial }: { visible: boolean; onClose: () => void; onDone: (code: string) => void; initial?: string | null }) {
  const [code, setCode] = useState(initial ?? '');
  const [shown, setShown] = useState(false);
  const error = shown ? validateInvite(code) : null;
  const ok = !validateInvite(code);

  const submit = () => {
    setShown(true);
    if (validateInvite(code)) return;
    onDone(code);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Join with a code" subtitle="Enter the code your friend shared. You will sign in first, then land in the trip.">
      <Input
        label="Invite code"
        icon={error ? 'alert-circle' : 'ticket-outline'}
        value={code}
        onChangeText={(v) => setCode(normalizeInvite(v))}
        onBlur={() => code && setShown(true)}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        placeholder="ABC-1234"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={error}
        hint="Three letters, a dash and four numbers"
        right={ok ? <Ionicons name="checkmark-circle" size={20} color={colors.positive} /> : undefined}
        testID="join-code"
      />
      <View style={{ paddingBottom: 4 }}>
        <Button label="Continue" iconRight="arrow-forward" onPress={submit} testID="join-code-continue" />
      </View>
      <T variant="caption" color={colors.textMuted}>
        No account yet? You can create one on the next screen.
      </T>
    </Sheet>
  );
}
