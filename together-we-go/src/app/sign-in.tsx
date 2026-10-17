import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { GoogleSheet } from '@/components/auth/GoogleSheet';
import { showLegal } from '@/components/auth/legal';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Float } from '@/components/ui/motion';
import { Press, tap } from '@/components/ui/Press';
import { Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { copy } from '@/services/share';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/store/seed';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/theme';
import { validateEmail } from '@/utils/validation';

export default function SignIn() {
  const t = useT();
  const signIn = useAppStore((s) => s.signIn);
  const signInWithGoogle = useAppStore((s) => s.signInWithGoogle);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);
  const pwRef = useRef<TextInput>(null);

  const submit = async () => {
    const e = validateEmail(email);
    const p = password ? null : 'Enter your password';
    setErrors({ email: e, password: p });
    if (e || p) return tap('warning');
    setLoading(true);
    const res = await signIn(email, password, remember);
    setLoading(false);
    if (!res.ok) {
      setErrors({ form: res.error });
      tap('warning');
      return;
    }
    tap('success');
    router.replace('/(tabs)/explore');
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setErrors({});
    toast('Demo account filled in — tap Sign In');
  };

  return (
    <Screen contentStyle={{ paddingTop: 28 }}>
      <Float amount={6} duration={2400}>
        <Logo />
      </Float>
      <T variant="display" style={{ marginTop: 28 }} accessibilityRole="header">
        {t('auth.welcome')}
      </T>
      <T variant="bodySm" color={colors.textSecondary} style={{ marginTop: 4, marginBottom: 22 }}>
        {t('auth.welcomeSub')}
      </T>

      <View style={{ gap: 12 }}>
        <Input
          inlineLabel
          label={t('auth.email')}
          icon="mail-outline"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (errors.email || errors.form) setErrors({});
          }}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => pwRef.current?.focus()}
          error={errors.email}
          testID="email"
        />
        <Input
          ref={pwRef}
          inlineLabel
          label={t('auth.password')}
          icon="lock-closed-outline"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errors.password || errors.form) setErrors({});
          }}
          secureToggle
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={errors.password}
          testID="password"
        />
      </View>

      <View style={styles.row}>
        <Press onPress={() => setRemember((r) => !r)} style={styles.remember} accessibilityRole="checkbox" accessibilityState={{ checked: remember }} accessibilityLabel={t('auth.remember')}>
          <View style={[styles.box, remember && styles.boxOn]}>{remember ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}</View>
          <T variant="small" color={colors.textSecondary}>
            {t('auth.remember')}
          </T>
        </Press>
        <Link href="/forgot-password" asChild>
          <Press accessibilityRole="link">
            <T variant="small" weight="semibold" color={colors.primary}>
              {t('auth.forgot')}
            </T>
          </Press>
        </Link>
      </View>

      {errors.form ? (
        <View style={styles.formError} accessibilityLiveRegion="assertive">
          <Ionicons name="alert-circle" size={18} color={colors.red} />
          <T variant="small" color={colors.red} style={{ flex: 1 }}>
            {errors.form}
          </T>
        </View>
      ) : null}

      <Button label={t('auth.signIn')} onPress={submit} loading={loading} testID="sign-in" />

      <View style={styles.orRow}>
        <Divider style={{ flex: 1 }} />
        <T variant="caption" color={colors.textMuted}>
          {t('auth.or')}
        </T>
        <Divider style={{ flex: 1 }} />
      </View>

      <Press onPress={() => setGoogleOpen(true)} style={styles.google} accessibilityLabel={t('auth.google')}>
        <MaterialCommunityIcons name="google" size={18} color={colors.text} />
        <T variant="title" weight="medium">
          {t('auth.google')}
        </T>
      </Press>

      <View style={styles.signupRow}>
        <T variant="small" color={colors.textSecondary}>
          {t('auth.noAccount')}{' '}
        </T>
        <Link href="/sign-up" asChild>
          <Press accessibilityRole="link">
            <T variant="small" weight="bold">
              {t('auth.signUp')}
            </T>
          </Press>
        </Link>
      </View>

      {/* Tapping the card fills the form. The copy buttons sit beside the text, not inside a button: on the web a button inside a button is invalid HTML. */}
      <View style={styles.demo}>
        <Press onPress={fillDemo} scaleTo={0.99} accessibilityLabel="Use the demo account" style={styles.demoHead}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <T variant="small" weight="semibold" color={colors.primary}>
            {t('auth.demo')}
          </T>
          <T variant="caption" color={colors.textMuted} style={{ marginLeft: 'auto' }}>
            Tap to fill
          </T>
        </Press>
        {[
          ['Email', DEMO_EMAIL],
          ['Password', DEMO_PASSWORD],
        ].map(([k, v]) => (
          <View key={k} style={styles.demoRow}>
            <Press onPress={fillDemo} scaleTo={0.99} accessible={false} accessibilityRole="none" style={styles.demoFill}>
              <T variant="caption" color={colors.textSecondary} style={{ width: 62 }}>
                {k}
              </T>
              <T variant="caption" style={{ flex: 1 }} selectable>
                {v}
              </T>
            </Press>
            <Press onPress={() => copy(v, `${k} copied`)} accessibilityLabel={`Copy demo ${k.toLowerCase()}`} style={styles.copyBtn} hitSlop={6}>
              <Ionicons name="copy-outline" size={13} color={colors.primary} />
            </Press>
          </View>
        ))}
      </View>

      <T variant="caption" color={colors.textMuted} center style={{ marginTop: 18 }}>
        By continuing, you agree to our{' '}
        <T variant="caption" weight="semibold" color={colors.textSecondary} onPress={() => showLegal('Terms of Service')}>
          Terms of Service
        </T>{' '}
        and{' '}
        <T variant="caption" weight="semibold" color={colors.textSecondary} onPress={() => showLegal('Privacy Policy')}>
          Privacy Policy
        </T>
      </T>

      <GoogleSheet
        visible={googleOpen}
        onClose={() => setGoogleOpen(false)}
        onPick={async (mail, name) => {
          setGoogleOpen(false);
          await signInWithGoogle(mail, name);
          tap('success');
          router.replace('/(tabs)/explore');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 16 },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  formError: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: colors.redSoft, padding: 12, borderRadius: radius.sm, marginBottom: 12 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  google: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  demo: { marginTop: 22, padding: 14, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  demoHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  demoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  demoFill: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  copyBtn: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.primarySofter, alignItems: 'center', justifyContent: 'center' },
});
