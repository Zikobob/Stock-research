import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { testServer, type ConnectionTest } from '@/sync/actions';
import { SERVER_PORT, guessServerUrl, useSyncPrefs } from '@/sync/prefs';
import { useSyncStatus } from '@/sync/status';
import { normalizeServerUrl } from '@/sync/transport';
import { colors } from '@/theme';

/** In Settings: where the sync server is, a test button, and how syncing is going. */
export function SyncSettingsCard() {
  const saved = useSyncPrefs((s) => s.serverUrl);
  const setServerUrl = useSyncPrefs((s) => s.setServerUrl);
  const status = useSyncStatus();
  const guess = guessServerUrl();
  const [text, setText] = useState(saved);
  const [result, setResult] = useState<ConnectionTest | null>(null);
  const [testing, setTesting] = useState(false);

  const address = text.trim() || guess || '';

  const save = () => {
    const url = text.trim();
    if (url && !normalizeServerUrl(url)) return toast('That doesn’t look like an address', { tone: 'warn' });
    setServerUrl(url ? normalizeServerUrl(url)! : '');
    toast(url ? 'Sync address saved' : 'Using the automatic address');
  };

  const test = async () => {
    setTesting(true);
    setResult(await testServer(address));
    setTesting(false);
  };

  return (
    <Card style={{ gap: 12, marginTop: 14 }}>
      <T variant="kicker" color={colors.textSecondary} accessibilityRole="header">
        Sync across phones
      </T>
      <T variant="small" color={colors.textSecondary}>
        To plan together on different phones: on the computer that runs the app, start the sync server with{' '}
        <T variant="small" weight="bold">
          npm run server
        </T>
        , then make sure every phone has its address.
      </T>
      <Input
        label="Server address"
        value={text}
        onChangeText={(v) => {
          setText(v);
          setResult(null);
        }}
        onBlur={save}
        placeholder={guess ? guess.replace(/^https?:\/\//, '') : `192.168.1.20:${SERVER_PORT}`}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        accessibilityLabel="Sync server address"
        testID="sync-address"
        style={{ minHeight: 44 }}
        hint={saved || !guess ? 'The address printed by the server.' : `Found automatically: ${guess}. Leave this blank to use it.`}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button label="Test connection" icon="pulse-outline" variant="secondary" size="md" loading={testing} onPress={test} style={{ flex: 3 }} testID="sync-test" />
        <Button label="Save" icon="checkmark" size="md" onPress={save} style={{ flex: 2 }} />
      </View>
      {result ? (
        <View accessibilityLiveRegion="polite" testID="sync-result" style={{ gap: 6 }}>
          <Stamp label={result.ok ? 'Connected' : 'No answer'} tone={result.ok ? 'positive' : 'danger'} icon={result.ok ? 'checkmark' : 'close'} rotate={0} />
          <T variant="small" color={colors.textSecondary}>
            {result.ok ? `${result.trips} shared trip${result.trips === 1 ? '' : 's'} on this server` : result.message}
          </T>
        </View>
      ) : null}
      <T variant="caption" color={colors.textSecondary}>
        {status.shared.length
          ? `${status.shared.length} trip${status.shared.length === 1 ? ' is' : 's are'} syncing · ${status.online === false ? `offline, ${status.pending} change${status.pending === 1 ? '' : 's'} waiting` : status.online ? `online${status.peers > 1 ? `, ${status.peers} phones` : ''}` : 'connecting…'}`
          : 'No trips are shared yet. Share one from More → Crew & roles.'}
      </T>
    </Card>
  );
}
