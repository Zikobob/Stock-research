import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { AuthScreen, PasswordMeter, StepSegments, TextLink } from '@/components/auth/kit';
import { Button } from '@/components/ui/Button';
import { showDialog, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Header } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { useDraft } from '@/hooks/useDraft';
import { useAppStore } from '@/store/useAppStore';
import { colors, fonts, line, radius } from '@/theme';
import { validateEmail, validatePassword } from '@/utils/validation';

const tick = (ok: boolean) => (ok ? <Ionicons name="checkmark-circle" size={20} color={colors.positive} accessibilityLabel="Looks good" /> : undefined);

/** Two-step reset: ask for a 6-digit code, then set a new password. Works fully offline: this demo build shows the code on screen instead of emailing it. */
export default function ForgotPassword() {
  const accountExists = useAppStore((s) => s.accountExists);
  const resetPassword = useAppStore((s) => s.resetPassword);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail, clearEmail] = useDraft('reset-email', '');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState('');
  const [pw, setPw] = useState('');
  const [shown, setShown] = useState({ email: false, code: false, pw: false });
  const [notFound, setNotFound] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pwRef = useRef<TextInput>(null);

  const emailErr = validateEmail(email);
  const codeErr = !/^\d{6}$/.test(code) ? 'Enter the 6-digit code' : code !== sent ? 'That code doesn’t match' : null;
  const pwErr = validatePassword(pw);

  const sendCode = () => {
    setShown((s) => ({ ...s, email: true }));
    if (emailErr) return tap('warning');
    if (!accountExists(email)) {
      setNotFound('We couldn’t find an account with that email.');
      return tap('warning');
    }
    const c = String(Math.floor(100000 + Math.random() * 900000));
    setSent(c);
    setCode('');
    setShown({ email: true, code: false, pw: false });
    setNotFound(null);
    setStep(2);
    showDialog('Check your inbox', `We sent a 6-digit code to ${email.trim()}.\n\nDemo build: your code is ${c}`, [{ label: 'OK' }], 'mail-unread-outline');
  };

  const reset = async () => {
    setShown({ email: true, code: true, pw: true });
    if (codeErr || pwErr) return tap('warning');
    setLoading(true);
    const r = await resetPassword(email, pw);
    setLoading(false);
    if (!r.ok) {
      setWrong(r.error);
      return tap('warning');
    }
    tap('success');
    clearEmail();
    toast('Password updated. Sign in with your new password');
    router.back();
  };

  return (
    <AuthScreen top={0}>
      <View style={{ marginHorizontal: -20 }}>
        <Header kicker={`Step ${step} of 2`} title="Reset password" subtitle={step === 1 ? 'Verify your email' : 'Choose a new password'} />
      </View>
      <StepSegments now={step} total={2} />

      <T variant="body" color={colors.textSecondary} style={{ marginTop: 20 }}>
        {step === 1 ? 'Enter the email you signed up with and we will send you a reset code.' : `Enter the code sent to ${email.trim()} and choose a new password.`}
      </T>

      {step === 1 ? (
        <View style={{ marginTop: 20, gap: 20 }}>
          <Input
            label="Email address"
            icon={(shown.email && emailErr) || notFound ? 'alert-circle' : 'mail-outline'}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setNotFound(null);
            }}
            onBlur={() => email && setShown((s) => ({ ...s, email: true }))}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="go"
            onSubmitEditing={sendCode}
            error={notFound ?? (shown.email ? emailErr : null)}
            right={tick(!!email && !emailErr && !notFound)}
            placeholder="you@email.com"
          />
          <Button label="Send reset code" onPress={sendCode} icon="paper-plane-outline" />
        </View>
      ) : (
        <View style={{ marginTop: 20, gap: 16 }}>
          <View style={{ gap: 10 }}>
            <Input
              label="6-digit code"
              icon={(shown.code && codeErr) || wrong ? 'alert-circle' : 'key-outline'}
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, 6));
                setWrong(null);
              }}
              onBlur={() => code && setShown((s) => ({ ...s, code: true }))}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="next"
              onSubmitEditing={() => pwRef.current?.focus()}
              error={wrong ?? (shown.code ? codeErr : null)}
              right={tick(!codeErr && !wrong)}
              style={{ fontFamily: fonts.mono, fontSize: 22, letterSpacing: 6 }}
              placeholder="000000"
              testID="reset-code"
            />
            <Press onPress={() => setCode(sent)} scaleTo={0.99} accessibilityLabel={`Fill in the demo code ${sent}`} style={styles.demo}>
              <View style={{ flex: 1 }}>
                <T variant="kicker" color={colors.textSecondary} style={{ fontSize: 10 }}>
                  Demo build: no email is sent
                </T>
                <T variant="numeralSm" style={{ fontSize: 18, lineHeight: 22 }}>
                  {sent}
                </T>
              </View>
              <T variant="kicker">Fill it in</T>
              <Ionicons name="arrow-forward" size={16} color={colors.ink} />
            </Press>
          </View>
          <View style={{ gap: 10 }}>
            <Input
              ref={pwRef}
              label="New password"
              icon={shown.pw && pwErr ? 'alert-circle' : 'lock-closed-outline'}
              value={pw}
              onChangeText={setPw}
              onBlur={() => pw && setShown((s) => ({ ...s, pw: true }))}
              secureToggle
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={reset}
              error={shown.pw ? pwErr : null}
              hint="At least 8 characters, with a letter and a number"
              placeholder="At least 8 characters"
            />
            <PasswordMeter password={pw} />
          </View>
          <Button label="Update password" onPress={reset} loading={loading} />
          <View style={styles.links}>
            <TextLink label="Resend code" role="button" onPress={sendCode} />
            <TextLink
              label="Use a different email"
              role="button"
              onPress={() => {
                setStep(1);
                setWrong(null);
              }}
            />
          </View>
        </View>
      )}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  demo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 12, borderRadius: radius.chip, borderWidth: line, borderStyle: 'dashed', borderColor: colors.ink, backgroundColor: colors.accentSoft },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 16, marginTop: -4 },
});
