import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { QrCode } from '@/components/QrCode';
import { Plate } from '@/components/ui/Plate';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { inviteLink } from '@/services/share';
import type { Trip } from '@/store/types';
import { parseInviteUrl } from '@/sync/invite';
import { colors, line, radius } from '@/theme';

/** The invite as a QR code on a paper tile: a friend points their phone camera at it and the app opens on the join screen. */
export function InviteQrSheet({ visible, onClose, trip }: { visible: boolean; onClose: () => void; trip: Trip }) {
  const { width } = useWindowDimensions();
  const link = inviteLink(trip.inviteCode);
  const size = Math.min(260, width - 112);
  return (
    <Sheet visible={visible} onClose={onClose} title="Scan to join" subtitle={trip.name}>
      <View style={styles.center}>
        <Plate corner={radius.card}>
          <View style={styles.tile}>
            <QrCode value={link} size={size} accessibilityLabel={`QR code for invite ${trip.inviteCode}`} />
          </View>
        </Plate>
        <View style={styles.codeBlock}>
          <T variant="kicker" color={colors.textSecondary}>
            Invite code
          </T>
          <T variant="numeral" accessibilityLabel={`Invite code ${trip.inviteCode}`}>
            {trip.inviteCode}
          </T>
        </View>
        <T variant="small" color={colors.textSecondary} center>
          Friends point their phone camera here, or open TogetherWeGo, then Join a trip, then Scan, or type the code.
        </T>
        {parseInviteUrl(link).server ? (
          <T variant="caption" color={colors.textMuted} center>
            It also carries your sync server’s address, so their phone connects by itself.
          </T>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 16, paddingBottom: 8 },
  // the code inside is always black on white, whatever the theme, because that is what a camera reads best
  tile: { padding: 12, borderRadius: radius.card, backgroundColor: colors.white, borderWidth: line, borderColor: colors.ink },
  codeBlock: { alignItems: 'center', gap: 2 },
});
