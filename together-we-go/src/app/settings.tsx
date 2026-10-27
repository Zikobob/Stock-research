import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CurrencyPickerSheet } from '@/components/CurrencyPickerSheet';
import { AccessibilityCard } from '@/components/settings/AccessibilityCard';
import { AssistantCard } from '@/components/settings/AssistantCard';
import { DataCard } from '@/components/settings/DataCard';
import { DemoCard } from '@/components/settings/DemoCard';
import { Group } from '@/components/settings/Group';
import { HomeLayoutCard } from '@/components/settings/HomeLayoutCard';
import { LookCard } from '@/components/settings/LookCard';
import { NotificationsCard } from '@/components/settings/NotificationsCard';
import { ProfileCard } from '@/components/settings/ProfileCard';
import { SyncSettingsCard } from '@/components/sync/SyncSettingsCard';
import { Button } from '@/components/ui/Button';
import { Fold } from '@/components/ui/Fold';
import { Card, Chip, Divider, ListRow, SectionHeader, ToggleRow } from '@/components/ui/bits';
import { confirmAction } from '@/components/ui/feedback';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { currencyByCode } from '@/data/reference';
import { LANGUAGES, useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { colors, space } from '@/theme';

/**
 * Settings, everyday things first: you, the look, what Home shows, language and money, reminders, text and touch.
 * The technical ones (time zones, sync between phones, Claude AI, sample trips, reset) are folded under Advanced.
 * Each card is its own component in components/settings.
 */
export default function Settings() {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const signOut = useAppStore((s) => s.signOut);
  const [curOpen, setCurOpen] = useState(false);

  return (
    <Screen header={<Header title={t('settings.title')} kicker="TogetherWeGo" subtitle="Your look, your Home, your reminders" />}>
      <ProfileCard />

      <SectionHeader title="Look and feel" style={styles.section} />
      <LookCard />
      <View style={{ marginTop: 8 }}>
        <ListRow icon="color-palette-outline" label="Make it yours again" sub="Redo the quick picks: look, interests, Home and vibe" onPress={() => router.push('/personalize')} />
      </View>

      <SectionHeader title="Home layout" style={styles.section} />
      <HomeLayoutCard />

      <SectionHeader title="Everyday" style={styles.section} />
      <View style={{ gap: 20 }}>
        <Group label={t('settings.language')}>
          <View style={styles.wrap}>
            {LANGUAGES.map((l) => (
              <Chip key={l.code} label={l.native} active={settings.language === l.code} onPress={() => update({ language: l.code })} />
            ))}
          </View>
        </Group>
        <Divider />
        <Group label="Money" gap={2}>
          <ListRow icon="cash-outline" label={t('settings.currency')} sub={`${settings.homeCurrency} · ${currencyByCode(settings.homeCurrency)?.name ?? ''}`} onPress={() => setCurOpen(true)} />
        </Group>
        <Divider />
        <NotificationsCard />
        <Divider />
        <AccessibilityCard />
        <Divider />
        <Group label="Help" gap={2}>
          <ListRow icon="help-circle-outline" label="How to use TogetherWeGo" onPress={() => router.push('/help')} />
          <ListRow icon="information-circle-outline" label="About, credits & sources" onPress={() => router.push('/about')} />
        </Group>
      </View>

      <Fold title="Advanced" icon="options-outline" label="Advanced settings" summary="Time zones, sync between phones, Claude AI, sample trips, reset">
        <Card style={{ marginTop: 14 }}>
          <ToggleRow icon="globe-outline" label="Plan times in trip time" sub="Off shows them in your phone’s time zone" value={settings.showTripTime} onChange={(v) => update({ showTripTime: v })} />
        </Card>
        <SyncSettingsCard />
        <AssistantCard />
        <DemoCard />
        <DataCard />
      </Fold>

      <Button
        label={t('settings.signOut')}
        variant="danger"
        icon="log-out-outline"
        style={{ marginTop: space.section }}
        onPress={() =>
          confirmAction(
            'Sign out?',
            'Your trips stay saved on this device.',
            () => {
              signOut();
              router.replace('/sign-in');
            },
            { confirmLabel: 'Sign out' },
          )
        }
      />
      <T variant="caption" color={colors.textMuted} style={{ marginTop: space.xl }}>
        TogetherWeGo v1.0 · Made for FBLA Mobile Application Development 2026–27
      </T>

      <CurrencyPickerSheet visible={curOpen} onClose={() => setCurOpen(false)} value={settings.homeCurrency} onPick={(c) => update({ homeCurrency: c })} title="Home currency" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: space.section },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
