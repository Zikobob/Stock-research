import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import { barcodeBars } from '@/components/crew/barcode';
import { Plate } from '@/components/ui/Plate';
import { Rule } from '@/components/ui/Rule';
import { Stamp, type StampTone } from '@/components/ui/Stamp';
import { T, type TProps } from '@/components/ui/T';
import { imageSource } from '@/data/images';
import { colors, line, radius } from '@/theme';

import { shortName } from './recapLogic';

/** Text on the poster: a fixed graphic that is shared as a picture, so the phone's text size must not reflow it. */
function Fixed(props: TProps) {
  return <T allowFontScaling={false} {...props} />;
}

/** Each stamp lands a little crooked and a little to one side, like stamps in a passport. */
const TILT = [-4, 3, -2];
const SHIFT = [0, 36, 12];

/**
 * The trip as a passport page, and the picture that gets shared: a photo with a paper tag, the trip in serif, three numbers in mono,
 * a few stamps for the places visited and a barcode made from the invite code. Only the page itself is captured (not its plate).
 */
export function RecapPoster({ cardRef, width, image, trip, place, dates, status, stats, places, summary }: { cardRef: RefObject<View | null>; width: number; image: string; trip: { name: string; inviteCode: string }; place: string; dates: string; status: { label: string; tone: StampTone }; stats: [string, string][]; places: string[]; summary: string }) {
  return (
    <Plate offset={4} corner={radius.card} style={{ alignSelf: 'center' }}>
      <View ref={cardRef} collapsable={false} accessible accessibilityLabel={`Story card. ${summary}`} style={[styles.page, { width }]}>
        <View style={styles.photo}>
          <Image source={imageSource(image)} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
          <View style={styles.tag}>
            <Fixed variant="kicker" color={colors.ink}>
              Trip recap
            </Fixed>
          </View>
          <View style={styles.status}>
            <Stamp label={status.label} tone={status.tone === 'ink' ? 'accent' : status.tone} rotate={-5} slam={status.tone === 'accent'} />
          </View>
        </View>
        <View style={styles.body}>
          <Fixed variant="kicker" color={colors.textSecondary} numberOfLines={1}>
            {place}
          </Fixed>
          <Fixed variant="headline" numberOfLines={3} style={{ fontSize: 32, lineHeight: 36 }}>
            {trip.name}
          </Fixed>
          <Fixed variant="kicker" color={colors.textSecondary}>
            {dates}
          </Fixed>
          <Rule style={{ marginTop: 6 }} />
          <View style={styles.stats}>
            {stats.map(([value, label]) => (
              <View key={label} style={{ flex: 1 }}>
                <Fixed variant="numeralSm" numberOfLines={1} adjustsFontSizeToFit>
                  {value}
                </Fixed>
                <Fixed variant="kicker" color={colors.textSecondary} style={{ fontSize: 9.5 }}>
                  {label}
                </Fixed>
              </View>
            ))}
          </View>
          {places.length ? (
            <>
              <Rule weight={1} style={{ backgroundColor: colors.border }} />
              <View style={styles.stamps}>
                {places.slice(0, 3).map((p, i) => (
                  <View key={p} style={{ marginLeft: SHIFT[i % SHIFT.length] }}>
                    <Stamp label={shortName(p, 24)} tone={i === 0 ? 'accent' : 'ink'} rotate={TILT[i % TILT.length]} />
                  </View>
                ))}
              </View>
            </>
          ) : null}
          <View style={styles.brand}>
            <Ionicons name="airplane" size={14} color={colors.ink} />
            <Fixed variant="kicker" color={colors.ink} style={{ flex: 1 }}>
              TogetherWeGo
            </Fixed>
          </View>
          <View style={styles.barcode} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {barcodeBars(trip.inviteCode, 49).map((w, i) => (
              <View key={i} style={{ flex: w, backgroundColor: i % 2 === 0 ? colors.ink : 'transparent' }} />
            ))}
          </View>
        </View>
      </View>
    </Plate>
  );
}

const CORNER = Math.max(0, radius.card - line);

const styles = StyleSheet.create({
  page: { backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.card, overflow: 'hidden' },
  photo: { height: 190, borderBottomWidth: line, borderBottomColor: colors.ink, backgroundColor: colors.bgAlt, borderTopLeftRadius: CORNER, borderTopRightRadius: CORNER, overflow: 'hidden' },
  tag: { position: 'absolute', left: 12, top: 12, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.xs },
  status: { position: 'absolute', right: 12, bottom: 12 },
  body: { padding: 16, gap: 8 },
  stats: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  stamps: { gap: 10, paddingVertical: 6 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  barcode: { flexDirection: 'row', height: 28 },
});
