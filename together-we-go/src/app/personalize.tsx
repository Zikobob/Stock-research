import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type IconName } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { FadeIn, Float, nativeDriver } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { currencies } from '@/data/reference';
import { photos } from '@/data/images';
import { INTERESTS } from '@/data/personal';
import { LANGUAGES, type LangCode } from '@/i18n';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import type { HomeSection, Personal } from '@/store/types';
import { MAX_WIDTH, appearance, applyAppearance, baseColors, cornerStyles, fonts, radius, shadow, themes, type CornerStyle, type ThemeKey } from '@/theme';

const EMOJIS = ['✈️', '🌴', '🏔️', '🍜', '📸', '🎒', '🌸', '🏄', '🚂', '🗺️', '🌙', '🦋'];

const SECTIONS: {
  key: HomeSection;
  label: string;
  sub: string;
  icon: IconName;
}[] = [
  {
    key: 'reminder',
    label: 'Live reminder',
    sub: 'Countdown to your next activity',
    icon: 'alarm-outline',
  },
  {
    key: 'forYou',
    label: 'Picked for you',
    sub: 'Destinations matching your interests',
    icon: 'sparkles-outline',
  },
  {
    key: 'popular',
    label: 'Popular destinations',
    sub: 'Search + category grid',
    icon: 'flame-outline',
  },
  {
    key: 'featured',
    label: 'Featured trips',
    sub: 'Big swipeable photo cards',
    icon: 'images-outline',
  },
  {
    key: 'glance',
    label: 'Weather & airport',
    sub: 'Colourful at-a-glance tiles',
    icon: 'partly-sunny-outline',
  },
  {
    key: 'nearby',
    label: 'Nearby radius',
    sub: 'Places around your trip',
    icon: 'navigate-outline',
  },
  {
    key: 'tools',
    label: 'Quick tools',
    sub: 'Shortcuts to every feature',
    icon: 'grid-outline',
  },
];

const PACE: {
  key: Personal['travelStyle'];
  label: string;
  emoji: string;
  sub: string;
}[] = [
  {
    key: 'chill',
    label: 'Chill',
    emoji: '🧘',
    sub: '2–3 things a day, long lunches',
  },
  {
    key: 'balanced',
    label: 'Balanced',
    emoji: '⚖️',
    sub: 'A plan, with room to wander',
  },
  {
    key: 'packed',
    label: 'Packed',
    emoji: '⚡',
    sub: 'See everything, sleep later',
  },
];
const BUDGET: {
  key: Personal['budgetStyle'];
  label: string;
  emoji: string;
  sub: string;
}[] = [
  { key: 'saver', label: 'Saver', emoji: '🪙', sub: 'Street food & hostels' },
  { key: 'mid', label: 'Mid-range', emoji: '💳', sub: 'Comfy, not crazy' },
  {
    key: 'treat',
    label: 'Treat yo self',
    emoji: '💎',
    sub: 'Splurge on the good stuff',
  },
];

const STEPS = ['Hello', 'Vibe', 'Interests', 'Style', 'Home', 'You', 'Done'] as const;

