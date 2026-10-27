import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { PlatePress } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import { destinationById } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { useT } from '@/i18n';
import { copy } from '@/services/share';
import { useAppStore } from '@/store/useAppStore';
import type { Trip } from '@/store/types';
import { colors, line, radius } from '@/theme';
import { rangeLabel } from '@/utils/time';

import { barcodeBars } from './barcode';
import { InviteQrSheet } from './InviteQrSheet';

/** A strip of vertical ink bars made from the invite code (decoration only, like the barcode on a boarding pass). */
function Barcode({ code }: { code: string }) {
  const bars = barcodeBars(code);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.barcode}>
      {bars.map((w, i) => (
        <View key={i} style={{ flex: w, backgroundColor: i % 2 === 0 ? colors.ink : 'transparent' }} />
      ))}
    </View>
  );
}

/**
 * The invitation, as a boarding pass: a photo of the place with a paper tag on it, the trip name and dates, and under the tear line
 * the join code in big mono print with a barcode, the QR button and the one black "Invite friends" button.
 */
export function InviteCard({ trip, owner, onShare }: { trip: Trip; owner: boolean; onShare: () => void }) {
  const t = useT();
  const [qrOpen, setQrOpen] = useState(false);
  const dest = destinationById(trip.destinationId);
  const n = trip.members.length;
  return (
    <>
      <Ticket
        style={styles.ticket}
        stub={
          <View style={styles.stub}>
            <View style={styles.stubTop}>
              <T variant="kicker" color={colors.textSecondary} accessibilityRole="header">
                {t('hub.invite')}
              </T>
              {owner ? (
                <Press
                  accessibilityLabel="New code"
                  style={styles.newCode}
                  onPress={() =>
                    confirmAction('New invite code?', 'The old code will stop working. Members already on the trip stay.', () => {
                      useAppStore.getState().regenerateInvite(trip.id);
                      toast('New invite code created');
                    })
                  }>
                  <Ionicons name="refresh-outline" size={15} color={colors.ink} />
                  <T variant="kicker" color={colors.ink}>
                    New code
                  </T>
                </Press>
              ) : null}
            </View>
            <View style={styles.codeRow}>
              <T variant="numeral" numberOfLines={1} style={styles.code} accessibilityLabel={`Invite code ${trip.inviteCode}`}>
                {trip.inviteCode}
              </T>
              <IconButton icon="copy-outline" label={`Copy invite code ${trip.inviteCode}`} onPress={() => copy(trip.inviteCode, `Invite code ${trip.inviteCode} copied`)} />
            </View>
            <Barcode code={trip.inviteCode} />
            <T variant="caption" color={colors.textSecondary}>
              Friends type this in Join a trip, or scan the QR code.
            </T>
            <View style={styles.actions}>
              <PlatePress onPress={() => setQrOpen(true)} testID="invite-qr" accessibilityLabel="QR code" corner={radius.button} style={styles.qr}>
                <Ionicons name="qr-code-outline" size={24} color={colors.ink} />
              </PlatePress>
              <Button label="Invite friends" icon="paper-plane-outline" onPress={onShare} style={styles.invite} />
            </View>
          </View>
        }>
        <View style={styles.photo}>
          <Image source={imageSource(trip.cover)} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
          <View style={styles.tag}>
            <T variant="kicker" color={colors.ink}>
              Invitation
            </T>
          </View>
        </View>
        <View style={styles.main}>
          <T variant="kicker" color={colors.textSecondary}>
            {dest ? `${dest.city}, ${dest.country}` : 'Somewhere great'}
          </T>
          <T variant="headline" numberOfLines={2} style={{ fontSize: 30, lineHeight: 34 }}>
            {trip.name}
          </T>
          <T variant="kicker" color={colors.textSecondary}>
            {rangeLabel(trip.startDate, trip.endDate)} / {n} {n === 1 ? 'traveller' : 'travellers'}
          </T>
        </View>
      </Ticket>
      <InviteQrSheet visible={qrOpen} onClose={() => setQrOpen(false)} trip={trip} />
    </>
  );
}

const CORNER = Math.max(0, radius.card - line);

const styles = StyleSheet.create({
  ticket: { marginTop: 4 },
  photo: { height: 120, borderTopLeftRadius: CORNER, borderTopRightRadius: CORNER, borderBottomWidth: line, borderBottomColor: colors.ink, overflow: 'hidden', backgroundColor: colors.bgAlt },
  tag: { position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.xs },
  main: { padding: 16, gap: 6 },
  stub: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2, gap: 12 },
  stubTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  newCode: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingLeft: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: -8 },
  code: { flexShrink: 1, letterSpacing: 1 },
  barcode: { flexDirection: 'row', height: 40 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  qr: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.button },
  invite: { flexGrow: 1, flexBasis: 150 },
});
