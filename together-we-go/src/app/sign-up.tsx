import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';

import { AuthScreen, CheckRow, InviteNote, LegalLinks, PasswordMeter } from '@/components/auth/kit';
import { afterSignIn, inviteFrom } from '@/components/auth/logic';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { tap } from '@/components/ui/Press';
import { Header } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { useDraft } from '@/hooks/useDraft';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { validateEmail, validateName, validatePassword } from '@/utils/validation';

type Field = 'name' | 'email' | 'password' | 'confirm' | 'agree';
const NONE: Record<Field, boolean> = { name: false, email: false, password: false, confirm: false, agree: false };

/** A green tick at the end of a field that is filled in correctly (with the field's own words, never colour alone). */
const tick = (ok: boolean) => (ok ? <Ionicons name="checkmark-circle" size={20} color={colors.positive} accessibilityLabel="Looks good" /> : undefined);

/**
 * Create an account: four fields, one tick box, one black button. A field tells you what is wrong once you leave it (state colour, an
 * icon and words) and shows a tick when it is right. Name and email are kept as a draft if you leave and come back.
 */
export default function SignUp() {
  const params = useLocalSearchParams<{ code?: string }>();
  const invite = inviteFrom(params.code);
  const signUp = useAppStore((s) => s.signUp);
  const [name, setName, clearName] = useDraft('signup-name', '');
  const [email, setEmail, clearEmail] = useDraft('signup-email', '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [shown, setShown] = useState(NONE);
  const [taken, setTaken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const show = (f: Field) => setShown((s) => (s[f] ? s : { ...s, [f]: true }));
  const nameErr = validateName(name);
  const emailErr = validateEmail(email);
  const passErr = validatePassword(password);
  const confirmErr = !confirm ? 'Re-enter your password' : confirm !== password ? 'Passwords don’t match' : null;
  const agreeErr = agree ? null : 'Please accept the terms to continue';

  const submit = async () => {
    setShown({ name: true, email: true, password: true, confirm: true, agree: true });
    if (nameErr || emailErr || passErr || confirmErr || agreeErr) return tap('warning');
    setLoading(true);
    const res = await signUp(name, email, password);
    setLoading(false);
    if (!res.ok) {
      setTaken(res.error);
      return tap('warning');
    }
    tap('success');
    clearName();
    clearEmail();
    const next = afterSignIn(invite);
    router.replace(next.first);
    // Brand-new account: with an invite the trip comes first; otherwise offer the personalization survey straight away.
    setTimeout(() => router.push(next.then ?? '/personalize'), 350);
  };

  return (
    <AuthScreen top={0}>
      <View style={{ marginHorizontal: -20 }}>
        <Header kicker="New passenger" title="Create account" subtitle="Start planning trips with your crew" />
      </View>
      {invite ? (
        <View style={{ marginBottom: 20 }}>
          <InviteNote code={invite} />
        </View>
      ) : null}
      <View style={{ gap: 16 }}>
        <Input
          label="Full name"
          icon={shown.name && nameErr ? 'alert-circle' : 'person-outline'}
          value={name}
          onChangeText={setName}
          onBlur={() => name && show('name')}
          autoCapitalize="words"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          error={shown.name ? nameErr : null}
          right={tick(!!name && !nameErr)}
          placeholder="e.g. Alex Rivera"
        />
        <Input
          ref={emailRef}
          label="Email address"
          icon={(shown.email && emailErr) || taken ? 'alert-circle' : 'mail-outline'}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setTaken(null);
          }}
          onBlur={() => email && show('email')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => pwRef.current?.focus()}
          error={taken ?? (shown.email ? emailErr : null)}
          right={tick(!!email && !emailErr && !taken)}
          placeholder="you@email.com"
        />
        <View style={{ gap: 10 }}>
          <Input
            ref={pwRef}
            label="Password"
            icon={shown.password && passErr ? 'alert-circle' : 'lock-closed-outline'}
            value={password}
            onChangeText={setPassword}
            onBlur={() => password && show('password')}
            secureToggle
            textContentType="newPassword"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            error={shown.password ? passErr : null}
            hint="At least 8 characters, with a letter and a number"
            placeholder="At least 8 characters"
          />
          <PasswordMeter password={password} />
        </View>
        <Input
          ref={confirmRef}
          label="Confirm password"
          icon={shown.confirm && confirmErr ? 'alert-circle' : 'lock-closed-outline'}
          value={confirm}
          onChangeText={setConfirm}
          onBlur={() => confirm && show('confirm')}
          secureToggle
          returnKeyType="go"
          onSubmitEditing={submit}
          error={shown.confirm ? confirmErr : null}
          right={tick(!!confirm && !confirmErr)}
          placeholder="Re-enter password"
        />
      </View>

      <View style={{ marginTop: 12 }}>
        <CheckRow
          checked={agree}
          onPress={() => {
            setAgree((a) => !a);
            show('agree');
          }}
          label="I agree to the Terms of Service and Privacy Policy"
          error={shown.agree ? agreeErr : null}>
          <T variant="small" color={colors.textSecondary}>
            I agree to the Terms of Service and Privacy Policy
          </T>
        </CheckRow>
        <LegalLinks />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button label="Create account" onPress={submit} loading={loading} />
      </View>

      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 20 }}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.ink} />
        <T variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
          Your password is salted and hashed on this phone. It is never stored as plain text.
        </T>
      </View>
    </AuthScreen>
  );
}
