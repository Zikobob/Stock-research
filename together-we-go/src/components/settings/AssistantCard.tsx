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
import { colors, hair, radius } from '@/theme';

/** Offline answers or Claude, and the optional API key (kept in the phone's secure keychain). */
export function AssistantCard() {
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [keyErr, setKeyErr] = useState<string | null>(null);
  const [show, setShow] = useState(false);

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
    toast('Key saved securely. Claude mode is on');
  };

  return (
    <Card style={{ marginTop: 14, gap: 12 }}>
      <T variant="kicker" color={colors.textSecondary} accessibilityRole="header">
        Trip Assistant
      </T>
      <View style={styles.wrap}>
        <Chip icon="cloud-offline-outline" label="Offline (built-in)" active={settings.aiMode === 'offline'} onPress={() => update({ aiMode: 'offline' })} />
        <Chip
          icon="cloud-outline"
          label="Claude AI"
          active={settings.aiMode === 'claude'}
          onPress={() => {
            if (!hasKey) return toast('Add your Anthropic API key first', { tone: 'warn' });
            update({ aiMode: 'claude' });
          }}
        />
      </View>
      <T variant="caption" color={colors.textSecondary}>
        Offline mode answers from your trip data with no internet. Claude mode sends questions plus trip details to Anthropic’s {CLAUDE_MODEL} model using your own key, which is stored in the phone’s
        secure keychain.
      </T>
      {hasKey ? (
        <View style={styles.keyRow}>
          <Ionicons name="key-outline" size={18} color={colors.ink} />
          <T variant="small" weight="semibold" style={{ flex: 1 }}>
            API key saved securely
          </T>
          <Press
            onPress={async () => {
              await setApiKey(null);
              setHasKey(false);
              update({ aiMode: 'offline' });
              toast('Key removed');
            }}
            accessibilityLabel="Remove the API key"
            style={styles.remove}>
            <T variant="small" weight="bold" color={colors.red}>
              Remove
            </T>
          </Press>
        </View>
      ) : (
        <>
          <Input
            placeholder="sk-ant-…"
            value={key}
            onChangeText={(v) => {
              setKey(v);
              setKeyErr(null);
            }}
            secureTextEntry={!show}
            right={
              <Press onPress={() => setShow((v) => !v)} accessibilityLabel={show ? 'Hide the key' : 'Show the key'} style={styles.eye}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
              </Press>
            }
            style={{ minHeight: 44 }}
            autoCapitalize="none"
            autoCorrect={false}
            error={keyErr}
            icon="key-outline"
            accessibilityLabel="Anthropic API key"
          />
          <Button label="Save key" size="md" variant="secondary" onPress={saveKey} disabled={!key} />
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 12,
    minHeight: 52,
    borderRadius: radius.button,
    borderWidth: hair,
    borderColor: colors.borderStrong,
    backgroundColor: colors.bgAlt,
  },
  eye: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  remove: { minWidth: 44, minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
});
