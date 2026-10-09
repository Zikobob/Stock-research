import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CurrencyPickerSheet } from '@/components/CurrencyPickerSheet';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, Chip, ListRow, ToggleRow } from '@/components/ui/bits';
import { confirmAction, toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { currencyByCode } from '@/data/reference';
import { LANGUAGES, useT } from '@/i18n';
import { CLAUDE_MODEL } from '@/services/assistant';
import { ensurePermission, sendTestReminder } from '@/services/notifications';
import { getApiKey, looksLikeApiKey, setApiKey } from '@/services/secrets';
import { pickImage } from '@/services/files';
import { shareText } from '@/services/share';
import { useActiveTrip, useAppStore, useCurrentUser } from '@/store/useAppStore';
import type { TextScale } from '@/store/types';
import { appearance, colors, cornerStyles, radius, themes } from '@/theme';
import { maxLen, validateName } from '@/utils/validation';

const AVATARS = ['avatar-maya', 'avatar-diego', 'avatar-priya', 'avatar-sam', 'avatar-ana', 'avatar-noah'];

export default function Settings() {
  const t = useT();
  const user = useCurrentUser();
  const trip = useActiveTrip();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const reseed = useAppStore((s) => s.reseedDemo);
  const timeline = useAppStore((s) => s.demoTimeline);
  const signOut = useAppStore((s) => s.signOut);
  const resetEverything = useAppStore((s) => s.resetEverything);
  const ensureSeed = useAppStore((s) => s.ensureSeed);
  const personal = useAppStore((s) => s.personal);
  const updatePersonal = useAppStore((s) => s.updatePersonal);

  const [name, setName] = useState(user?.name ?? '');
  const [city, setCity] = useState(user?.homeCity ?? '');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [curOpen, setCurOpen] = useState(false);
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [keyErr, setKeyErr] = useState<string | null>(null);

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
  }, []);

  const saveProfile = () => {
    const e = { name: validateName(name), city: maxLen(40, 'City')(city) };
    setErrors(e);
    if (e.name || e.city) return tap('warning');
    updateProfile({ name: name.trim(), homeCity: city.trim() || undefined });
    toast('Profile saved');
  };

  const pickAvatarPhoto = async () => {
    try {
      const f = await pickImage();
      if (f) {
        updateProfile({ avatar: f.uri });
        toast('Profile photo updated');
      }
    } catch {
      toast('Couldn’t open your photos', { tone: 'warn' });
    }
  };

  const saveKey = async () => {
    if (!looksLikeApiKey(key)) return setKeyErr('Anthropic keys start with “sk-ant-”. Check you copied the whole key.');
    await setApiKey(key.trim());
    setKey('');
    setKeyErr(null);
    setHasKey(true);
    update({ aiMode: 'claude' });
    toast('Key saved securely — Claude mode on');
  };

  const scales: { v: TextScale; l: string }[] = [
    { v: 1, l: 'Default' },
    { v: 1.12, l: 'Large' },
    { v: 1.25, l: 'Extra large' },
  ];

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
        <ToggleRow icon="sparkles-outline" label="Animations" sub="Flying plane, floating cards and smooth entrances" value={personal.motion} onChange={(v) => updatePersonal({ motion: v })} />
      </Card>

      {/* Profile */}
      <Card style={{ gap: 12 }}>
        <T variant="title">Profile</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={user?.name ?? 'You'} src={user?.avatar} size={60} />
          <View style={{ flex: 1, gap: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {AVATARS.map((a) => (
                <Press key={a} onPress={() => updateProfile({ avatar: a })} accessibilityLabel="Choose this avatar" style={[styles.avatarOpt, user?.avatar === a && { borderColor: colors.primary }]}>
                  <Avatar name="Avatar" src={a} size={36} />
                </Press>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip small icon="image-outline" label="Upload photo" onPress={pickAvatarPhoto} />
              <Chip small icon="text-outline" label="Initials" onPress={() => updateProfile({ avatar: undefined })} />
            </View>
          </View>
        </View>
        <Input label="Name" value={name} onChangeText={setName} error={errors.name} icon="person-outline" />
        <Input label="Home city" value={city} onChangeText={setCity} error={errors.city} icon="home-outline" placeholder="e.g. Middletown, DE" />
        <T variant="caption" color={colors.textSecondary}>
          Signed in as {user?.email} · {user?.provider === 'google' ? 'Google' : 'email & password'}
        </T>
        <Button label="Save profile" size="md" onPress={saveProfile} />
      </Card>

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

      {/* Notifications */}
      <Card style={{ marginTop: 14, gap: 6 }}>
        <ToggleRow
          icon="notifications-outline"
          label={t('settings.notifications')}
          sub="Live alerts before activities with the 🔔 on"
          value={settings.notificationsEnabled}
          onChange={async (v) => {
            update({ notificationsEnabled: v });
            if (v) {
              const ok = await ensurePermission();
              toast(ok ? 'Reminders on' : 'Allow notifications in your phone settings', { tone: ok ? 'ok' : 'warn' });
            }
          }}
        />
        <T variant="small" weight="semibold">
          {t('settings.lead')}
        </T>
        <View style={styles.wrap}>
          {[10, 30, 60, 120].map((m) => (
            <Chip key={m} small label={m < 60 ? `${m} min` : `${m / 60} hr`} active={settings.reminderLeadMin === m} onPress={() => update({ reminderLeadMin: m })} />
          ))}
        </View>
        <Button label="Send a test reminder" variant="soft" size="md" icon="alarm-outline" onPress={() => { sendTestReminder(5); toast('Arriving in 5 seconds…', { icon: 'alarm-outline' }); }} style={{ marginTop: 6 }} />
      </Card>

      {/* Accessibility */}
      <Card style={{ marginTop: 14, gap: 8 }}>
        <T variant="title">Accessibility</T>
        <T variant="small" weight="semibold">
          {t('settings.textSize')}
        </T>
        <View style={styles.wrap}>
          {scales.map((s) => (
            <Chip key={s.v} label={s.l} active={settings.textScale === s.v} onPress={() => update({ textScale: s.v })} />
          ))}
        </View>
        <ToggleRow icon="phone-portrait-outline" label="Haptic feedback" value={settings.haptics} onChange={(v) => update({ haptics: v })} />
        <T variant="caption" color={colors.textSecondary}>
          Every button has a screen-reader label, colours meet WCAG AA contrast, and the app follows your phone’s font size too.
        </T>
      </Card>

      {/* AI */}
      <Card style={{ marginTop: 14, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <T variant="title">Trip Assistant</T>
        </View>
        <View style={styles.wrap}>
          <Chip icon="cloud-offline-outline" label="Offline (built-in)" active={settings.aiMode === 'offline'} onPress={() => update({ aiMode: 'offline' })} />
          <Chip
            icon="sparkles-outline"
            label="Claude AI"
            active={settings.aiMode === 'claude'}
            onPress={() => {
              if (!hasKey) return toast('Add your Anthropic API key first', { tone: 'warn' });
              update({ aiMode: 'claude' });
            }}
          />
        </View>
        <T variant="caption" color={colors.textSecondary}>
          Offline mode answers from your trip data with no internet. Claude mode sends questions plus trip details to Anthropic’s {CLAUDE_MODEL} model using your own key, which is stored in the phone’s secure keychain.
        </T>
        {hasKey ? (
          <View style={styles.keyRow}>
            <Ionicons name="key" size={16} color={colors.primary} />
            <T variant="small" style={{ flex: 1 }}>
              API key saved securely
            </T>
            <Press
              onPress={async () => {
                await setApiKey(null);
                setHasKey(false);
                update({ aiMode: 'offline' });
                toast('Key removed');
              }}
              hitSlop={8}>
              <T variant="small" weight="semibold" color={colors.red}>
                Remove
              </T>
            </Press>
          </View>
        ) : (
          <>
            <Input placeholder="sk-ant-…" value={key} onChangeText={(v) => { setKey(v); setKeyErr(null); }} secureToggle autoCapitalize="none" autoCorrect={false} error={keyErr} icon="key-outline" />
            <Button label="Save key" size="md" variant="secondary" onPress={saveKey} disabled={!key} />
          </>
        )}
      </Card>

      {/* Demo */}
      <Card style={{ marginTop: 14, gap: 10 }}>
        <T variant="title">Demo timeline</T>
        <T variant="caption" color={colors.textSecondary}>
          Re-create the sample Tokyo trip as upcoming, in progress or finished to show every stage from planning through completion.
        </T>
        <View style={styles.wrap}>
          {(
            [
              ['upcoming', 'Starts in 3 days'],
              ['active', 'Day 2 in progress'],
              ['completed', 'Just finished'],
            ] as const
          ).map(([k, l]) => (
            <Chip
              key={k}
              small
              label={l}
              active={timeline === k}
              onPress={() =>
                confirmAction('Reset the demo trip?', `“Tokyo & Kyoto Explorer” will be rebuilt as “${l}”. Your other trips are untouched.`, () => {
                  reseed(k);
                  toast('Demo trip updated');
                })
              }
            />
          ))}
        </View>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <ListRow icon="help-circle-outline" label="How to use TogetherWeGo" onPress={() => router.push('/help')} />
        <ListRow icon="information-circle-outline" label="About, credits & sources" onPress={() => router.push('/about')} />
        {trip ? (
          <ListRow
            icon="download-outline"
            label="Export this trip"
            sub="Share a JSON backup of the itinerary, budget and checklist"
            onPress={() => {
              const { messages, photos, docs, ...rest } = trip;
              void messages;
              void photos;
              void docs;
              shareText(JSON.stringify(rest, null, 1), `${trip.name} backup`);
            }}
          />
        ) : null}
        <ListRow
          icon="refresh-circle-outline"
          tint={colors.red}
          label="Reset app data"
          sub="Deletes all trips and accounts on this device"
          onPress={() =>
            confirmAction('Reset everything?', 'All trips, chats and accounts on this device will be erased and the demo data restored.', async () => {
              resetEverything();
              await ensureSeed();
              router.replace('/sign-in');
            }, { destructive: true, confirmLabel: 'Reset' })
          }
        />
      </Card>

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
  avatarOpt: { borderRadius: 22, borderWidth: 2, borderColor: 'transparent', padding: 1 },
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.primarySofter },
});
