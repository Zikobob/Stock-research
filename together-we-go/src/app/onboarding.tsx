import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StepSegments } from '@/components/auth/kit';
import { SLIDES, type Slide } from '@/components/auth/slides';
import { LogoMark } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { FadeIn, useLoop } from '@/components/ui/motion';
import { PlatePress } from '@/components/ui/Plate';
import { Stamp } from '@/components/ui/Stamp';
import { StaggerText } from '@/components/ui/StaggerText';
import { T } from '@/components/ui/T';
import { Ticket } from '@/components/ui/Ticket';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { MAX_WIDTH, colors, line, radius } from '@/theme';

/** How much taller than the screen the photo is drawn, so it can be pulled up (Slide.lift) without showing a gap. */
const EXTRA = 0.2;

/** One full-bleed photo that zooms very slowly (the zoom stops when animations are off). */
function Photo({ slide, width, height, zoom }: { slide: Slide; width: number; height: number; zoom: Animated.Value }) {
  return (
    <View style={{ width, height, overflow: 'hidden', backgroundColor: colors.ink }}>
      <Animated.View
        style={{ position: 'absolute', left: 0, right: 0, top: -slide.lift * height, height: height * (1 + EXTRA), transform: [{ scale: zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
        <Image source={slide.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} accessibilityIgnoresInvertColors />
      </Animated.View>
      {/* a soft scrim behind the controls at the top, so they stay readable on a bright sky */}
      <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 140 }} />
    </View>
  );
}

/**
 * First run: three full-bleed photos, one idea each, and a boarding pass that slides up over the lower part with the headline (it slides
 * in word by word), a step bar and one big black button in the thumb zone. Skip is a quiet outlined square at the top right.
 */
export default function Onboarding() {
  const t = useT();
  const { width: winW, height } = useWindowDimensions();
  const width = Math.min(winW, MAX_WIDTH);
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList<Slide>>(null);
  const complete = useAppStore((s) => s.completeOnboarding);
  const zoom = useLoop(18000, { pingPong: true, rest: 0 });
  const last = SLIDES.length - 1;
  const slide = SLIDES[index];

  const finish = () => {
    complete();
    router.replace('/sign-in');
  };
  const next = () => {
    if (index >= last) return finish();
    list.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex(index + 1);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.min(last, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (i !== index) setIndex(i);
  };
  const narrow = width < 350;
  const titleSize = narrow ? { fontSize: 30, lineHeight: 34 } : { fontSize: 36, lineHeight: 40 };

  return (
    <View style={styles.root}>
      <View style={{ width, height, alignSelf: 'center' }}>
        <FlatList
          ref={list}
          data={SLIDES}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          onScroll={onScroll}
          scrollEventThrottle={32}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(s) => s.key}
          renderItem={({ item }) => <Photo slide={item} width={width} height={height} zoom={zoom} />}
        />

        <View style={[styles.top, { top: insets.top + 12 }]}>
          <FadeIn from="down" distance={12}>
            <View style={styles.brand}>
              <LogoMark size={28} />
              <T variant="kicker" color={colors.ink}>
                TogetherWeGo
              </T>
            </View>
          </FadeIn>
          {index < last ? (
            <PlatePress onPress={finish} accessibilityLabel={t('common.skip')} offset={3} corner={radius.button} style={styles.skip}>
              <T variant="small" weight="bold" color={colors.ink}>
                {t('common.skip')}
              </T>
              <Ionicons name="arrow-forward" size={16} color={colors.ink} />
            </PlatePress>
          ) : null}
        </View>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 20 }]} pointerEvents="box-none">
          <FadeIn from="up" distance={80} duration={600} delay={250}>
            <Ticket
              stub={
                <View style={styles.stub}>
                  <StepSegments now={index + 1} total={SLIDES.length} />
                  <Button label={index === last ? t('common.getStarted') : t('common.next')} onPress={next} iconRight="arrow-forward" testID="onboarding-next" />
                </View>
              }>
              <View style={styles.main}>
                <View style={styles.kickRow}>
                  <T variant="kicker" color={colors.textSecondary}>
                    {`0${index + 1} / 0${SLIDES.length}`}
                  </T>
                  <Stamp key={slide.key} label={slide.stamp} tone="accent" slam />
                </View>
                <StaggerText key={slide.key} text={slide.title} variant="display" style={titleSize} />
                <FadeIn key={`b${slide.key}`} delay={280} distance={10}>
                  <T variant="small" color={colors.textSecondary}>
                    {slide.body}
                  </T>
                </FadeIn>
              </View>
            </Ticket>
          </FadeIn>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 8, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card },
  skip: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 44, height: 44, paddingHorizontal: 12, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, justifyContent: 'center' },
  bottom: { position: 'absolute', left: 20, right: 20, bottom: 0 },
  main: { padding: 16, gap: 10, minHeight: 168 },
  kickRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stub: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 2, gap: 14 },
});
