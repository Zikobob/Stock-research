import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { copy, shareText, shareTo, socialTargets } from '@/services/share';
import { colors, line, radius } from '@/theme';

import { Button } from './ui/Button';
import { PlatePress } from './ui/Plate';
import { Sheet } from './ui/Sheet';
import { T } from './ui/T';

/**
 * Share picker: the message on a dashed paper slip, then a square tile for each app that can be opened straight from here
 * (the tiles are ink on paper like everything else; the icons say which app), then Copy and the phone's own share sheet.
 */
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
          <View key={s.key} style={styles.item}>
            <PlatePress
              onPress={() => {
                onClose();
                shareTo(s.key, message);
              }}
              offset={3}
              corner={radius.button}
              style={styles.tile}
              accessibilityLabel={`Share via ${s.label}`}>
              <Ionicons name={s.icon} size={24} color={colors.ink} />
            </PlatePress>
            <T variant="kicker" color={colors.textSecondary} numberOfLines={1} importantForAccessibility="no">
              {s.label}
            </T>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
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
  preview: { backgroundColor: colors.bgAlt, borderRadius: radius.chip, padding: 12, borderWidth: line, borderStyle: 'dashed', borderColor: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 18 },
  item: { width: '25%', alignItems: 'center', gap: 8 },
  tile: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.button },
});
