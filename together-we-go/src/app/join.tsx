import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { QrScanner } from '@/components/join/QrScanner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { joinTripAnywhere } from '@/sync/actions';
import { parseInviteUrl } from '@/sync/invite';
import { effectiveServerUrl, useSyncPrefs } from '@/sync/prefs';
import { normalizeServerUrl } from '@/sync/transport';
import { colors, fonts, radius } from '@/theme';
import { normalizeInvite, validateInvite } from '@/utils/validation';

/** Join a trip with an invite code (also opened by togetherwego://join?code=XXX-1234 links and by scanning the invite QR code). */
export default function Join() {
  const params = useLocalSearchParams<{ code?: string; server?: string }>();
  const [code, setCode] = useState(params.code ? normalizeInvite(String(params.code)) : '');
  // The sync server a friend's invite names. It is only used after this person agrees to it.
  const [inviteServer, setInviteServer] = useState<string | null>(params.server ? normalizeServerUrl(String(params.server)) : null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useSyncPrefs((s) => s.serverUrl); // re-check when the address changes
  const newServer = inviteServer && inviteServer !== effectiveServerUrl() ? inviteServer : null;

  const join = async () => {
    setBusy(true);
    const r = await joinTripAnywhere(code);
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return tap('warning');
    }
    tap('success');
    toast(r.synced ? 'You’re in! 🎉 This trip now syncs live with your friends' : r.offlineCopy ? 'Joined the copy on this phone. The sync server was not reachable.' : 'You’re in! 🎉 Say hi in the trip chat');
    router.dismissAll?.();
    router.replace('/(tabs)/chat');
  };

  const submit = () => {
    if (busy) return;
    const e = validateInvite(code);
    if (e) {
      setError(e);
      return tap('warning');
    }
    if (!newServer) return void join();
    confirmAction(
      'Use your friend’s sync server?',
      `This invite shares the trip through ${newServer.replace(/^https?:\/\//, '')}. Its chat, plans and photos are kept on that computer, so only go on if you know who runs it.`,
      () => {
        useSyncPrefs.getState().setServerUrl(newServer);
        void join();
      },
      { confirmLabel: 'Use it and join' },
    );
  };

  const scanned = (text: string) => {
    setScanning(false);
    const found = parseInviteUrl(text);
    if (!found.code) return toast('That QR code is not a TogetherWeGo invite', { tone: 'warn', icon: 'qr-code-outline' });
    setCode(found.code);
    setError(null);
    if (found.server) setInviteServer(found.server);
    tap('success');
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
          Codes look like <T variant="small" weight="bold">AML-2026</T>. Ask the organizer to share it from More → Crew & roles.
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
      {newServer ? (
        <T variant="caption" color={colors.textSecondary} center style={{ marginTop: 8 }}>
          This invite uses a sync server at {newServer.replace(/^https?:\/\//, '')}. You will be asked before it is used.
        </T>
      ) : null}
      <Button label="Join trip" icon="enter-outline" onPress={submit} loading={busy} style={{ marginTop: 18 }} testID="join-submit" />
      {Platform.OS !== 'web' ? <Button label="Scan a QR code" icon="qr-code-outline" variant="secondary" onPress={() => setScanning(true)} style={{ marginTop: 10 }} testID="join-scan" /> : null}
      {Platform.OS !== 'web' ? <QrScanner visible={scanning} onClose={() => setScanning(false)} onScan={scanned} /> : null}
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
