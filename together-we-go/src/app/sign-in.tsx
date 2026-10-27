import { Ionicons } from '@expo/vector-icons';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type ScrollView, type TextInput } from 'react-native';

import { DemoTicket } from '@/components/auth/DemoTicket';
import { GoogleSheet } from '@/components/auth/GoogleSheet';
import { JoinCodeSheet } from '@/components/auth/JoinCodeSheet';
import { AuthScreen, InviteNote, LegalLinks, Notice, TextLink } from '@/components/auth/kit';
import { afterSignIn, calm, inviteFrom } from '@/components/auth/logic';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { FadeIn } from '@/components/ui/motion';
import { Press, tap } from '@/components/ui/Press';
import { Divider, ToggleRow } from '@/components/ui/bits';
import { Rule } from '@/components/ui/Rule';
import { StaggerText } from '@/components/ui/StaggerText';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/store/seed';
import { useAppStore } from '@/store/useAppStore';
import { colors, line } from '@/theme';
import { validateEmail } from '@/utils/validation';

/**
 * The check-in desk. The logo, a serif welcome, two big fields, one black button, Google, and (for judges) the demo account as a
 * ticket. Fields say what is wrong with a colour, an icon and words once you have left them. Someone invited by a friend can enter the
 * code first: it is kept, and after signing in the trip's join page opens with it.
 */
export default function SignIn() {
  const t = useT();
  const params = useLocalSearchParams<{ code?: string }>();
  const signIn = useAppStore((s) => s.signIn);
  const signInWithGoogle = useAppStore((s) => s.signInWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [shown, setShown] = useState({ email: false, password: false });
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [invite, setInvite] = useState<string | null>(() => inviteFrom(params.code));
  const [filled, setFilled] = useState(false);
  const pwRef = useRef<TextInput>(null);
  const scroll = useRef<ScrollView>(null);

  const emailError = shown.email ? validateEmail(email) : null;
  const passwordError = shown.password && !password ? 'Enter your password' : null;

  const enter = () => {
    const next = afterSignIn(invite);
    router.replace(next.first);
    // the invite opens a moment later, once Home is on screen
    const then = next.then;
    if (then) setTimeout(() => router.push(then), 350);
  };

  const submit = async () => {
    setShown({ email: true, password: true });
    if (validateEmail(email) || !password) return tap('warning');
    setLoading(true);
    const res = await signIn(email, password, remember);
    setLoading(false);
    if (!res.ok) {
      setFormError(res.error);
      tap('warning');
      return;
    }
    tap('success');
    enter();
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setShown({ email: false, password: false });
    setFormError(null);
    setFilled(true);
    toast('Demo account filled in. Tap Sign In');
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const edited = () => {
    setFormError(null);
    setFilled(false);
  };

  return (
    <AuthScreen scrollRef={scroll} top={12}>
      <Logo />
      <Rule style={{ marginTop: 16 }} />

      <View style={{ marginTop: 24, gap: 8 }}>
        <StaggerText text={calm(t('auth.welcome'))} variant="display" />
        <T variant="bodySm" color={colors.textSecondary}>
          {t('auth.welcomeSub')}
        </T>
      </View>

      {invite ? (
        <FadeIn from="up" distance={8} style={{ marginTop: 20 }}>
          <InviteNote code={invite} onRemove={() => setInvite(null)} />
        </FadeIn>
      ) : null}

      <View style={{ marginTop: 24, gap: 16 }}>
        <Input
          label={t('auth.email')}
          icon={emailError ? 'alert-circle' : 'mail-outline'}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            edited();
          }}
          onBlur={() => email && setShown((s) => ({ ...s, email: true }))}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => pwRef.current?.focus()}
          placeholder="name@email.com"
          error={emailError}
          testID="email"
        />
        <Input
          ref={pwRef}
          label={t('auth.password')}
          icon={passwordError ? 'alert-circle' : 'lock-closed-outline'}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            edited();
          }}
          onBlur={() => setShown((s) => ({ ...s, password: true }))}
          secureToggle
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          placeholder="Your password"
          error={passwordError}
          testID="password"
        />
      </View>

      <View style={styles.row}>
        <View style={{ flexShrink: 1 }}>
          <ToggleRow label={t('auth.remember')} value={remember} onChange={setRemember} />
        </View>
        <TextLink label={t('auth.forgot')} onPress={() => router.push('/forgot-password')} />
      </View>

      {formError ? (
        <View style={{ marginBottom: 16 }}>
          <Notice>{formError}</Notice>
        </View>
      ) : null}

      <Button label={t('auth.signIn')} onPress={submit} loading={loading} testID="sign-in" />

      <View style={styles.or}>
        <Divider style={{ flex: 1 }} />
        <T variant="kicker" color={colors.textMuted}>
          {t('auth.or')}
        </T>
        <Divider style={{ flex: 1 }} />
      </View>

      <Button label={t('auth.google')} icon="logo-google" variant="secondary" size="md" onPress={() => setGoogleOpen(true)} />

      <View style={{ marginTop: 32 }}>
        <DemoTicket title={t('auth.demo')} onFill={fillDemo} filled={filled} />
      </View>

      <View style={styles.desk}>
        <Link href={{ pathname: '/sign-up', params: invite ? { code: invite } : {} }} asChild>
          <Press accessibilityRole="link" accessibilityLabel={`${t('auth.noAccount')} ${t('auth.signUp')}`} scaleTo={0.99} style={styles.deskRow}>
            <T variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
              {t('auth.noAccount')}
            </T>
            <T variant="small" weight="bold">
              {t('auth.signUp')}
            </T>
            <Ionicons name="arrow-forward" size={16} color={colors.ink} />
          </Press>
        </Link>
        <Divider />
        <Press onPress={() => setJoinOpen(true)} accessibilityLabel="Join with a code" scaleTo={0.99} style={styles.deskRow}>
          <T variant="small" color={colors.textSecondary} style={{ flex: 1 }}>
            Invited by a friend?
          </T>
          <T variant="small" weight="bold">
            Join with a code
          </T>
          <Ionicons name="arrow-forward" size={16} color={colors.ink} />
        </Press>
      </View>

      <LegalLinks style={{ marginTop: 8 }} />

      <GoogleSheet
        visible={googleOpen}
        onClose={() => setGoogleOpen(false)}
        onPick={async (mail, name) => {
          setGoogleOpen(false);
          await signInWithGoogle(mail, name);
          tap('success');
          enter();
        }}
      />
      <JoinCodeSheet
        visible={joinOpen}
        initial={invite}
        onClose={() => setJoinOpen(false)}
        onDone={(code) => {
          setInvite(code);
          setJoinOpen(false);
          tap('success');
        }}
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, marginTop: 4, marginBottom: 12 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  desk: { marginTop: 28, borderTopWidth: line, borderTopColor: colors.ink },
  deskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
});
