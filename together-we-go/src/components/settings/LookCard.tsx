import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { commitLook, currentLook } from '@/components/personalize/applyLook';
import { modeAfterPickingTheme } from '@/components/personalize/look';
import { EFFECT_OPTIONS, MODES } from '@/components/personalize/options';
import { paletteOf } from '@/components/personalize/palette';
import { MiniTicket, ThemeSwatch } from '@/components/personalize/parts';
import { Button } from '@/components/ui/Button';
import { Card, Chip, Divider } from '@/components/ui/bits';
import { celebrate } from '@/components/ui/Confetti';
import { toast } from '@/components/ui/feedback';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { useAppStore } from '@/store/useAppStore';
import { colors, cornerStyles, line, radius, themes, THEME_KEYS, type CornerStyle, type ModePref, type ThemeKey } from '@/theme';

import { Group } from './Group';

const CORNERS = Object.keys(cornerStyles) as CornerStyle[];

/**
 * The look of the app: six themes, light or dark, corner style and how big the celebrations are.
 * Theme, mode and corners are chosen first and then put on with one button (the app restarts to redraw everything);
 * the small ticket shows what you would get. Effects take hold at once and play a preview.
 */
export function LookCard() {
  const effects = useAppStore((s) => s.personal.effects);
  const updatePersonal = useAppStore((s) => s.updatePersonal);
  // the look as chosen here, and the one that is on the phone right now
  const [start] = useState(currentLook);
  const [theme, setTheme] = useState<ThemeKey>(start.theme);
  const [mode, setMode] = useState<ModePref>(start.mode);
  const [corners, setCorners] = useState<CornerStyle>(start.corners);
  const [on, setOn] = useState(start);
  const [busy, setBusy] = useState(false);

  const tp = useMemo(() => paletteOf(theme, mode), [theme, mode]);
  const changed = theme !== on.theme || mode !== on.mode || corners !== on.corners;

  const apply = async () => {
    setBusy(true);
    const result = await commitLook({ theme, mode, corners });
    if (result === 'reloading') return; // the app is restarting
    setBusy(false);
    if (result === 'failed') toast('Saved. Close and reopen the app to see your new look.', { icon: 'refresh' });
    else toast('Look saved');
    setOn({ theme, mode, corners });
  };

  return (
    <Card plated>
      <View style={styles.stack}>
        <Group label="Theme">
          <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Colour theme">
            {THEME_KEYS.map((k) => (
              <ThemeSwatch
                key={k}
                pal={colors}
                theme={k}
                mode={mode}
                selected={theme === k}
                onPress={() => {
                  setTheme(k);
                  setMode((m) => modeAfterPickingTheme(k, m));
                }}
              />
            ))}
          </View>
          <T variant="small" color={colors.textSecondary} accessibilityLiveRegion="polite">
            {themes[theme].name}: {themes[theme].vibe.toLowerCase()}
          </T>
        </Group>

        <Group label="Light or dark">
          <Segmented options={MODES.map((m) => ({ key: m.key, label: m.label }))} value={mode} onChange={setMode} />
        </Group>

        <Group label="Corners">
          <View style={styles.wrap}>
            {CORNERS.map((c) => (
              <Chip key={c} label={`${cornerStyles[c].name} corners`} active={corners === c} onPress={() => setCorners(c)} />
            ))}
          </View>
        </Group>

        <View style={[styles.desk, { backgroundColor: tp.accent }]} accessibilityLabel={`Preview of ${themes[theme].name}`}>
          <MiniTicket tp={tp} />
        </View>
        {changed ? (
          <View style={{ gap: 8 }}>
            <Button label="Apply look" icon="color-palette-outline" size="md" loading={busy} onPress={apply} />
            <T variant="caption" color={colors.textMuted}>
              The app restarts to redraw everything in the new look.
            </T>
          </View>
        ) : null}

        <Divider />
        <Group label="Effects">
          <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Effects">
            {EFFECT_OPTIONS.map((o) => (
              <Chip
                key={o.key}
                label={o.label}
                active={effects === o.key}
                onPress={() => {
                  updatePersonal({ effects: o.key });
                  celebrate(o.key === 'chill' ? 'Chill: a calm tick, no confetti' : undefined, o.key);
                }}
              />
            ))}
          </View>
          <T variant="caption" color={colors.textSecondary}>
            {EFFECT_OPTIONS.find((o) => o.key === effects)?.sub}. Tap one to try it.
          </T>
        </Group>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  desk: { padding: 12, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink },
});
