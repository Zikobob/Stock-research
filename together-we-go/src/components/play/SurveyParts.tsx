import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/bits';
import { PlatePress } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import type { Destination } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { colors, hair, line, radius } from '@/theme';
import { money } from '@/utils/format';

import type { OptionArt } from './recommend';

const CORNER = Math.max(0, radius.card - line);
const open = (d: Destination) => router.push({ pathname: '/destination/[id]', params: { id: d.id } });

/**
 * A big answer tile with an ink outline: a photo, a line icon or a few dollar signs on top, and the answer on a label strip below.
 * The answer you gave before (when you come back to a question) is marked with the accent and a tick.
 */
export function OptionTile({ label, art, width, chosen, onPress }: { label: string; art: OptionArt; width: number; chosen: boolean; onPress: () => void }) {
  return (
    <PlatePress
      onPress={onPress}
      testID="survey-option"
      accessibilityLabel={label}
      accessibilityState={{ selected: chosen }}
      offset={3}
      corner={radius.card}
      wrapperStyle={{ width: width + 3 }}
      style={[styles.tile, { width }]}>
      <View style={[styles.art, !('photo' in art) && { backgroundColor: colors.accentSoft }]}>
        {'photo' in art ? (
          <Image source={imageSource(art.photo)} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : 'icon' in art ? (
          <Ionicons name={art.icon} size={44} color={colors.ink} />
        ) : (
          <T variant="numeral" color={colors.ink}>
            {art.glyph}
          </T>
        )}
      </View>
      <View style={[styles.strip, chosen && { backgroundColor: colors.accent }]}>
        <T variant="small" weight="bold" color={chosen ? colors.onAccent : colors.text} style={{ flex: 1 }} numberOfLines={2}>
          {label}
        </T>
        {chosen ? <Ionicons name="checkmark" size={18} color={colors.onAccent} /> : null}
      </View>
    </PlatePress>
  );
}

/** The best match as a boarding pass: the photo with the match stamped on it, the place in serif, and the way to add it to a trip on the stub. */
export function TopPick({ dest, match, onAdd }: { dest: Destination; match: number; onAdd: () => void }) {
  return (
    <Ticket
      stub={
        <View style={styles.stub}>
          <Button label="Add to a trip" icon="add" size="md" onPress={onAdd} />
        </View>
      }>
      {/* The Add button sits under the tear line, not inside the card button: on the web a button inside a button is invalid HTML. */}
      <Press onPress={() => open(dest)} scaleTo={0.99} accessibilityLabel={`${dest.city}, ${match}% match`} style={styles.pickPress}>
        <View style={styles.photo}>
          <Image source={imageSource(dest.image)} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} accessibilityIgnoresInvertColors />
          <View style={styles.stamp}>
            <Stamp label={`${match}% match`} tone="accent" rotate={-4} slam />
          </View>
          <View style={styles.tag}>
            <T variant="kicker" color={colors.ink}>
              Top pick for you
            </T>
          </View>
        </View>
        <View style={styles.main}>
          <T variant="kicker" color={colors.textSecondary}>
            {dest.country}
          </T>
          <T variant="headline" style={{ fontSize: 32, lineHeight: 36 }}>
            {dest.city}
          </T>
          <T variant="small" color={colors.textSecondary} numberOfLines={3}>
            {dest.blurb}
          </T>
          <View style={styles.facts}>
            <T variant="numeralSm">~{money(dest.dailyCost)}</T>
            <T variant="kicker" color={colors.textSecondary}>
              a day
            </T>
            <View style={{ flex: 1 }} />
            <Ionicons name="star" size={16} color={colors.ink} />
            <T variant="numeralSm">{dest.rating}</T>
          </View>
        </View>
      </Press>
    </Ticket>
  );
}

/** A runner-up: a small photo, the place, the price a day and the match as a stamp, with a separate button to add it to a trip. */
export function MatchRow({ dest, match, last, onAdd }: { dest: Destination; match: number; last?: boolean; onAdd: () => void }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Press onPress={() => open(dest)} scaleTo={0.99} accessibilityLabel={`${dest.city}, ${match}% match`} style={styles.rowPress}>
        <Image source={imageSource(dest.image)} style={styles.thumb} contentFit="cover" accessibilityIgnoresInvertColors />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="title" weight="bold" numberOfLines={1}>
            {dest.city}
          </T>
          <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
            {dest.country} / ~{money(dest.dailyCost)} a day
          </T>
        </View>
        <Stamp label={`${match}%`} tone="ink" rotate={0} />
      </Press>
      <IconButton icon="add" label={`Add ${dest.city} to a trip`} onPress={onAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, overflow: 'hidden' },
  art: { height: 104, alignItems: 'center', justifyContent: 'center', borderBottomWidth: line, borderBottomColor: colors.ink, backgroundColor: colors.bgAlt },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 56, paddingHorizontal: 10, paddingVertical: 8 },
  pickPress: { borderRadius: radius.card },
  photo: { height: 190, borderTopLeftRadius: CORNER, borderTopRightRadius: CORNER, borderBottomWidth: line, borderBottomColor: colors.ink, overflow: 'hidden', backgroundColor: colors.bgAlt },
  stamp: { position: 'absolute', top: 14, right: 12 },
  tag: { position: 'absolute', left: 12, bottom: 12, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.card, borderWidth: line, borderColor: colors.ink, borderRadius: radius.xs },
  main: { padding: 16, gap: 6 },
  facts: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  stub: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 10, paddingVertical: 10, borderBottomWidth: hair, borderBottomColor: colors.border },
  rowPress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  thumb: { width: 56, height: 56, borderRadius: radius.xs + 2, borderWidth: line, borderColor: colors.ink },
});
