import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Appearance as OsAppearance, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Building } from '@/components/personalize/Building';
import { lookNeedsReload, modeAfterPickingTheme } from '@/components/personalize/look';
import { STEP, STEPS } from '@/components/personalize/options';
import { paletteOf } from '@/components/personalize/palette';
import { PalButton, PaletteVeil, StepBar, Tx } from '@/components/personalize/parts';
import { StepInterests } from '@/components/personalize/steps/StepInterests';
import { StepLayout } from '@/components/personalize/steps/StepLayout';
import { StepLook } from '@/components/personalize/steps/StepLook';
import { StepReveal } from '@/components/personalize/steps/StepReveal';
import { StepVibe } from '@/components/personalize/steps/StepVibe';
import { StepWelcome } from '@/components/personalize/steps/StepWelcome';
import { celebrate } from '@/components/ui/Confetti';
import { toast } from '@/components/ui/feedback';
import { FadeIn } from '@/components/ui/motion';
import { Press } from '@/components/ui/Press';
import { useDraft } from '@/hooks/useDraft';
import { ensurePermission, setTriviaReminder } from '@/services/notifications';
import type { Personal } from '@/store/types';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { MAX_WIDTH, appearance, applyAppearance, resolvedMode, type CornerStyle, type ModePref, type ThemeKey } from '@/theme';

/** Everything the person is choosing in this flow; kept for as long as the app is open so closing the screen by accident loses nothing. */
interface Draft {
  p: Personal;
  theme: ThemeKey;
  mode: ModePref;
  corners: CornerStyle;
}

/**
 * "Make it yours": Welcome, Look, Interests, Layout, Vibe, then a summary and a short "Building your trip HQ" reveal.
 * One question per screen, every step skippable, and the whole screen repaints in the look being picked (it draws itself
 * with a palette object, not the app's own colours). Each step is a component in components/personalize/steps.
 */
