import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { colors, fonts, radius } from '@/theme';
import { normalizeInvite, validateInvite } from '@/utils/validation';

/** Join a trip with an invite code (also opened by togetherwego://join?code=XXX-1234 links). */
export default function Join() {
  const params = useLocalSearchParams<{ code?: string }>();
  const joinTrip = useAppStore((s) => s.joinTrip);
  const [code, setCode] = useState(params.code ? normalizeInvite(String(params.code)) : '');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const e = validateInvite(code);
    if (e) {
      setError(e);
      return tap('warning');
    }
    const r = joinTrip(code);
    if (!r.ok) {
      setError(r.error);
      return tap('warning');
    }
    tap('success');
    toast('You’re in! 🎉 Say hi in the trip chat');
    router.dismissAll?.();
    router.replace('/(tabs)/chat');
  };

  return (
    <Screen header={<Header title="Join a trip" subtitle="Enter the code your friend shared" />}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="people" size={30} color={colors.primary} />
        </View>
        <T variant="h2" center>
          Got an invite code?
        </T>
        <T variant="small" color={colors.textSecondary} center>
          Codes look like <T variant="small" weight="bold">TKY-2481</T>. Ask the organizer to share it from Profile → Invite code.
        </T>
      </View>
      <TextInput
        value={code}
        onChangeText={(v) => {
          setCode(normalizeInvite(v));
          setError(null);
        }}
        placeholder="ABC-1234"
        placeholderTextColor={colors.borderStrong}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        style={[styles.code, error && { borderColor: colors.red }]}
        accessibilityLabel="Invite code"
        onSubmitEditing={submit}
        returnKeyType="go"
        testID="invite-code"
      />
      {error ? (
        <T variant="small" color={colors.red} center style={{ marginTop: 8 }} accessibilityLiveRegion="assertive">
          {error}
        </T>
      ) : null}
      <Button label="Join trip" icon="enter-outline" onPress={submit} style={{ marginTop: 18 }} />
      <Card style={{ marginTop: 18, gap: 8 }}>
        <T variant="small" weight="semibold">
          Try it with a demo trip
        </T>
        <T variant="caption" color={colors.textSecondary}>
          “Seoul Food Crawl” is waiting for new members. Tap to fill its code:
        </T>
        <Press onPress={() => setCode('SEO-5521')} style={styles.demo} accessibilityLabel="Use demo code SEO-5521">
          <T variant="title" weight="bold" color={colors.primary} style={{ letterSpacing: 2 }}>
            SEO-5521
          </T>
          <Ionicons name="arrow-forward-circle" size={22} color={colors.primary} />
        </Press>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, marginVertical: 18 },
  heroIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  code: { height: 72, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.primaryLine, backgroundColor: colors.card, textAlign: 'center', fontFamily: fonts.bold, fontSize: 30, letterSpacing: 6, color: colors.text },
  demo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySofter },
});
