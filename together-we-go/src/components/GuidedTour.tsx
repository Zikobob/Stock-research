import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Animated, Modal, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { MAX_WIDTH, colors, line, radius } from '@/theme';

import { Button } from './ui/Button';
import type { IconName } from './ui/bits';
import { FadeIn, nativeDriver, useMotion } from './ui/motion';
import { Press } from './ui/Press';
import { T } from './ui/T';
import { Ticket } from './ui/Ticket';

const STEPS: { icon: IconName; tab: string; title: string; body: string; points: string[] }[] = [
  { icon: 'home-outline', tab: 'Home', title: 'Your trip at a glance', body: 'The moment you open the app you see the hero photo, invite code, weather and your group budget.', points: ['Up next and countdown', 'Weather and local time', 'Budget progress'] },
  { icon: 'calendar-outline', tab: 'Plan', title: 'Plan it together', body: 'Build the itinerary day by day. Everyone votes “I’m in”, then the group locks the winners in.', points: ['Itinerary by day', 'Vote on ideas', 'Lock in the plan'] },
  { icon: 'wallet-outline', tab: 'Budget', title: 'Split it fairly', body: 'Log expenses in any currency and see exactly who owes who. Snap a receipt so nothing gets lost.', points: ['Who owes who', 'Receipts and categories', 'Settle up in fewer payments'] },
  { icon: 'chatbubbles-outline', tab: 'Chat', title: 'Talk it out', body: 'Message the crew in one place, or ask Scout, the built-in AI, about weather, food and what’s next.', points: ['Group chat', 'Scout AI assistant', 'Works offline'] },
  { icon: 'grid-outline', tab: 'More', title: 'Everything else', body: 'Offline documents, the trip map, a packing list, the photo dump, a trip quiz and more live here.', points: ['Offline docs', 'Trip map', 'Packing, photos and quiz'] },
];

/** First-run walkthrough: five swipeable boarding passes, one per tab. Marks the tour as seen when it closes. */
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
  // the height the pages may use, so each ticket sits in the middle of it
  const [pageH, setPageH] = useState(0);
  const last = index === STEPS.length - 1;

  const goTo = (i: number) => {
    setIndex(i);
    scroller.current?.scrollTo({ x: i * pageW, animated: motion });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={[styles.column, { width: pageW }]}>
        <View style={styles.top}>
          <T variant="kicker" color={colors.textSecondary} accessibilityLiveRegion="polite">
            Step {index + 1} of {STEPS.length}
          </T>
          {last ? null : (
            <Press onPress={onFinish} accessibilityLabel="Skip the tour" style={styles.skip}>
              <T variant="small" weight="bold" style={{ textDecorationLine: 'underline' }}>
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
            onLayout={(e) => setPageH(e.nativeEvent.layout.height)}
            style={{ flex: 1 }}>
            {STEPS.map((s, i) => {
              const range = [(i - 1) * pageW, i * pageW, (i + 1) * pageW];
              const pop = motion ? { opacity: scrollX.interpolate({ inputRange: range, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' }), transform: [{ scale: scrollX.interpolate({ inputRange: range, outputRange: [0.94, 1, 0.94], extrapolate: 'clamp' }) }] } : null;
              return (
                <View key={s.tab} style={[styles.page, { width: pageW, height: pageH || undefined }]} accessible accessibilityLabel={`Step ${i + 1} of ${STEPS.length}. ${s.tab}. ${s.title}. ${s.body}. ${s.points.join('. ')}`}>
                  <Animated.View style={pop}>
                    <Ticket
                      stub={
                        <View style={styles.points}>
                          {s.points.map((p) => (
                            <View key={p} style={styles.point}>
                              <View style={styles.tick}>
                                <Ionicons name="checkmark" size={14} color={colors.onAccent} />
                              </View>
                              <T variant="bodySm" weight="semibold" style={{ flex: 1 }}>
                                {p}
                              </T>
                            </View>
                          ))}
                        </View>
                      }>
                      <View style={styles.main}>
                        <View style={styles.row}>
                          <View style={styles.icon}>
                            <Ionicons name={s.icon} size={28} color={colors.onAccent} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <T variant="kicker" color={colors.textSecondary}>
                              Tab
                            </T>
                            <T variant="h2">{s.tab}</T>
                          </View>
                        </View>
                        <T variant="display" style={{ fontSize: 34, lineHeight: 38 }}>
                          {s.title}
                        </T>
                        <T variant="body" color={colors.textSecondary}>
                          {s.body}
                        </T>
                      </View>
                    </Ticket>
                  </Animated.View>
                </View>
              );
            })}
          </Animated.ScrollView>
        </FadeIn>

        <View style={styles.steps} accessibilityRole="tablist">
          {STEPS.map((s, i) => (
            <Press key={s.tab} onPress={() => goTo(i)} haptic={false} scaleTo={1} style={styles.stepHit} accessibilityRole="tab" accessibilityState={{ selected: i === index }} accessibilityLabel={`Step ${i + 1} of ${STEPS.length}: ${s.tab}`}>
              <View style={[styles.step, i <= index && { backgroundColor: colors.accent }]} />
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
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 48 },
  skip: { minWidth: 64, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  page: { paddingHorizontal: 20, justifyContent: 'center' },
  main: { padding: 20, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 56, height: 56, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  points: { gap: 12, paddingHorizontal: 20, paddingBottom: 18, paddingTop: 4 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tick: { width: 24, height: 24, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  stepHit: { flex: 1, height: 44, justifyContent: 'center' },
  step: { height: 12, borderRadius: radius.xs, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
});
