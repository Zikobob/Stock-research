import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlatePress } from '@/components/ui/Plate';
import { Press, tap } from '@/components/ui/Press';
import { Stamp } from '@/components/ui/Stamp';
import { T } from '@/components/ui/T';
import { Avatar, Card, Divider, EmptyState, ProgressBar, SectionHeader } from '@/components/ui/bits';
import { Input } from '@/components/ui/Input';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import type { Trip } from '@/store/types';
import { colors, line, radius } from '@/theme';
import { firstError, maxLen, required } from '@/utils/validation';

/** The shared to-do list: a count and a bar that fills, big square tick boxes, who is on each job, and a line to add one. */
export function ChecklistSection({ trip, onAssign }: { trip: Trip; onAssign: (taskId: string) => void }) {
  const t = useT();
  const s = useAppStore.getState();
  const [task, setTask] = useState('');
  const [taskErr, setTaskErr] = useState<string | null>(null);
  const done = trip.tasks.filter((k) => k.done).length;
  const total = trip.tasks.length;

  const addTask = () => {
    const e = firstError(task, required('a task'), maxLen(60, 'Task'));
    setTaskErr(e);
    if (e) return tap('warning');
    s.addTask(trip.id, task);
    setTask('');
    tap('success');
  };

  return (
    <View>
      <SectionHeader title={t('hub.checklist')} />
      {total ? (
        <View style={styles.progress} accessible accessibilityLabel={`${done} of ${total} done`}>
          <View style={styles.count}>
            <T variant="title" importantForAccessibility="no">
              <T variant="numeralSm">{done}</T> of <T variant="numeralSm">{total}</T> done
            </T>
            {done === total ? <Stamp label="All done" tone="positive" icon="checkmark" rotate={0} /> : null}
          </View>
          <ProgressBar value={done / total} color={done === total ? colors.positive : colors.accent} />
        </View>
      ) : (
        <EmptyState icon="checkbox-outline" title="Nothing to do yet" body="Add the first job for the crew below." />
      )}
      {total ? (
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {trip.tasks.map((k, i) => {
            const who = trip.members.find((m) => m.id === k.assignee);
            return (
              <View key={k.id}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.task}>
                  <Press onPress={() => s.toggleTask(trip.id, k.id)} accessibilityRole="checkbox" accessibilityState={{ checked: k.done }} accessibilityLabel={k.text} style={styles.hit} scaleTo={0.92}>
                    <View style={[styles.box, k.done && { backgroundColor: colors.accent }]}>{k.done ? <Ionicons name="checkmark" size={20} color={colors.onAccent} /> : null}</View>
                  </Press>
                  <Press onPress={() => s.toggleTask(trip.id, k.id)} style={styles.text} haptic={false} accessibilityRole="none" focusable={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <T variant="bodySm" color={k.done ? colors.textMuted : colors.text} style={k.done && { textDecorationLine: 'line-through' }}>
                      {k.text}
                    </T>
                  </Press>
                  <Press onPress={() => onAssign(k.id)} style={styles.hit} accessibilityLabel={`Assign ${k.text}. Now ${who ? who.name.split(' ')[0] : 'everyone'}`}>
                    {who ? (
                      <Avatar name={who.name} src={who.avatar} size={32} />
                    ) : (
                      <View style={styles.everyone}>
                        <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                      </View>
                    )}
                  </Press>
                  <Press onPress={() => s.deleteTask(trip.id, k.id)} style={styles.hit} accessibilityLabel={`Delete task ${k.text}`}>
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </Press>
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      <View style={styles.add}>
        <Input
          containerStyle={{ flex: 1 }}
          value={task}
          onChangeText={(v) => {
            setTask(v);
            if (taskErr) setTaskErr(null);
          }}
          placeholder={t('hub.addTask')}
          accessibilityLabel="New task"
          error={taskErr}
          onSubmitEditing={addTask}
          returnKeyType="done"
          maxLength={70}
        />
        <PlatePress onPress={addTask} accessibilityLabel="Add task" corner={radius.button} color={colors.accent} style={styles.addBtn}>
          <Ionicons name="add" size={26} color={colors.onPrimary} />
        </PlatePress>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { gap: 10, marginBottom: 16 },
  count: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  task: { flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 4, minHeight: 56 },
  hit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  box: { width: 28, height: 28, borderRadius: radius.xs + 2, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 6 },
  everyone: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.textSecondary, alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 16 },
  addBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderWidth: line, borderColor: colors.ink, borderRadius: radius.button },
});
