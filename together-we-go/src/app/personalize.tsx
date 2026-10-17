import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toast } from '@/components/ui/feedback';
import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { STEPS } from '@/components/personalize/options';
import { paletteOf } from '@/components/personalize/palette';
import { StepDone } from '@/components/personalize/steps/StepDone';
import { StepHello } from '@/components/personalize/steps/StepHello';
import { StepHome } from '@/components/personalize/steps/StepHome';
import { StepInterests } from '@/components/personalize/steps/StepInterests';
import { StepStyle } from '@/components/personalize/steps/StepStyle';
import { StepVibe } from '@/components/personalize/steps/StepVibe';
import { StepYou } from '@/components/personalize/steps/StepYou';
import { type LangCode } from '@/i18n';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import type { Personal } from '@/store/types';
import { MAX_WIDTH, appearance, applyAppearance, shadow, type CornerStyle, type ThemeKey } from '@/theme';

/**
 * "Make it yours": the 7-step personalization survey. This screen owns the answers and the
 * navigation; each step is its own component in components/personalize/steps.
 */
export default function Personalize() {
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const saved = useAppStore((s) => s.personal);
  const settings = useAppStore((s) => s.settings);
  const updatePersonal = useAppStore((s) => s.updatePersonal);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setRestyled = useAppStore((s) => s.setRestyled);

  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<ThemeKey>(appearance.theme);
  const [corners, setCorners] = useState<CornerStyle>(appearance.corners);
  const [p, setP] = useState<Personal>(() => ({
    ...saved,
    sections: { ...saved.sections },
    interests: [...saved.interests],
  }));
  const [lang, setLang] = useState<LangCode>(settings.language);
  const [currency, setCurrency] = useState(settings.homeCurrency);
  const [applying, setApplying] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(progress, {
      toValue: step / (STEPS.length - 1),
      useNativeDriver: false,
      friction: 9,
    }).start();
  }, [progress, step]);

  const set = (patch: Partial<Personal>) => setP((cur) => ({ ...cur, ...patch }));
  const pal = paletteOf(theme);
  const firstName = user?.name.split(' ')[0] ?? 'traveller';
  const shownName = p.nickname.trim() || firstName;
  const last = step === STEPS.length - 1;

  const next = () => {
    if (step === 2 && p.interests.length === 0) {
      toast('Pick at least one interest so we can tailor Explore', {
        tone: 'warn',
        icon: 'alert-circle-outline',
      });
      return;
    }
    if (step === 5 && p.nickname.trim().length > 20) {
      toast('Keep your nickname under 20 characters', {
        tone: 'warn',
        icon: 'alert-circle-outline',
      });
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => (step === 0 ? router.back() : setStep((s) => s - 1));

  const apply = () => {
    setApplying(true);
    updatePersonal({ ...p, nickname: p.nickname.trim(), done: true });
    updateSettings({ language: lang, homeCurrency: currency });
    const restyle = theme !== appearance.theme || corners !== appearance.corners;
    if (!restyle) {
      toast('All set — the app is now yours ✨', { icon: 'sparkles' });
      router.replace('/(tabs)/explore');
      return;
    }
    setRestyled(true);
    // Give the store a moment to save before the UI restarts with the new look.
    setTimeout(() => {
      if (!applyAppearance({ theme, corners })) {
        setApplying(false);
        toast('Saved! Close and reopen the app to see your new look.', {
          icon: 'refresh',
        });
        router.replace('/(tabs)/explore');
      }
    }, 450);
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: insets.top }]}>
      <View style={styles.column}>
        {/* Top bar */}
        <View style={styles.top}>
          <Press onPress={back} accessibilityLabel={step === 0 ? 'Close' : 'Back'} style={[styles.round, { backgroundColor: pal.card, borderColor: pal.border }]}>
            <Ionicons name={step === 0 ? 'close' : 'chevron-back'} size={20} color={pal.text} />
          </Press>
          <View style={{ flex: 1 }}>
            <View style={[styles.track, { backgroundColor: pal.border }]}>
              <Animated.View
                style={[
                  styles.fill,
                  {
                    backgroundColor: pal.primary,
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['4%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <T variant="micro" color={pal.textSecondary} style={{ marginTop: 5 }}>
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </T>
          </View>
          {!last ? (
            <Press onPress={() => setStep(STEPS.length - 1)} hitSlop={8} accessibilityLabel="Skip to the end">
              <T variant="small" weight="semibold" color={pal.textSecondary}>
                Skip
              </T>
            </Press>
          ) : (
            <View style={{ width: 30 }} />
          )}
        </View>

        <ScrollView style={{ width: '100%' }} contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeIn key={step} from="left" distance={28} duration={380}>
            {step === 0 ? <StepHello pal={pal} p={p} firstName={firstName} /> : null}
            {step === 1 ? <StepVibe pal={pal} p={p} theme={theme} setTheme={setTheme} corners={corners} shownName={shownName} /> : null}
            {step === 2 ? <StepInterests pal={pal} p={p} set={set} /> : null}
            {step === 3 ? <StepStyle pal={pal} p={p} set={set} /> : null}
            {step === 4 ? <StepHome pal={pal} p={p} set={set} corners={corners} setCorners={setCorners} /> : null}
            {step === 5 ? <StepYou pal={pal} p={p} set={set} firstName={firstName} lang={lang} setLang={setLang} currency={currency} setCurrency={setCurrency} /> : null}
            {step === 6 ? <StepDone pal={pal} p={p} theme={theme} corners={corners} lang={lang} currency={currency} shownName={shownName} /> : null}
          </FadeIn>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: insets.bottom + 14,
              backgroundColor: pal.bg,
              borderTopColor: pal.border,
            },
          ]}>
          <Press
            onPress={last ? apply : next}
            disabled={applying}
            accessibilityRole="button"
            accessibilityLabel={last ? 'Apply my style' : step === 0 ? 'Let’s go' : 'Continue'}
            style={[styles.cta, { opacity: applying ? 0.6 : 1 }]}>
            <LinearGradient colors={[pal.primary, pal.heroB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} />
            <T variant="title" weight="bold" color="#FFFFFF">
              {applying ? 'Applying your look…' : last ? 'Apply my style ✨' : step === 0 ? 'Let’s go' : 'Continue'}
            </T>
            {!last ? <Ionicons name="arrow-forward" size={18} color="#FFFFFF" /> : null}
          </Press>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  cta: {
    height: 56,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    ...shadow,
  },
});
