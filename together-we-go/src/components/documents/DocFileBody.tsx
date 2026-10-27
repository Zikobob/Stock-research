import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { T } from '@/components/ui/T';
import type { TripDoc } from '@/store/types';
import { useSharedFile } from '@/sync/useFile';
import { colors, line, radius } from '@/theme';

/** The file part of an opened document: a preview for pictures, an "Open / share" button, or why there is no file here. */
export function DocFileBody({ doc, adderName, onOpen }: { doc: TripDoc; adderName: string; onOpen: (uri: string) => void }) {
  const { uri, loading } = useSharedFile(doc.uri, doc.blob);
  if (doc.kind === 'note') return null;
  if (!uri) {
    return loading ? (
      <View style={{ gap: 10 }}>
        <Skeleton height={120} />
        <T variant="small" color={colors.textSecondary}>
          Getting the file from {adderName}…
        </T>
      </View>
    ) : (
      <T variant="small" color={colors.textSecondary}>
        This file is on {adderName}’s phone. Its name and notes sync; the file arrives once their phone has sent it to the sync server.
      </T>
    );
  }
  return (
    <>
      {doc.kind === 'image' ? <Image source={{ uri }} style={styles.preview} contentFit="contain" accessibilityIgnoresInvertColors /> : null}
      <Button label="Open / share file" icon="open-outline" onPress={() => onOpen(uri)} />
    </>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', height: 320, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt },
});
