import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card, Chip } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { CLAUDE_MODEL } from '@/services/assistant';
import { getApiKey, looksLikeApiKey, setApiKey } from '@/services/secrets';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius } from '@/theme';

/** Offline answers or Claude, and the optional API key (kept in the phone's secure keychain). */
export function AssistantCard() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [keyErr, setKeyErr] = useState<string | null>(null);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
  }, []);

  const saveKey = async () => {
    if (!looksLikeApiKey(key)) return setKeyErr('Anthropic keys start with “sk-ant-”. Check you copied the whole key.');
    await setApiKey(key.trim());
    setKey('');
    setKeyErr(null);
    setHasKey(true);
    update({ aiMode: 'claude' });
    toast('Key saved securely — Claude mode on');
  };

  return (
    <Card style={{ marginTop: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <T variant="title">Trip Assistant</T>
      </View>
      <View style={styles.wrap}>
        <Chip icon="cloud-offline-outline" label="Offline (built-in)" active={settings.aiMode === 'offline'} onPress={() => update({ aiMode: 'offline' })} />
        <Chip
          icon="sparkles-outline"
          label="Claude AI"
          active={settings.aiMode === 'claude'}
          onPress={() => {
            if (!hasKey) return toast('Add your Anthropic API key first', { tone: 'warn' });
            update({ aiMode: 'claude' });
          }}
        />
      </View>
      <T variant="caption" color={colors.textSecondary}>
        Offline mode answers from your trip data with no internet. Claude mode sends questions plus trip details to Anthropic’s {CLAUDE_MODEL} model using your own key, which is stored in the phone’s secure keychain.
      </T>
      {hasKey ? (
        <View style={styles.keyRow}>
          <Ionicons name="key" size={16} color={colors.primary} />
          <T variant="small" style={{ flex: 1 }}>
            API key saved securely
          </T>
          <Press
            onPress={async () => {
              await setApiKey(null);
              setHasKey(false);
              update({ aiMode: 'offline' });
              toast('Key removed');
            }}
            hitSlop={8}>
            <T variant="small" weight="semibold" color={colors.red}>
              Remove
            </T>
          </Press>
        </View>
      ) : (
        <>
          <Input placeholder="sk-ant-…" value={key} onChangeText={(v) => { setKey(v); setKeyErr(null); }} secureToggle autoCapitalize="none" autoCorrect={false} error={keyErr} icon="key-outline" />
          <Button label="Save key" size="md" variant="secondary" onPress={saveKey} disabled={!key} />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySofter },
});