/** Colours of a palette (merged over Forest) — used for the live previews. */
function paletteOf(k: ThemeKey) {
  return { ...baseColors, ...themes[k].palette };
}

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
  const toggleInterest = (k: string) =>
    set({
      interests: p.interests.includes(k) ? p.interests.filter((x) => x !== k) : [...p.interests, k],
    });
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

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeIn key={step} from="left" distance={28} duration={380}>
            {step === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 10 }}>
                <View style={styles.bubbles}>
                  {['🌍', '✈️', '🎒', '🏝️', '🍜', '📸'].map((e, i) => (
                    <Float key={e} amount={10} duration={1800 + i * 260} delay={i * 120} style={[styles.bubble, bubblePos[i], { backgroundColor: pal.card, borderColor: pal.border }]}>
                      <T style={{ fontSize: 26, lineHeight: 32 }}>{e}</T>
                    </Float>
                  ))}
                  <LinearGradient colors={[pal.heroA, pal.heroB, pal.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCircle}>
                    <T style={{ fontSize: 54, lineHeight: 64 }}>{p.emoji}</T>
                  </LinearGradient>
                </View>
                <T variant="kicker" color={pal.primary} style={{ marginTop: 18 }}>
                  60-second survey
                </T>
                <T variant="display" center color={pal.text} style={{ marginTop: 6 }}>
                  Let’s make it{'\n'}yours, {firstName}
                </T>
                <T variant="body" center color={pal.textSecondary} style={{ marginTop: 10, maxWidth: 320 }}>
                  Pick a colour vibe, your travel interests and what shows up on your home screen. You can change any of it later in Settings.
                </T>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    justifyContent: 'center',
                    marginTop: 18,
                  }}>
                  {['🎨 6 colour themes', '❤️ Your interests', '🏠 Your home screen', '😎 Your avatar'].map((x) => (
                    <View
                      key={x}
                      style={[
                        styles.tag,
                        {
                          backgroundColor: pal.primarySofter,
                          borderColor: pal.primaryLine,
                        },
                      ]}>
                      <T variant="small" weight="medium" color={pal.primary}>
                        {x}
                      </T>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {step === 1 ? (
              <View>
                <StepTitle pal={pal} kicker="Pick your vibe" title="Which colours feel like you?" sub="The whole app re-paints itself — buttons, cards, the animated home banner, everything." />
                <View style={styles.grid}>
                  {(Object.keys(themes) as ThemeKey[]).map((k, i) => {
                    const tp = paletteOf(k);
                    const on = theme === k;
                    return (
                      <FadeIn key={k} delay={i * 60} from="scale" style={{ width: '48%' }}>
                        <Press
                          onPress={() => setTheme(k)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={`${themes[k].name} theme`}
                          style={[
                            styles.themeCard,
                            {
                              backgroundColor: tp.bg,
                              borderColor: on ? pal.primary : pal.border,
                              borderWidth: on ? 2.5 : 1,
                            },
                          ]}>
                          <LinearGradient colors={[tp.heroA, tp.heroB, tp.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.themeHero}>
                            <T style={{ fontSize: 22 }}>{themes[k].emoji}</T>
                            <View style={[styles.themeSun, { backgroundColor: tp.accent }]} />
                          </LinearGradient>
                          <View style={{ padding: 10, gap: 6 }}>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}>
                              <T variant="title" weight="bold" color={tp.text}>
                                {themes[k].name}
                              </T>
                              {on ? <Ionicons name="checkmark-circle" size={20} color={pal.primary} /> : null}
                            </View>
                            <T variant="caption" color={tp.textSecondary} numberOfLines={1}>
                              {themes[k].vibe}
                            </T>
                            <View style={{ flexDirection: 'row', gap: 5 }}>
                              {[tp.primary, tp.primarySoft, tp.accent, tp.card].map((c, j) => (
                                <View
                                  key={j}
                                  style={[
                                    styles.swatch,
                                    {
                                      backgroundColor: c,
                                      borderColor: tp.border,
                                    },
                                  ]}
                                />
                              ))}
                            </View>
                          </View>
                        </Press>
                      </FadeIn>
                    );
                  })}
                </View>
                <MiniPreview pal={pal} corners={corners} name={shownName} emoji={p.emoji} />
              </View>
            ) : null}

            {step === 2 ? (
              <View>
                <StepTitle
                  pal={pal}
                  kicker="Your interests"
                  title="What gets you excited to travel?"
                  sub={`Pick as many as you like — “Picked for you” on Explore uses these. ${p.interests.length ? `${p.interests.length} selected` : ''}`}
                />
                <View style={styles.grid}>
                  {INTERESTS.map((it, i) => {
                    const on = p.interests.includes(it.key);
                    return (
                      <FadeIn key={it.key} delay={i * 50} from="scale" style={{ width: '48%' }}>
                        <Press
                          onPress={() => toggleInterest(it.key)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={it.label}
                          style={[styles.interest, { borderColor: on ? pal.primary : 'transparent' }]}>
                          <Image source={photos[it.image]} style={StyleSheet.absoluteFill} contentFit="cover" />
                          <LinearGradient colors={on ? [`${pal.primary}55`, `${pal.primary}EE`] : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']} style={StyleSheet.absoluteFill} />
                          <View
                            style={[
                              styles.check,
                              {
                                backgroundColor: on ? pal.accent : 'rgba(255,255,255,0.35)',
                              },
                            ]}>
                            {on ? <Ionicons name="checkmark" size={14} color="#1A1C17" /> : null}
                          </View>
                          <T style={{ fontSize: 24 }}>{it.emoji}</T>
                          <T variant="small" weight="bold" color="#FFFFFF">
                            {it.label}
                          </T>
                        </Press>
                      </FadeIn>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {step === 3 ? (
              <View>
                <StepTitle pal={pal} kicker="Travel style" title="How do you like to travel?" sub="Helps the Trip Assistant and recommendations match your pace and wallet." />
                <T variant="title" color={pal.text} style={{ marginBottom: 8 }}>
                  Pace
                </T>
                <View style={{ gap: 8 }}>
                  {PACE.map((o) => (
                    <OptionRow key={o.key} pal={pal} on={p.travelStyle === o.key} emoji={o.emoji} label={o.label} sub={o.sub} onPress={() => set({ travelStyle: o.key })} />
                  ))}
                </View>
                <T variant="title" color={pal.text} style={{ marginTop: 18, marginBottom: 8 }}>
                  Budget
                </T>
                <View style={{ gap: 8 }}>
                  {BUDGET.map((o) => (
                    <OptionRow key={o.key} pal={pal} on={p.budgetStyle === o.key} emoji={o.emoji} label={o.label} sub={o.sub} onPress={() => set({ budgetStyle: o.key })} />
                  ))}
                </View>
              </View>
            ) : null}

            {step === 4 ? (
              <View>
                <StepTitle pal={pal} kicker="Your home screen" title="Build your Explore page" sub="Switch sections on or off, pick a card shape and decide how lively it should feel." />
                <View style={[styles.card, { backgroundColor: pal.card, borderColor: pal.border }]}>
                  {SECTIONS.map((s, i) => (
                    <View
                      key={s.key}
                      style={[
                        styles.secRow,
                        i > 0 && {
                          borderTopWidth: 1,
                          borderTopColor: pal.border,
                        },
                      ]}>
                      <View style={[styles.secIcon, { backgroundColor: pal.primarySofter }]}>
                        <Ionicons name={s.icon} size={17} color={pal.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <T variant="small" weight="semibold" color={pal.text}>
                          {s.label}
                        </T>
                        <T variant="caption" color={pal.textSecondary}>
                          {s.sub}
                        </T>
                      </View>
                      <Switch
                        value={p.sections[s.key]}
                        onValueChange={(v) => set({ sections: { ...p.sections, [s.key]: v } })}
                        trackColor={{
                          true: pal.primary,
                          false: pal.borderStrong,
                        }}
                        thumbColor="#FFFFFF"
                        accessibilityLabel={`Show ${s.label}`}
                      />
                    </View>
                  ))}
                </View>

                <T variant="title" color={pal.text} style={{ marginTop: 18, marginBottom: 8 }}>
                  Card shape
                </T>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(Object.keys(cornerStyles) as CornerStyle[]).map((c) => {
                    const on = corners === c;
                    return (
                      <Press
                        key={c}
                        onPress={() => setCorners(c)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`${cornerStyles[c].name} corners`}
                        style={[
                          styles.cornerOpt,
                          {
                            backgroundColor: on ? pal.primarySoft : pal.card,
                            borderColor: on ? pal.primary : pal.border,
                          },
                        ]}>
                        <View
                          style={[
                            styles.cornerDemo,
                            {
                              borderRadius: Math.round(14 * cornerStyles[c].scale),
                              backgroundColor: pal.primary,
                            },
                          ]}
                        />
                        <T variant="small" weight="semibold" color={on ? pal.primary : pal.text}>
                          {cornerStyles[c].name}
                        </T>
                      </Press>
                    );
                  })}
                </View>

                <View
                  style={[
                    styles.card,
                    styles.secRow,
                    {
                      backgroundColor: pal.card,
                      borderColor: pal.border,
                      marginTop: 14,
                    },
                  ]}>
                  <View style={[styles.secIcon, { backgroundColor: pal.accentSoft }]}>
                    <Ionicons name="sparkles" size={17} color={pal.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T variant="small" weight="semibold" color={pal.text}>
                      Animations
                    </T>
                    <T variant="caption" color={pal.textSecondary}>
                      Flying plane, floating cards, smooth entrances
                    </T>
                  </View>
                  <Switch value={p.motion} onValueChange={(v) => set({ motion: v })} trackColor={{ true: pal.primary, false: pal.borderStrong }} thumbColor="#FFFFFF" accessibilityLabel="Animations" />
                </View>
              </View>
            ) : null}

            {step === 5 ? (
              <View>
                <StepTitle pal={pal} kicker="About you" title="How should we greet you?" sub="Choose a nickname and a travel avatar. They show up on your home screen." />
                <View style={[styles.input, { backgroundColor: pal.card, borderColor: pal.border }]}>
                  <Ionicons name="happy-outline" size={18} color={pal.textMuted} />
                  <TextInput
                    value={p.nickname}
                    onChangeText={(v) => set({ nickname: v })}
                    placeholder={`Nickname (default: ${firstName})`}
                    placeholderTextColor={pal.textMuted}
                    maxLength={24}
                    style={[styles.inputText, { color: pal.text }]}
                    accessibilityLabel="Nickname"
                  />
                </View>
                <T variant="title" color={pal.text} style={{ marginTop: 18, marginBottom: 8 }}>
                  Travel avatar
                </T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {EMOJIS.map((e) => {
                    const on = p.emoji === e;
                    return (
                      <Press
                        key={e}
                        onPress={() => set({ emoji: e })}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={`Avatar ${e}`}
                        scaleTo={0.85}
                        style={[
                          styles.emoji,
                          {
                            backgroundColor: on ? pal.primarySoft : pal.card,
                            borderColor: on ? pal.primary : pal.border,
                          },
                        ]}>
                        <T style={{ fontSize: 24, lineHeight: 30 }}>{e}</T>
                      </Press>
                    );
                  })}
                </View>
                <T variant="title" color={pal.text} style={{ marginTop: 18, marginBottom: 8 }}>
                  Language
                </T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {LANGUAGES.map((l) => (
                    <SmallChip key={l.code} pal={pal} on={lang === l.code} label={`${l.flag} ${l.native}`} onPress={() => setLang(l.code)} />
                  ))}
                </View>
                <T variant="title" color={pal.text} style={{ marginTop: 18, marginBottom: 8 }}>
                  Home currency
                </T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {currencies.slice(0, 10).map((c) => (
                    <SmallChip key={c.code} pal={pal} on={currency === c.code} label={`${c.symbol} ${c.code}`} onPress={() => setCurrency(c.code)} />
                  ))}
                </View>
              </View>
            ) : null}

            {step === 6 ? (
              <View style={{ alignItems: 'center' }}>
                <Confetti pal={pal} />
                <LinearGradient colors={[pal.heroA, pal.heroB, pal.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCircle}>
                  <T style={{ fontSize: 54, lineHeight: 64 }}>{p.emoji}</T>
                </LinearGradient>
                <T variant="display" center color={pal.text} style={{ marginTop: 14 }}>
                  Looking good, {shownName}!
                </T>
                <T variant="body" center color={pal.textSecondary} style={{ marginTop: 6 }}>
                  Here’s your TogetherWeGo:
                </T>
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: pal.card,
                      borderColor: pal.border,
                      alignSelf: 'stretch',
                      marginTop: 16,
                    },
                  ]}>
                  <Summary pal={pal} icon="color-palette-outline" label="Theme" value={`${themes[theme].emoji} ${themes[theme].name} · ${cornerStyles[corners].name} corners`} />
                  <Summary
                    pal={pal}
                    icon="heart-outline"
                    label="Interests"
                    value={
                      p.interests.length
                        ? INTERESTS.filter((i) => p.interests.includes(i.key))
                            .map((i) => i.emoji)
                            .join(' ')
                        : 'Everything'
                    }
                  />
                  <Summary pal={pal} icon="walk-outline" label="Style" value={`${PACE.find((x) => x.key === p.travelStyle)?.label} pace · ${BUDGET.find((x) => x.key === p.budgetStyle)?.label}`} />
                  <Summary pal={pal} icon="home-outline" label="Home sections" value={`${Object.values(p.sections).filter(Boolean).length} of ${SECTIONS.length} on`} />
                  <Summary pal={pal} icon="globe-outline" label="Language & currency" value={`${LANGUAGES.find((l) => l.code === lang)?.native} · ${currency}`} />
                </View>
                <MiniPreview pal={pal} corners={corners} name={shownName} emoji={p.emoji} />
              </View>
            ) : null}
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

type Pal = ReturnType<typeof paletteOf>;

const bubblePos = [
  { left: 0, top: 30 },
  { right: 4, top: 10 },
  { left: 22, bottom: 0 },
  { right: 0, bottom: 20 },
  { left: 92, top: -6 },
  { right: 86, bottom: -12 },
] as const;

function StepTitle({ pal, kicker, title, sub }: { pal: Pal; kicker: string; title: string; sub: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <T variant="kicker" color={pal.primary}>
        {kicker}
      </T>
      <T variant="h1" color={pal.text} style={{ marginTop: 4 }} accessibilityRole="header">
        {title}
      </T>
      <T variant="bodySm" color={pal.textSecondary} style={{ marginTop: 6 }}>
        {sub}
      </T>
    </View>
  );
}

function OptionRow({ pal, on, emoji, label, sub, onPress }: { pal: Pal; on: boolean; emoji: string; label: string; sub: string; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[
        styles.option,
        {
          backgroundColor: on ? pal.primarySofter : pal.card,
          borderColor: on ? pal.primary : pal.border,
        },
      ]}>
      <T style={{ fontSize: 26, lineHeight: 32 }}>{emoji}</T>
      <View style={{ flex: 1 }}>
        <T variant="title" color={pal.text}>
          {label}
        </T>
        <T variant="caption" color={pal.textSecondary}>
          {sub}
        </T>
      </View>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? pal.primary : pal.textMuted} />
    </Press>
  );
}

function SmallChip({ pal, on, label, onPress }: { pal: Pal; on: boolean; label: string; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[
        styles.smallChip,
        {
          backgroundColor: on ? pal.primary : pal.card,
          borderColor: on ? pal.primary : pal.border,
        },
      ]}>
      <T variant="small" weight="semibold" color={on ? '#FFFFFF' : pal.text}>
        {label}
      </T>
    </Press>
  );
}

function Summary({ pal, icon, label, value }: { pal: Pal; icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.secRow}>
      <View style={[styles.secIcon, { backgroundColor: pal.primarySofter }]}>
        <Ionicons name={icon} size={16} color={pal.primary} />
      </View>
      <T variant="small" color={pal.textSecondary} style={{ width: 120 }}>
        {label}
      </T>
      <T variant="small" weight="semibold" color={pal.text} style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </T>
    </View>
  );
}

/** A tiny phone-style preview of the Explore page in the chosen palette + corners. */
function MiniPreview({ pal, corners, name, emoji }: { pal: Pal; corners: CornerStyle; name: string; emoji: string }) {
  const r = (n: number) => Math.round(n * cornerStyles[corners].scale);
  return (
    <View style={[styles.preview, { backgroundColor: pal.bg, borderColor: pal.borderStrong }]} accessibilityLabel="Live preview">
      <T variant="kicker" color={pal.textMuted} style={{ marginBottom: 8 }}>
        Live preview
      </T>
      <LinearGradient colors={[pal.heroA, pal.heroB, pal.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: r(18), padding: 12, height: 86 }}>
        <T variant="caption" color="rgba(255,255,255,0.85)">
          Hi {name} {emoji}
        </T>
        <T variant="h3" color="#FFFFFF">
          Where to next?
        </T>
        <View style={[styles.previewSun, { backgroundColor: pal.accent }]} />
      </LinearGradient>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <View
          style={{
            flex: 1,
            height: 44,
            borderRadius: r(14),
            backgroundColor: pal.primary,
          }}
        />
        <View
          style={{
            flex: 1,
            height: 44,
            borderRadius: r(14),
            backgroundColor: pal.card,
            borderWidth: 1,
            borderColor: pal.border,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              paddingHorizontal: 12,
              height: 22,
              borderRadius: 11,
              backgroundColor: i === 0 ? pal.primary : pal.primarySoft,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const CONFETTI = ['#F2B33D', '#E8833A', '#3D7DD8', '#7C5CD6', '#2A9D8F', '#D94F86', '#8CC97A', '#F5C451', '#5CC8D6', '#FF8A5B', '#B83268', '#2FAE66'];

/** One-shot confetti burst for the final step. */
function Confetti({ pal }: { pal: Pal }) {
  const [v] = useState(() => new Animated.Value(0));
  const motion = useAppStore((s) => s.personal.motion);
  useEffect(() => {
    if (!motion) return;
    Animated.timing(v, {
      toValue: 1,
      duration: 1600,
      useNativeDriver: nativeDriver,
    }).start();
  }, [v, motion]);
  if (!motion) return null;
  return (
    <View pointerEvents="none" style={styles.confetti}>
      {CONFETTI.concat(CONFETTI).map((c, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const dist = 90 + (i % 4) * 30;
        return (
          <Animated.View
            key={i}
            style={[
              styles.piece,
              {
                backgroundColor: i % 5 === 0 ? pal.accent : c,
                borderRadius: i % 3 === 0 ? 5 : 2,
                opacity: v.interpolate({
                  inputRange: [0, 0.1, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateX: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.cos(angle) * dist],
                    }),
                  },
                  {
                    translateY: v.interpolate({
                      inputRange: [0, 0.6, 1],
                      outputRange: [0, Math.sin(angle) * dist - 20, Math.sin(angle) * dist + 40],
                    }),
                  },
                  {
                    rotate: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${(i % 2 ? 1 : -1) * 540}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
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
  bubbles: {
    width: 260,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  heroCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  themeCard: { borderRadius: radius.lg, overflow: 'hidden' },
  themeHero: { height: 64, padding: 10, justifyContent: 'flex-end' },
  themeSun: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  swatch: { width: 18, height: 18, borderRadius: 9, borderWidth: 1 },
  interest: {
    height: 128,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: 12,
    justifyContent: 'flex-end',
    borderWidth: 3,
  },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  secRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  secIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerOpt: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  cornerDemo: { width: 44, height: 30 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 52,
  },
  inputText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    height: '100%',
    ...({ outlineStyle: 'none' } as object),
  },
  emoji: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallChip: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  preview: {
    alignSelf: 'stretch',
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
  },
  previewSun: {
    position: 'absolute',
    right: 14,
    top: 12,
    width: 26,
    height: 26,
    borderRadius: 13,
  },
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
  confetti: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  piece: { position: 'absolute', width: 9, height: 14 },
});
