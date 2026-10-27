import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { QrScanner } from '@/components/join/QrScanner';
import { Button } from '@/components/ui/Button';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Plate } from '@/components/ui/Plate';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import { joinTripAnywhere } from '@/sync/actions';
import { parseInviteUrl } from '@/sync/invite';
import { effectiveServerUrl, useSyncPrefs } from '@/sync/prefs';
import { normalizeServerUrl } from '@/sync/transport';
import { colors, fonts, line, radius, space } from '@/theme';
import { normalizeInvite, validateInvite } from '@/utils/validation';

/** Join a trip with an invite code (also opened by togetherwego://join?code=XXX-1234 links and by scanning the invite QR code). */
export default function Join() {
  const params = useLocalSearchParams<{ code?: string; server?: string }>();
  const [code, setCode] = useState(params.code ? normalizeInvite(String(params.code)) : '');
  // The sync server a friend's invite names. It is only used after this person agrees to it.
  const [inviteServer, setInviteServer] = useState<string | null>(params.server ? normalizeServerUrl(String(params.server)) : null);
  const [scanning, setScanning] = useState(false);
  const [focused, setFocused] = useState(false);
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
    toast(r.synced ? 'You’re in. This trip now syncs live with your friends' : r.offlineCopy ? 'Joined the copy on this phone. The sync server was not reachable.' : 'You’re in. Say hi in the trip chat');
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
    <Screen header={<Header kicker="Invitation" title="Join a trip" subtitle="Enter the code your friend shared" />} bottomInset={30}>
      <View style={styles.field}>
        <T variant="kicker" color={colors.ink} accessibilityRole="header">
          Invite code
        </T>
        <Plate offset={4} corner={radius.button} color={error ? colors.red : focused ? colors.accent : colors.plate}>
          <View style={[styles.codeBox, error && { backgroundColor: colors.redSoft, borderColor: colors.red }]}>
            <TextInput
              value={code}
              onChangeText={(v) => {
                setCode(normalizeInvite(v));
                setError(null);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="ABC-1234"
              placeholderTextColor={colors.borderStrong}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              style={styles.code}
              accessibilityLabel="Invite code"
              onSubmitEditing={submit}
              returnKeyType="go"
              testID="invite-code"
            />
          </View>
        </Plate>
        {error ? (
          <T variant="small" color={colors.red} accessibilityLiveRegion="assertive">
            {error}
          </T>
        ) : (
          <T variant="caption" color={colors.textMuted}>
            Three letters, a dash and four numbers. Ask the organizer to share it from the Crew page.
          </T>
        )}
        {newServer ? (
          <T variant="caption" color={colors.textSecondary}>
            This invite uses a sync server at {newServer.replace(/^https?:\/\//, '')}. You will be asked before it is used.
          </T>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button label="Join trip" icon="enter-outline" onPress={submit} loading={busy} testID="join-submit" />
        {Platform.OS !== 'web' ? <Button label="Scan a QR code" icon="qr-code-outline" variant="secondary" onPress={() => setScanning(true)} testID="join-scan" /> : null}
      </View>
      {Platform.OS !== 'web' ? <QrScanner visible={scanning} onClose={() => setScanning(false)} onScan={scanned} /> : null}

      <View style={styles.demo}>
        <T variant="kicker" color={colors.textSecondary}>
          No code yet? Try the demo
        </T>
        <Ticket
          plated={false}
          stub={
            <Press onPress={() => setCode('SEO-5521')} style={styles.stub} accessibilityLabel="Use demo code SEO-5521" scaleTo={0.99}>
              <View style={{ flex: 1 }}>
                <T variant="kicker" color={colors.textSecondary}>
                  Demo code
                </T>
                <T variant="numeralSm">SEO-5521</T>
              </View>
              <T variant="kicker" color={colors.ink}>
                Fill it in
              </T>
              <Ionicons name="arrow-forward" size={16} color={colors.ink} />
            </Press>
          }>
          <View style={styles.ticketMain}>
            <T variant="h3">Seoul Food Crawl</T>
            <T variant="small" color={colors.textSecondary}>
              A trip that is waiting for new members.
            </T>
          </View>
        </Ticket>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8, marginTop: 4 },
  // the outline sits on a View around the input (an input is not a positioned box on the web, so a plate drawn behind it would paint over it)
  codeBox: { borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, paddingHorizontal: 16 },
  code: {
    height: 72,
    fontFamily: fonts.mono,
    fontSize: 34,
    letterSpacing: 3,
    color: colors.text,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  actions: { gap: 14, marginTop: space.xxl },
  demo: { marginTop: space.section, gap: 10 },
  ticketMain: { padding: 16, gap: 4 },
  stub: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 16, paddingBottom: 10 },
});
