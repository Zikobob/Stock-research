import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Press, tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { Card, SectionHeader } from '@/components/ui/bits';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import type { Trip } from '@/store/types';
import { colors, fonts, radius } from '@/theme';
import { firstError, maxLen, required } from '@/utils/validation';

/** The shared to-do list: tick things off, assign them, add new ones. */
export function ChecklistSection({ trip, onAssign }: { trip: Trip; onAssign: (taskId: string) => void }) {
  const t = useT();
  const s = useAppStore.getState();
  const [task, setTask] = useState('');
  const [taskErr, setTaskErr] = useState<string | null>(null);
  const done = trip.tasks.filter((k) => k.done).length;

  const addTask = () => {
    const e = firstError(task, required('a task'), maxLen(60, 'Task'));
    setTaskErr(e);
    if (e) return tap('warning');
    s.addTask(trip.id, task);
    setTask('');
    tap('success');
  };

  return (
    <>
      <SectionHeader title={t('hub.checklist')} action={t('hub.done', { a: done, b: trip.tasks.length })} style={{ marginTop: 26 }} />
      <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
        {trip.tasks.map((k) => {
          const who = trip.members.find((m) => m.id === k.assignee);
          return (
            <View key={k.id} style={styles.task}>
              <Press onPress={() => s.toggleTask(trip.id, k.id)} accessibilityRole="checkbox" accessibilityState={{ checked: k.done }} accessibilityLabel={k.text} hitSlop={6}>
                <Ionicons name={k.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={k.done ? colors.primary : colors.borderStrong} />
              </Press>
              <Press onPress={() => s.toggleTask(trip.id, k.id)} style={{ flex: 1 }} haptic={false}>
                <T variant="small" color={k.done ? colors.textMuted : colors.text} style={k.done && { textDecorationLine: 'line-through' }}>
                  {k.text}
                </T>
              </Press>
              <Press onPress={() => onAssign(k.id)} hitSlop={6} accessibilityLabel="Assign task">
                <T variant="caption" color={colors.textMuted}>
                  {who ? who.name.split(' ')[0] : 'Everyone'}
                </T>
              </Press>
              <Press onPress={() => s.deleteTask(trip.id, k.id)} hitSlop={6} accessibilityLabel={`Delete task ${k.text}`}>
                <Ionicons name="close" size={16} color={colors.textMuted} />
              </Press>
            </View>
          );
        })}
        <View style={styles.addTask}>
          <TextInput
            value={task}
            onChangeText={(v) => {
              setTask(v);
              if (taskErr) setTaskErr(null);
            }}
            placeholder={t('hub.addTask')}
            placeholderTextColor={colors.textMuted}
            style={[styles.taskInput, taskErr && { borderColor: colors.red }]}
            onSubmitEditing={addTask}
            returnKeyType="done"
            maxLength={70}
            accessibilityLabel="New task"
          />
          <Press onPress={addTask} style={styles.addBtn} accessibilityLabel="Add task">
            <Ionicons name="add" size={20} color={colors.white} />
          </Press>
        </View>
        {taskErr ? (
          <T variant="caption" color={colors.red} style={{ marginBottom: 8 }}>
            {taskErr}
          </T>
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  task: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  addTask: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  taskInput: { flex: 1, height: 42, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardMuted, paddingHorizontal: 12, fontFamily: fonts.regular, color: colors.text },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
