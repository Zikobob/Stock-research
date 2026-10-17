import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card, Chip, ToggleRow } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { ensurePermission, sendTestReminder } from '@/services/notifications';
import { useAppStore } from '@/store/useAppStore';

/** Reminder switch, how early to remind, and a test button. */
export function NotificationsCard() {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);

  return (
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
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
