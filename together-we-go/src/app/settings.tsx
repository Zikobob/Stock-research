import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CurrencyPickerSheet } from '@/components/CurrencyPickerSheet';
import { AccessibilityCard } from '@/components/settings/AccessibilityCard';
import { AssistantCard } from '@/components/settings/AssistantCard';
import { DataCard } from '@/components/settings/DataCard';
import { DemoCard } from '@/components/settings/DemoCard';
import { NotificationsCard } from '@/components/settings/NotificationsCard';
import { ProfileCard } from '@/components/settings/ProfileCard';
import { SyncSettingsCard } from '@/components/sync/SyncSettingsCard';
import { Button } from '@/components/ui/Button';
import { Card, Chip, ListRow, ToggleRow } from '@/components/ui/bits';
import { confirmAction } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { currencyByCode } from '@/data/reference';
import { LANGUAGES, useT } from '@/i18n';
import { useOsReduceMotion } from '@/hooks/useReduceMotion';
import { useAppStore } from '@/store/useAppStore';
import { appearance, colors, cornerStyles, radius, themes } from '@/theme';

/** Settings: how the app looks and behaves, your profile, sync, reminders, accessibility and your data. Each card is its own component. */
export default function Settings() {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const signOut = useAppStore((s) => s.signOut);
  const personal = useAppStore((s) => s.personal);
  const osReduceMotion = useOsReduceMotion((s) => s.on);
  const updatePersonal = useAppStore((s) => s.updatePersonal);
  const [curOpen, setCurOpen] = useState(false);

  return (
    <Screen header={<Header title={t('settings.title')} subtitle="Make TogetherWeGo yours" />}>
      {/* Make it yours */}
      <Press onPress={() => router.push('/personalize')} style={styles.yours} accessibilityLabel="Make it yours — change theme, interests and home screen">
        <LinearGradient colors={[colors.heroA, colors.heroB, colors.heroC]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={styles.yoursEmoji}>
          <T style={{ fontSize: 28, lineHeight: 34 }}>{personal.emoji}</T>
        </View>
        <View style={{ flex: 1 }}>
          <T variant="title" weight="bold" color={colors.white}>
            Make it yours 🎨
          </T>
          <T variant="caption" color="rgba(255,255,255,0.9)">
            {themes[appearance.theme].emoji} {themes[appearance.theme].name} theme · {cornerStyles[appearance.corners].name} corners · {personal.interests.length} interests
          </T>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.white} />
      </Press>
      <Card style={{ marginBottom: 14 }}>
        <ToggleRow icon="sparkles-outline" label="Animations" sub={osReduceMotion ? 'Off for now: your phone’s Reduce Motion setting is on' : 'Flying plane, floating cards and smooth entrances'} value={personal.motion && !osReduceMotion} onChange={(v) => updatePersonal({ motion: v })} />
      </Card>

      <SyncSettingsCard />

      <ProfileCard />

      {/* Language */}
      <Card style={{ gap: 10, marginTop: 14 }}>
        <T variant="title">{t('settings.language')}</T>
        <View style={styles.wrap}>
          {LANGUAGES.map((l) => (
            <Chip key={l.code} label={`${l.flag} ${l.native}`} active={settings.language === l.code} onPress={() => update({ language: l.code })} />
          ))}
        </View>
      </Card>

      {/* Currency & time */}
      <Card style={{ marginTop: 14 }}>
        <ListRow icon="cash-outline" label={t('settings.currency')} sub={`${settings.homeCurrency} · ${currencyByCode(settings.homeCurrency)?.name ?? ''}`} onPress={() => setCurOpen(true)} />
        <ToggleRow icon="globe-outline" label="Show itinerary times in trip time" sub="Off = convert to your phone’s time zone" value={settings.showTripTime} onChange={(v) => update({ showTripTime: v })} />
      </Card>

      <NotificationsCard />
      <AccessibilityCard />
      <AssistantCard />
      <DemoCard />
      <DataCard />

      <Button
        label={t('settings.signOut')}
        variant="danger"
        icon="log-out-outline"
        style={{ marginTop: 16 }}
        onPress={() =>
          confirmAction('Sign out?', 'Your trips stay saved on this device.', () => {
            signOut();
            router.replace('/sign-in');
          }, { confirmLabel: 'Sign out' })
        }
      />
      <T variant="caption" color={colors.textMuted} center style={{ marginTop: 14 }}>
        TogetherWeGo v1.0 · Made for FBLA Mobile Application Development 2026–27
      </T>

      <CurrencyPickerSheet visible={curOpen} onClose={() => setCurOpen(false)} value={settings.homeCurrency} onPick={(c) => update({ homeCurrency: c })} title="Home currency" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  yours: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 14 },
  yoursEmoji: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
