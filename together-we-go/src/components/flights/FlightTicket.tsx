import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { StyleSheet, View } from 'react-native';

import { barcodeBars } from '@/components/crew/barcode';
import { dateKicker, timeParts } from '@/components/home/logic';
import { Press } from '@/components/ui/Press';
import { Perforation } from '@/components/ui/Rule';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import { toast } from '@/components/ui/feedback';
import { airportByIata } from '@/data/airports';
import type { Flight } from '@/store/types';
import { colors, line, radius } from '@/theme';
import { durationLabel } from '@/utils/format';
import { dayLabel, partsInTz, time12 } from '@/utils/time';

/** A time as a departures board prints it: the clock in mono and AM or PM small beside it, with the date in caps under it. */
function Clock({ hhmm, ymd, align }: { hhmm: string; ymd: string; align: 'left' | 'right' }) {
  const { clock, suffix } = timeParts(hhmm);
  return (
    <View style={{ alignItems: align === 'left' ? 'flex-start' : 'flex-end' }}>
      <View style={styles.clock}>
        <T variant="numeralSm">{clock}</T>
        <T variant="kicker" color={colors.textSecondary}>
          {suffix}
        </T>
      </View>
      <T variant="kicker" color={colors.textSecondary} style={{ fontSize: 10 }}>
        {dateKicker(ymd)}
      </T>
    </View>
  );
}

/** One printed field on the stub: a small caps label over a value in mono. */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexShrink: 1 }}>
      <T variant="kicker" color={colors.textSecondary} style={{ fontSize: 10 }}>
        {label}
      </T>
      <T variant="numeralSm" numberOfLines={1} style={{ fontSize: 18, lineHeight: 24 }}>
        {value}
      </T>
    </View>
  );
}

/**
 * One flight as a boarding pass. The main part has the two airport codes big in mono with each airport's own clock under it;
 * below the tear line are the seat, the confirmation and the flight time, a barcode made from the booking, and the ticket and remove buttons.
 * `zoneNote` says what the time is in the zone the person chose, when that differs from the airport's clock.
 */
export function FlightTicket({ flight: f, passenger, plated, zoneNote, canDelete, onDelete }: { flight: Flight; passenger: string; plated: boolean; zoneNote?: string; canDelete: boolean; onDelete: () => void }) {
  const from = airportByIata(f.from);
  const to = airportByIata(f.to);
  const dep = from ? partsInTz(f.departUtc, from.tz) : null;
  const arr = to ? partsInTz(f.arriveUtc, to.tz) : null;
  const minutes = Math.round((f.arriveUtc - f.departUtc) / 60000);
  const arriving = f.direction === 'arrival';
  const isImage = !!f.ticketUri && (/\.(png|jpe?g|webp|heic)$/i.test(f.ticketName ?? '') || f.ticketUri.startsWith('data:image'));
  return (
    <Ticket
      plated={plated}
      stub={
        <View style={styles.stub}>
          <View style={styles.fieldsRow}>
            <View style={styles.fields}>
              <Field label="Flight time" value={durationLabel(minutes)} />
              {f.seat ? <Field label="Seat" value={f.seat} /> : null}
              {f.confirmation ? <Field label="Booking" value={f.confirmation} /> : null}
            </View>
            {canDelete ? (
              <Press onPress={onDelete} style={styles.remove} accessibilityLabel={`Remove flight ${f.flightNo}`}>
                <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
              </Press>
            ) : null}
          </View>
          <View style={styles.barcode} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {barcodeBars(`${f.id}${f.confirmation ?? f.flightNo}`).map((w, i) => (
              <View key={i} style={{ flex: w, backgroundColor: i % 2 === 0 ? colors.ink : 'transparent' }} />
            ))}
          </View>
          {f.ticketUri ? (
            <Press onPress={() => Linking.openURL(f.ticketUri!).catch(() => toast('Ticket saved offline in Documents'))} style={styles.ticketBtn} accessibilityLabel={`Open ticket ${f.ticketName ?? ''}`}>
              {isImage ? <Image source={{ uri: f.ticketUri }} style={styles.thumb} accessibilityIgnoresInvertColors /> : <Ionicons name="document-attach-outline" size={18} color={colors.ink} />}
              <T variant="small" weight="bold" numberOfLines={1} style={{ maxWidth: 180 }}>
                {f.ticketName ?? 'Ticket'}
              </T>
            </Press>
          ) : null}
        </View>
      }>
      <View style={styles.main}>
        <View style={styles.top}>
          <T variant="kicker" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
            {passenger} / {f.airline} {f.flightNo}
          </T>
          <Stamp label={arriving ? 'Arriving' : 'Departing'} tone={arriving ? 'accent' : 'ink'} rotate={-3} />
        </View>
        <View style={styles.route} accessible accessibilityLabel={`${f.flightNo}, ${from?.city ?? f.from} to ${to?.city ?? f.to}`}>
          <View style={styles.end}>
            <T variant="numeral" style={styles.code}>
              {f.from}
            </T>
            <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {from?.city ?? ''}
            </T>
            {dep ? <Clock hhmm={dep.hhmm} ymd={dep.ymd} align="left" /> : null}
          </View>
          <View style={styles.mid}>
            <Perforation style={{ flex: 1 }} />
            <View style={styles.plane}>
              <Ionicons name="airplane" size={18} color={colors.ink} />
            </View>
            <Perforation style={{ flex: 1 }} />
          </View>
          <View style={[styles.end, { alignItems: 'flex-end' }]}>
            <T variant="numeral" style={styles.code}>
              {f.to}
            </T>
            <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
              {to?.city ?? ''}
            </T>
            {arr ? <Clock hhmm={arr.hhmm} ymd={arr.ymd} align="right" /> : null}
          </View>
        </View>
        {zoneNote ? (
          <T variant="caption" color={colors.textSecondary}>
            {zoneNote}
          </T>
        ) : null}
      </View>
    </Ticket>
  );
}

/** What the trip-side time is in the zone the person chose, or nothing when it reads the same as the airport's clock. */
export function zoneNoteFor(f: Flight, tz: string, zoneName: string): string | undefined {
  const airport = airportByIata(f.direction === 'arrival' ? f.to : f.from);
  const utc = f.direction === 'arrival' ? f.arriveUtc : f.departUtc;
  if (!airport) return undefined;
  const there = partsInTz(utc, airport.tz);
  const chosen = partsInTz(utc, tz);
  if (there.hhmm === chosen.hhmm && there.ymd === chosen.ymd) return undefined;
  return `${f.direction === 'arrival' ? 'Lands' : 'Leaves'} ${time12(chosen.hhmm)} · ${dayLabel(chosen.ymd)}, ${zoneName}`;
}

const styles = StyleSheet.create({
  main: { padding: 16, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  route: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  end: { gap: 4, flexShrink: 1 },
  code: { fontSize: 46, lineHeight: 50, letterSpacing: -1 },
  clock: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  mid: { flex: 1, minWidth: 24, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 18 },
  plane: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  stub: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 2, gap: 12 },
  fieldsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  fields: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, rowGap: 8 },
  barcode: { flexDirection: 'row', height: 34 },
  ticketBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.chip, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.bgAlt },
  thumb: { width: 22, height: 22, borderRadius: radius.xs },
  remove: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10, marginTop: -4 },
});
