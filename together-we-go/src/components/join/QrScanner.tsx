import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { PlatePress } from '@/components/ui/Plate';
import { T } from '@/components/ui/T';
import { colors, line, radius } from '@/theme';

/**
 * Full-screen camera that reads one QR code and hands its text back. The controls over the picture are outlined paper squares
 * (like the ones over the photo on Home); until the camera is allowed the screen is paper with a plain explanation.
 */
export function QrScanner({ visible, onClose, onScan }: { visible: boolean; onClose: () => void; onScan: (text: string) => void }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [done, setDone] = useState(false); // the camera reports the same code many times a second
  const blocked = !!permission && !permission.canAskAgain;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => setDone(false)}>
      <View style={styles.root}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              if (done) return;
              setDone(true);
              onScan(data);
            }}
          />
        ) : (
          <View style={styles.ask}>
            <View style={styles.askIcon}>
              <Ionicons name="camera-outline" size={34} color={colors.ink} />
            </View>
            <T variant="headline" center>
              {blocked ? 'Camera access is off' : 'Allow the camera to scan'}
            </T>
            <T variant="small" color={colors.textSecondary} center>
              {blocked ? 'Turn it on for TogetherWeGo in your phone’s settings, or type the invite code instead.' : 'It is only used to read the invite QR code your friend shows you.'}
            </T>
            {!blocked ? (
              <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
                <Button label="Allow camera" icon="camera-outline" onPress={() => requestPermission()} />
              </View>
            ) : null}
          </View>
        )}
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <PlatePress onPress={onClose} accessibilityLabel="Close scanner" offset={3} corner={radius.button} style={styles.close}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </PlatePress>
        </View>
        {permission?.granted ? (
          <>
            <View style={styles.middle} pointerEvents="none">
              <View style={styles.frame} />
            </View>
            <View style={[styles.hint, { paddingBottom: insets.bottom + 24 }]} pointerEvents="none">
              <View style={styles.label}>
                <T variant="small" weight="bold" center>
                  Point the camera at your friend’s invite QR code
                </T>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  ask: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  askIcon: { width: 84, height: 84, borderRadius: 42, borderWidth: line, borderStyle: 'dashed', borderColor: colors.ink, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.button, alignSelf: 'flex-start' },
  middle: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  // the frame over the camera picture is white: a white overlay on a photo is the one place a raw colour is fine
  frame: { width: 240, height: 240, borderRadius: radius.card, borderWidth: 4, borderColor: colors.white },
  label: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.card },
});
