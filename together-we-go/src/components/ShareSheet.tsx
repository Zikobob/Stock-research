import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { copy, shareText, shareTo, socialTargets } from '@/services/share';
import { colors, radius } from '@/theme';

import { Button } from './ui/Button';
import { Press } from './ui/Press';
import { Sheet } from './ui/Sheet';
import { T } from './ui/T';

/** Social share picker: direct deep links into social apps + the OS share sheet. */
export function ShareSheet({ visible, onClose, title, message, preview }: { visible: boolean; onClose: () => void; title: string; message: string; preview?: string }) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} subtitle="Send it straight to your group’s favourite app">
      {preview ? (
        <View style={styles.preview}>
          <T variant="small" color={colors.textSecondary}>
            {preview}
          </T>
        </View>
      ) : null}
      <View style={styles.grid}>
        {socialTargets.map((s) => (
          <Press
            key={s.key}
            onPress={() => {
              onClose();
              shareTo(s.key, message);
            }}
            style={styles.item}
            accessibilityLabel={`Share via ${s.label}`}>
            <View style={[styles.icon, { backgroundColor: s.color }]}>
              <Ionicons name={s.icon} size={22} color={colors.white} />
            </View>
            <T variant="micro" weight="medium">
              {s.label}
            </T>
          </Press>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="Copy" variant="secondary" icon="copy-outline" size="md" onPress={() => copy(message)} style={{ flex: 1 }} />
        <Button
          label="More apps"
          icon="share-outline"
          size="md"
          onPress={() => {
            onClose();
            shareText(message);
          }}
          style={{ flex: 1 }}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  preview: { backgroundColor: colors.cardMuted, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  item: { width: '25%', alignItems: 'center', gap: 6 },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
