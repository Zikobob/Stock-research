import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { FadeIn, Float, nativeDriver, useMotion } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { photos } from '@/data/images';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { MAX_WIDTH, colors } from '@/theme';

const slides = [
  { key: '1', image: photos['onboard-1'], title: 'Your Journey\nBegins Here', body: 'Welcome to a seamless way to explore the world with the people you love.' },
  { key: '2', image: photos['onboard-2'], title: 'Plan Together,\nTravel Better', body: 'Coordinate itineraries, budgets, and memories — all in one place.' },
  { key: '3', image: photos['onboard-3'], title: 'Every Trip,\nUnforgettable', body: 'From bucket lists to group chats — TogetherWeGo has you covered.' },
];

export default function Onboarding() {
  const t = useT();
  const { width: winW, height } = useWindowDimensions();
  const width = Math.min(winW, MAX_WIDTH);
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList>(null);
  const complete = useAppStore((s) => s.completeOnboarding);
  const motion = useMotion();
  const [zoom] = useState(() => new Animated.Value(0));

  // Slow "Ken Burns" zoom on the current photo, restarted on every slide.
  useEffect(() => {
    zoom.setValue(0);
    if (!motion) return;
    const anim = Animated.timing(zoom, { toValue: 1, duration: 9000, useNativeDriver: nativeDriver });
    anim.start();
    return () => anim.stop();
  }, [index, motion, zoom]);
  const scale = zoom.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });

  const finish = () => {
    complete();
    router.replace('/sign-in');
  };
  const next = () => {
    if (index >= slides.length - 1) return finish();
    list.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex(index + 1);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={styles.root}>
      <View style={{ width, height, alignSelf: 'center' }}>
        <FlatList
          ref={list}
          data={slides}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          onScroll={onScroll}
          scrollEventThrottle={32}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(s) => s.key}
          renderItem={({ item, index: i }) => (
            <View style={{ width, height, overflow: 'hidden' }}>
              <Animated.View style={[StyleSheet.absoluteFill, i === index ? { transform: [{ scale }] } : null]}>
                <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} accessibilityIgnoresInvertColors />
              </Animated.View>
              <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0)', 'rgba(8,16,6,0.78)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
            </View>
          )}
        />
        <View style={[styles.top, { top: insets.top + 8 }]}>
          <FadeIn from="down">
            <View style={styles.brand}>
              <Float amount={5} duration={2000}>
                <LogoMark size={26} />
              </Float>
              <T variant="small" weight="bold" color={colors.white}>
                TogetherWeGo
              </T>
            </View>
          </FadeIn>
          {index < slides.length - 1 ? (
            <Press onPress={finish} accessibilityLabel={t('common.skip')} hitSlop={10} style={styles.skip}>
              <T variant="small" weight="semibold" color={colors.white}>
                {t('common.skip')}
              </T>
            </Press>
          ) : null}
        </View>
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <FadeIn key={`k${index}`} delay={80} distance={26}>
            <View style={styles.kicker}>
              <T variant="micro" weight="bold" color="#1A1C17">
                {['✈️  PLAN', '🤝  TOGETHER', '📸  REMEMBER'][index]}
              </T>
            </View>
            <T variant="display" color={colors.white} style={{ fontSize: 34, lineHeight: 40 }} accessibilityRole="header">
              {slides[index].title}
            </T>
          </FadeIn>
          <FadeIn key={`b${index}`} delay={220} distance={20}>
            <T variant="body" color="rgba(255,255,255,0.85)" style={{ marginTop: 10, maxWidth: 320 }}>
              {slides[index].body}
            </T>
          </FadeIn>
          <View style={styles.dots} accessibilityLabel={`Page ${index + 1} of ${slides.length}`}>
            {slides.map((s, i) => (
              <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <Button label={index === slides.length - 1 ? t('common.getStarted') : t('common.next')} onPress={next} iconRight="arrow-forward" style={{ borderRadius: 999 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0F1A0D' },
  top: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.18)', paddingLeft: 5, paddingRight: 12, paddingVertical: 5, borderRadius: 999 },
  kicker: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginBottom: 12 },
  skip: { backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  bottom: { position: 'absolute', left: 24, right: 24, bottom: 0 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 22, marginBottom: 22 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 24, backgroundColor: colors.accent },
});
