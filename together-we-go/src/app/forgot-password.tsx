import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/bits';
import { showDialog, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { validateEmail, validatePassword } from '@/utils/validation';

/** Two-step reset: request a 6-digit code, then set a new password. Works fully offline. */
export default function ForgotPassword() {
  const accountExists = useAppStore((s) => s.accountExists);
  const resetPassword = useAppStore((s) => s.resetPassword);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState('');
  const [pw, setPw] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  const sendCode = () => {
    const e = validateEmail(email);
    if (e) return setErrors({ email: e });
    if (!accountExists(email)) return setErrors({ email: 'We couldn’t find an account with that email.' });
    const c = String(Math.floor(100000 + Math.random() * 900000));
    setSent(c);
    setErrors({});
    setStep(2);
    showDialog('Check your inbox', `We sent a 6-digit code to ${email.trim()}.\n\nDemo build: your code is ${c}`, [{ label: 'OK' }], 'mail-unread-outline');
  };

  const reset = async () => {
    const e = {
      code: !/^\d{6}$/.test(code) ? 'Enter the 6-digit code' : code !== sent ? 'That code doesn’t match' : null,
      pw: validatePassword(pw),
    };
    setErrors(e);
    if (e.code || e.pw) return tap('warning');
    setLoading(true);
    const r = await resetPassword(email, pw);
    setLoading(false);
    if (!r.ok) return setErrors({ code: r.error });
    tap('success');
    toast('Password updated — sign in with your new password');
    router.back();
  };

  return (
    <Screen header={<Header title="Reset password" subtitle={step === 1 ? 'Step 1 of 2 · verify email' : 'Step 2 of 2 · new password'} />}>
      <Card>
        <T variant="bodySm" color={colors.textSecondary} style={{ marginBottom: 14 }}>
          {step === 1 ? 'Enter the email you signed up with and we’ll send you a reset code.' : `Enter the code sent to ${email.trim()} and choose a new password.`}
        </T>
        {step === 1 ? (
          <View style={{ gap: 14 }}>
            <Input label="Email address" icon="mail-outline" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={errors.email} />
            <Button label="Send reset code" onPress={sendCode} icon="paper-plane" />
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Input label="6-digit code" icon="key-outline" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" error={errors.code} />
            <Input label="New password" icon="lock-closed-outline" value={pw} onChangeText={setPw} secureToggle error={errors.pw} hint="8+ characters with a letter and a number" />
            <Button label="Update password" onPress={reset} loading={loading} />
            <Button label="Resend code" variant="ghost" size="md" onPress={sendCode} />
          </View>
        )}
      </Card>
    </Screen>
  );
}