export default function Personalize() {
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const saved = useAppStore((s) => s.personal);
  const updatePersonal = useAppStore((s) => s.updatePersonal);
  const setRestyled = useAppStore((s) => s.setRestyled);

  const [step, setStep] = useState(0);
  // True after a row on the summary was tapped: Continue and Back then return straight to the summary.
  const [fromSummary, setFromSummary] = useState(false);
  const [forward, setForward] = useState(true);
  const [building, setBuilding] = useState<{ emoji: string } | null>(null);

  // A new key whenever the saved answers change elsewhere (Settings), so an old draft never overrides a newer choice.
  const [draft, setDraft, clearDraft] = useDraft<Draft>(`personalize:${JSON.stringify(saved)}`, {
    p: { ...saved, sections: { ...saved.sections }, order: [...saved.order], interests: [...saved.interests] },
    theme: appearance.theme,
    mode: appearance.mode,
    corners: appearance.corners,
  });
  const { p, theme, mode, corners } = draft;

  const set = (patch: Partial<Personal>) => setDraft((d) => ({ ...d, p: { ...d.p, ...patch } }));
  const pickTheme = (k: ThemeKey) => setDraft((d) => ({ ...d, theme: k, mode: modeAfterPickingTheme(k, d.mode) }));
  const pickMode = (m: ModePref) => setDraft((d) => ({ ...d, mode: m }));

  const pal = useMemo(() => paletteOf(theme, mode), [theme, mode]);
  const hasWash = pal.washFrom !== pal.bg;
  const firstName = user?.name.split(' ')[0] ?? 'traveller';
  const shownName = p.nickname.trim() || firstName;
  const onSummary = step === STEP.summary;
  const closing = step === 0 && !fromSummary;

  const exit = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/explore'));
  const toSummary = () => {
    setFromSummary(false);
    setForward(true);
    setStep(STEP.summary);
  };
  const edit = (to: number) => {
    setFromSummary(true);
    setForward(false);
    setStep(to);
  };
  const next = () => {
    if (fromSummary) return toSummary();
    setForward(true);
    setStep((s) => Math.min(STEP.summary, s + 1));
  };
  const back = () => {
    if (fromSummary) return toSummary();
    if (step === 0) return exit();
    setForward(false);
    setStep((s) => s - 1);
  };

  const onTrivia = async (on: boolean) => {
    set({ triviaReminder: on });
    if (!on || Platform.OS === 'web') return;
    if (!(await ensurePermission())) {
      set({ triviaReminder: false });
      toast('Allow notifications in your phone settings to get the reminder', { tone: 'warn', icon: 'notifications-off-outline' });
    }
  };

  // The last button: save every answer, run the short reveal, then put the look on (which restarts the app if the look changed).
  const build = () => {
    const mine: Personal = { ...p, nickname: p.nickname.trim(), done: true };
    updatePersonal(mine);
    void setTriviaReminder(mine.triviaReminder).then((ok) => {
      if (ok) return;
      updatePersonal({ triviaReminder: false });
      toast('Allow notifications in your phone settings to get the reminder', { tone: 'warn', icon: 'notifications-off-outline' });
    });
    setBuilding({ emoji: p.emoji });
  };

  const finish = () => {
    const look = { theme, mode, corners };
    const reload = lookNeedsReload(look, { theme: appearance.theme, mode: appearance.mode, corners: appearance.corners, resolved: resolvedMode }, OsAppearance.getColorScheme() === 'dark');
    if (!reload) {
      applyAppearance(look); // only remembers the choice (light or dark "system" and the like)
      clearDraft();
      router.replace('/(tabs)/explore');
      celebrate('Your trip HQ is ready. Change it anytime in Settings');
      return;
    }
    setRestyled(true); // after the restart, Home says the look is live (see _layout)
    // Give the store a moment to save before the UI restarts with the new look.
    setTimeout(() => {
      if (applyAppearance(look)) return;
      clearDraft();
      setBuilding(null);
      toast('Saved! Close and reopen the app to see your new look.', { icon: 'refresh' });
      router.replace('/(tabs)/explore');
    }, 450);
  };

  const label = onSummary ? 'Apply my style' : fromSummary ? 'Back to summary' : step === 0 ? 'Let’s go' : 'Continue';

  return (
    <View style={[styles.root, { backgroundColor: pal.bg, paddingTop: insets.top }]}>
      {hasWash ? <LinearGradient pointerEvents="none" colors={[pal.washFrom, pal.washTo, pal.bg]} locations={[0, 0.5, 1]} style={styles.wash} /> : null}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.column}>
        <View style={styles.top}>
          <Press onPress={back} accessibilityLabel={closing ? 'Close' : 'Back'} style={[styles.round, { backgroundColor: pal.card, borderColor: pal.border }]}>
            <Ionicons name={closing ? 'close' : 'chevron-back'} size={20} color={pal.text} />
          </Press>
          <View style={{ flex: 1, gap: 6 }}>
            <StepBar pal={pal} step={step} total={STEPS.length} />
            <Tx pal={pal} tone="secondary" variant="caption" weight="semibold">
              {onSummary ? 'All set' : `Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
            </Tx>
          </View>
          {!onSummary ? (
            <Press onPress={toSummary} accessibilityLabel="Skip to the end" style={styles.skip}>
              <Tx pal={pal} tone="secondary" variant="small" weight="bold">
                Skip
              </Tx>
            </Press>
          ) : (
            <View style={styles.skip} />
          )}
        </View>

        <ScrollView key={step} style={{ width: '100%' }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <FadeIn from={forward ? 'left' : 'right'} distance={24} duration={260}>
            {step === STEP.welcome ? <StepWelcome pal={pal} p={p} set={set} firstName={firstName} onSubmit={next} /> : null}
            {step === STEP.look ? <StepLook pal={pal} theme={theme} mode={mode} onTheme={pickTheme} onMode={pickMode} /> : null}
            {step === STEP.interests ? <StepInterests pal={pal} p={p} set={set} /> : null}
            {step === STEP.layout ? <StepLayout pal={pal} p={p} set={set} /> : null}
            {step === STEP.vibe ? <StepVibe pal={pal} p={p} set={set} onTrivia={onTrivia} /> : null}
            {onSummary ? <StepReveal pal={pal} p={p} theme={theme} mode={mode} shownName={shownName} onEdit={edit} /> : null}
          </FadeIn>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: pal.bg, borderTopColor: pal.border }]}>
          <PalButton pal={pal} label={label} onPress={onSummary ? build : next} iconRight={onSummary ? undefined : 'arrow-forward'} />
        </View>
      </KeyboardAvoidingView>

      <PaletteVeil pal={pal} signature={`${theme}-${mode}`} />
      {building ? <Building pal={pal} emoji={building.emoji} hasWash={hasWash} onDone={finish} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', overflow: 'hidden' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  column: { flex: 1, width: '100%', maxWidth: MAX_WIDTH },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  skip: { minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
