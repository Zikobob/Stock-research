import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { MAX_WIDTH, colors, radius, shadow } from '@/theme';

import { LogoMark } from './Logo';
import { Button } from './ui/Button';
import type { IconName } from './ui/bits';
import { FadeIn, nativeDriver, useMotion } from './ui/motion';
import { Press } from './ui/Press';
import { T } from './ui/T';

const STEPS: { icon: IconName; tab: string; title: string; body: string; points: string[] }[] = [
  { icon: 'home-outline', tab: 'Home', title: 'Your trip at a glance', body: 'The moment you open the app you see the hero photo, invite code, weather and your group budget.', points: ['Up next and countdown', 'Weather and local time', 'Budget progress'] },
  { icon: 'calendar-outline', tab: 'Plan', title: 'Plan it together', body: 'Build the itinerary day by day. Everyone votes “I’m in”, then the group locks the winners in.', points: ['Itinerary by day', 'Vote on ideas', 'Lock in the plan'] },
  { icon: 'wallet-outline', tab: 'Budget', title: 'Split it fairly', body: 'Log expenses in any currency and see exactly who owes who. Snap a receipt so nothing gets lost.', points: ['Who owes who', 'Receipts and categories', 'Settle up in fewer payments'] },
  { icon: 'chatbubbles-outline', tab: 'Chat', title: 'Talk it out', body: 'Message the crew in one place, or ask Scout, the built-in AI, about weather, food and what’s next.', points: ['Group chat', 'Scout AI assistant', 'Works offline'] },
  { icon: 'grid-outline', tab: 'More', title: 'Everything else', body: 'Offline documents, the trip map, a packing list, the photo dump, a trip quiz and more live here.', points: ['Offline docs', 'Trip map', 'Packing, photos and quiz'] },
];

/** First-run walkthrough: five swipeable cards, one per tab. Marks the tour as seen when it closes. */
export function GuidedTour({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const setToured = useAppStore((s) => s.setToured);
  const finish = () => {
    setToured(true);
    onClose();
  };
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={finish} statusBarTranslucent>
      {visible ? <TourBody onFinish={finish} /> : null}
    </Modal>
  );
}

function TourBody({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const motion = useMotion();
  const pageW = Math.min(width, MAX_WIDTH);
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [scrollX] = useState(() => new Animated.Value(0));
  const last = index === STEPS.length - 1;

  const goTo = (i: number) => {
    setIndex(i);
    scroller.current?.scrollTo({ x: i * pageW, animated: true });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={[styles.column, { width: pageW }]}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <LogoMark size={30} />
            <T variant="small" weight="extrabold">
              TogetherWeGo
            </T>
          </View>
          {last ? null : (
            <Press onPress={onFinish} hitSlop={10} accessibilityLabel="Skip the tour">
              <T variant="small" weight="semibold" color={colors.textSecondary}>
                Skip
              </T>
            </Press>
          )}
        </View>

        <FadeIn style={{ flex: 1 }} duration={420} distance={16}>
          <Animated.ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
              useNativeDriver: nativeDriver,
              listener: (e: { nativeEvent: { contentOffset: { x: number } } }) => setIndex(Math.max(0, Math.min(STEPS.length - 1, Math.round(e.nativeEvent.contentOffset.x / pageW)))),
            })}
            style={{ flex: 1 }}>
            {STEPS.map((s, i) => {
              const range = [(i - 1) * pageW, i * pageW, (i + 1) * pageW];
              const pop = motion ? { opacity: scrollX.interpolate({ inputRange: range, outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' }), transform: [{ scale: scrollX.interpolate({ inputRange: range, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' }) }] } : null;
              return (
                <View key={s.tab} style={[styles.page, { width: pageW }]} accessible accessibilityLabel={`Step ${i + 1} of ${STEPS.length}. ${s.tab}. ${s.title}. ${s.body}`}>
                  <Animated.View style={[styles.card, pop]}>
                    <T variant="display" color={colors.bgAlt} style={styles.number}>
                      {`0${i + 1}`}
                    </T>
                    <View style={styles.icon}>
                      <Ionicons name={s.icon} size={30} color={colors.onAccent} />
                    </View>
                    <T variant="kicker" color={colors.textSecondary} style={{ marginTop: 22 }}>
                      {s.tab}
                    </T>
                    <T variant="display" style={{ fontSize: 34, lineHeight: 38, marginTop: 4 }}>
                      {s.title}
                    </T>
                    <T variant="body" color={colors.textSecondary} style={{ marginTop: 10 }}>
                      {s.body}
                    </T>
                    <View style={{ gap: 10, marginTop: 20 }}>
                      {s.points.map((p) => (
                        <View key={p} style={styles.point}>
                          <View style={styles.tick}>
                            <Ionicons name="checkmark" size={13} color={colors.onAccent} />
                          </View>
                          <T variant="bodySm" weight="semibold">
                            {p}
                          </T>
                        </View>
                      ))}
                    </View>
                  </Animated.View>
                </View>
              );
            })}
          </Animated.ScrollView>
        </FadeIn>

        <View style={styles.dots} accessibilityRole="tablist">
          {STEPS.map((s, i) => (
            <Press key={s.tab} onPress={() => goTo(i)} hitSlop={8} haptic={false} accessibilityRole="tab" accessibilityState={{ selected: i === index }} accessibilityLabel={`Step ${i + 1} of ${STEPS.length}: ${s.tab}`}>
              <View style={[styles.dot, i === index && styles.dotOn]} />
            </Press>
          ))}
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <Button label={last ? 'Got it' : 'Next'} iconRight={last ? 'checkmark' : 'arrow-forward'} onPress={() => (last ? onFinish() : goTo(index + 1))} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  column: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 44 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  page: { paddingHorizontal: 20, justifyContent: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: colors.border, ...shadow },
  number: { position: 'absolute', top: 14, right: 20, fontSize: 64, lineHeight: 68 },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  point: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, paddingVertical: 18 },
  dot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.borderStrong },
  dotOn: { width: 24, backgroundColor: colors.primary },
});
