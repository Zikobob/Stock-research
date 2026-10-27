import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Plate } from '@/components/ui/Plate';
import { Press } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { nativeDriver, useMotion } from '@/components/ui/motion';
import type { Destination } from '@/data/destinations';
import { imageSource } from '@/data/images';
import type { BucketItem } from '@/store/types';
import { colors, hair, line, radius } from '@/theme';

import { tiltFor } from './bucket';

/**
 * One dream as a paper ticket stuck on a board: turned a couple of degrees (and straight while you press it), a stub with the tick
 * box on the left, the words in the middle, and a DONE stamp that slams down when it is ticked off.
 * The turn is decoration, so it is dropped when animations are off.
 */
export function BucketTicket({ item, dest, index, slam, onToggle, onOpen, onRemove }: { item: BucketItem; dest?: Destination; index: number; slam: boolean; onToggle: () => void; onOpen: () => void; onRemove: () => void }) {
  const motion = useMotion();
  const [straight] = useState(() => new Animated.Value(0));
  const lift = (to: number) => {
    if (motion) Animated.timing(straight, { toValue: to, duration: 120, useNativeDriver: nativeDriver }).start();
  };
  const tilt = tiltFor(index);
  const done = item.done;
  return (
    <Animated.View style={motion ? { transform: [{ rotate: straight.interpolate({ inputRange: [0, 1], outputRange: [`${tilt}deg`, '0deg'] }) }] } : undefined}>
      <Plate offset={3} corner={radius.card} color={done ? 'transparent' : colors.plate}>
        <View style={[styles.face, done && { backgroundColor: colors.bgAlt }]}>
          <Press
            onPress={onToggle}
            onPressIn={() => lift(1)}
            onPressOut={() => lift(0)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={item.text}
            scaleTo={0.94}
            style={[styles.stub, done && { backgroundColor: colors.accent }]}>
            <View style={[styles.box, done && { backgroundColor: colors.card }]}>{done ? <Ionicons name="checkmark" size={22} color={colors.ink} /> : null}</View>
          </Press>
          <Press onPress={onOpen} onPressIn={() => lift(1)} onPressOut={() => lift(0)} scaleTo={0.99} style={styles.body} accessibilityLabel={dest ? `Open ${dest.city}` : `Tick off ${item.text}`}>
            {dest ? <Image source={imageSource(dest.image)} style={styles.thumb} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
            <View style={{ flex: 1, gap: 4 }}>
              <T variant="title" weight="bold" color={done ? colors.textSecondary : colors.text} style={done && { textDecorationLine: 'line-through' }}>
                {item.text}
              </T>
              {dest ? (
                <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
                  {dest.country} / {dest.bestMonths.split(',')[0]}
                </T>
              ) : null}
              {done ? <Stamp label="Done" tone="positive" icon="checkmark" slam={slam} rotate={-6} /> : null}
            </View>
          </Press>
          <Press onPress={onRemove} accessibilityLabel={`Remove ${item.text}`} style={styles.remove}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </Press>
        </View>
      </Plate>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  face: { flexDirection: 'row', alignItems: 'stretch', minHeight: 72, backgroundColor: colors.card, borderRadius: radius.card, borderWidth: line, borderColor: colors.ink, overflow: 'hidden' },
  stub: { width: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgAlt, borderRightWidth: line, borderRightColor: colors.ink },
  box: { width: 30, height: 30, borderRadius: radius.xs + 2, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, minHeight: 44 },
  thumb: { width: 46, height: 46, borderRadius: radius.xs, borderWidth: hair, borderColor: colors.ink },
  remove: { width: 44, alignItems: 'center', justifyContent: 'center' },
});
