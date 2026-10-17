import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { QrCode } from '@/components/QrCode';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { inviteLink } from '@/services/share';
import type { Trip } from '@/store/types';
import { serverForInvites } from '@/sync/prefs';
import { colors, radius } from '@/theme';

/** The invite as a QR code: a friend points their phone camera at it and the app opens on the join screen. */
export function InviteQrSheet({ visible, onClose, trip }: { visible: boolean; onClose: () => void; trip: Trip }) {
  const { width } = useWindowDimensions();
  const link = inviteLink(trip.inviteCode);
  const size = Math.min(280, width - 96);
  return (
    <Sheet visible={visible} onClose={onClose} title="Scan to join" subtitle={trip.name}>
      <View style={styles.center}>
        <View style={styles.box}>
          <QrCode value={link} size={size} accessibilityLabel={`QR code for invite ${trip.inviteCode}`} />
        </View>
        <T variant="display" style={{ letterSpacing: 3 }} accessibilityLabel={`Invite code ${trip.inviteCode}`}>
          {trip.inviteCode}
        </T>
        <T variant="small" color={colors.textSecondary} center>
          Friends point their phone camera here, or open TogetherWeGo → Join a trip → Scan, or type the code.
        </T>
        {serverForInvites() ? (
          <T variant="caption" color={colors.textMuted} center>
            It also carries your sync server’s address, so their phone connects by itself.
          </T>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 12, paddingBottom: 8 },
  box: { padding: 12, borderRadius: radius.lg, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
});
