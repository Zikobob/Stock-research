import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { copy } from '@/services/share';
import { useAppStore } from '@/store/useAppStore';
import type { Trip } from '@/store/types';
import { colors, radius } from '@/theme';

import { InviteQrSheet } from './InviteQrSheet';

/** The trip's invite code with Copy, Share, QR code and (for the organizer) New code. */
export function InviteCard({ trip, owner, onShare }: { trip: Trip; owner: boolean; onShare: () => void }) {
  const t = useT();
  const [qrOpen, setQrOpen] = useState(false);
  return (
    <Card style={styles.invite}>
      <T variant="kicker" color={colors.textSecondary}>
        {t('hub.invite')}
      </T>
      <View style={styles.codeRow}>
        <T variant="display" numberOfLines={1} adjustsFontSizeToFit style={styles.code} accessibilityLabel={`Invite code ${trip.inviteCode}`}>
          {trip.inviteCode}
        </T>
        <Press onPress={() => copy(trip.inviteCode, `Invite code ${trip.inviteCode} copied`)} style={styles.copyPill} accessibilityLabel={`Copy invite code ${trip.inviteCode}`}>
          <Ionicons name="copy-outline" size={15} color={colors.onAccent} />
          <T variant="small" weight="bold" color={colors.onAccent}>
            Copy
          </T>
        </Press>
      </View>
      <T variant="caption" color={colors.textSecondary}>
        Friends enter this in “Join a trip”, or scan the QR code
      </T>
      <View style={styles.row}>
        <Button label={t('hub.share')} icon="share-social-outline" size="md" onPress={onShare} style={{ flex: 1 }} />
        <Button label="QR code" icon="qr-code-outline" variant="secondary" size="md" onPress={() => setQrOpen(true)} style={{ flex: 1 }} testID="invite-qr" />
      </View>
      {owner ? (
        <Button
          label="New code"
          icon="refresh-outline"
          variant="ghost"
          size="sm"
          onPress={() =>
            confirmAction('New invite code?', 'The old code will stop working. Members already on the trip stay.', () => {
              useAppStore.getState().regenerateInvite(trip.id);
              toast('New invite code created');
            })
          }
        />
      ) : null}
      <InviteQrSheet visible={qrOpen} onClose={() => setQrOpen(false)} trip={trip} />
    </Card>
  );
}

const styles = StyleSheet.create({
  invite: { marginTop: 14, gap: 6, borderRadius: radius.xl, padding: 18 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  code: { flexShrink: 1, fontSize: 44, lineHeight: 52, letterSpacing: 3 },
  copyPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, paddingHorizontal: 16, height: 38, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
