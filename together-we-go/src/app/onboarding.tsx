import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
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
          renderItem={({ item }) => (
            <View style={{ width, height }}>
              <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} accessibilityIgnoresInvertColors />
              <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0)', 'rgba(8,16,6,0.78)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
            </View>
          )}
        />
        <View style={[styles.top, { top: insets.top + 8 }]}>
          <View style={styles.brand}>
            <T variant="small" weight="bold" color={colors.white}>
              TogetherWeGo
            </T>
          </View>
          {index < slides.length - 1 ? (
            <Press onPress={finish} accessibilityLabel={t('common.skip')} hitSlop={10} style={styles.skip}>
              <T variant="small" weight="semibold" color={colors.white}>
                {t('common.skip')}
              </T>
            </Press>
          ) : null}
        </View>
        <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
          <T variant="display" color={colors.white} style={{ fontSize: 34, lineHeight: 40 }} accessibilityRole="header">
            {slides[index].title}
          </T>
          <T variant="body" color="rgba(255,255,255,0.85)" style={{ marginTop: 10, maxWidth: 320 }}>
            {slides[index].body}
          </T>
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
  brand: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  skip: { backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  bottom: { position: 'absolute', left: 24, right: 24, bottom: 0 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 22, marginBottom: 22 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 24, backgroundColor: colors.white },
});
