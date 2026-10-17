import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { colors } from '@/theme';

/** Full-screen camera that reads one QR code and hands its text back. */
export function QrScanner({ visible, onClose, onScan }: { visible: boolean; onClose: () => void; onScan: (text: string) => void }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [done, setDone] = useState(false); // the camera reports the same code many times a second

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
            <Ionicons name="camera-outline" size={44} color="rgba(255,255,255,0.8)" />
            <T variant="title" color={colors.white} center>
              {permission && !permission.canAskAgain ? 'Camera access is turned off' : 'Allow the camera to scan'}
            </T>
            <T variant="small" color="rgba(255,255,255,0.75)" center>
              {permission && !permission.canAskAgain ? 'Turn it on for TogetherWeGo in your phone’s settings, or type the invite code instead.' : 'It is only used to read the invite QR code your friend shows you.'}
            </T>
            {!permission || permission.canAskAgain ? <Button label="Allow camera" icon="camera-outline" onPress={() => requestPermission()} /> : null}
          </View>
        )}
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Press onPress={onClose} style={styles.round} accessibilityLabel="Close scanner">
            <Ionicons name="close" size={22} color={colors.white} />
          </Press>
        </View>
        {permission?.granted ? (
          <>
            <View style={styles.middle} pointerEvents="none">
              <View style={styles.frame} />
            </View>
            <View style={[styles.hint, { paddingBottom: insets.bottom + 24 }]} pointerEvents="none">
              <T variant="small" weight="semibold" color={colors.white} center>
                Point the camera at your friend’s invite QR code
              </T>
            </View>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0F0A' },
  ask: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  middle: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  frame: { width: 240, height: 240, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
});
