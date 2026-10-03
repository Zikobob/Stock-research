import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/theme';
import { passwordStrength, validateEmail, validateName, validatePassword } from '@/utils/validation';

export default function SignUp() {
  const signUp = useAppStore((s) => s.signUp);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null | undefined>>({});
  const [loading, setLoading] = useState(false);
  const strength = passwordStrength(password);

  const submit = async () => {
    const e = {
      name: validateName(name),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: !confirm ? 'Re-enter your password' : confirm !== password ? 'Passwords don’t match' : null,
      agree: agree ? null : 'Please accept the terms to continue',
    };
    setErrors(e);
    if (Object.values(e).some(Boolean)) return tap('warning');
    setLoading(true);
    const res = await signUp(name, email, password);
    setLoading(false);
    if (!res.ok) {
      setErrors({ email: res.error });
      return tap('warning');
    }
    tap('success');
    router.replace('/(tabs)/explore');
  };

  const bars = [colors.red, colors.orange, colors.yellow, '#6BAA75', colors.primary];

  return (
    <Screen header={<Header title="Create account" subtitle="Start planning trips with your crew" />}>
      <View style={{ gap: 14 }}>
        <Input label="Full name" icon="person-outline" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" error={errors.name} placeholder="e.g. Alex Rivera" />
        <Input label="Email address" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={errors.email} placeholder="you@email.com" />
        <View style={{ gap: 8 }}>
          <Input label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureToggle error={errors.password} placeholder="At least 8 characters" textContentType="newPassword" />
          {password ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[styles.bar, { backgroundColor: i < strength.score ? bars[strength.score] : colors.border }]} />
                ))}
              </View>
              <T variant="caption" color={colors.textSecondary}>
                Strength: {strength.label}
              </T>
            </View>
          ) : null}
        </View>
        <Input label="Confirm password" icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} secureToggle error={errors.confirm} placeholder="Re-enter password" />
        <Press onPress={() => setAgree((a) => !a)} style={styles.agree} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
          <View style={[styles.box, agree && styles.boxOn]}>{agree ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}</View>
          <T variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
            I agree to the Terms of Service and Privacy Policy
          </T>
        </Press>
        {errors.agree ? (
          <T variant="caption" color={colors.red}>
            {errors.agree}
          </T>
        ) : null}
        <Button label="Create account" onPress={submit} loading={loading} />
        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
          <T variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
            Your password is salted and hashed on-device — it’s never stored in plain text.
          </T>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { flex: 1, height: 5, borderRadius: 3 },
  agree: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  note: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: radius.sm, backgroundColor: colors.primarySofter },
});
