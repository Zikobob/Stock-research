import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip, ToggleRow } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { T } from '@/components/ui/T';
import { useT } from '@/i18n';
import { ensurePermission, sendTestReminder, setTriviaReminder } from '@/services/notifications';
import { TRIVIA_REMINDER } from '@/data/personal';
import { useAppStore } from '@/store/useAppStore';

import { Group } from './Group';

/** Reminder switch, how early to remind, the daily trivia nudge, and a test button. A group inside the Everyday card. */
export function NotificationsCard() {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const trivia = useAppStore((s) => s.personal.triviaReminder);
  const updatePersonal = useAppStore((s) => s.updatePersonal);

  return (
    <Group label="Reminders" gap={6}>
      <ToggleRow
        icon="notifications-outline"
        label={t('settings.notifications')}
        sub="An alert before each activity that has a reminder on"
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
      <ToggleRow
        icon="help-circle-outline"
        label="Daily trivia reminder"
        sub={`One question a day at ${TRIVIA_REMINDER.timeLabel}`}
        value={trivia}
        onChange={async (v) => {
          updatePersonal({ triviaReminder: v });
          const ok = await setTriviaReminder(v);
          if (!ok) {
            updatePersonal({ triviaReminder: false });
            toast('Allow notifications in your phone settings to get the reminder', { tone: 'warn', icon: 'notifications-off-outline' });
          }
        }}
      />
      <Button
        label="Send a test reminder"
        variant="soft"
        size="md"
        icon="alarm-outline"
        onPress={() => {
          sendTestReminder(5);
          toast('Arriving in 5 seconds', { icon: 'alarm-outline' });
        }}
        style={{ marginTop: 6 }}
      />
    </Group>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
