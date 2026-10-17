import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/bits';
import { T } from '@/components/ui/T';
import { colors } from '@/theme';

/** What an empty Crew chat or an empty Scout AI thread shows. */
export function EmptyChat({ ai }: { ai: boolean }) {
  return ai ? (
    <Card style={styles.intro}>
      <View style={styles.introIcon}>
        <Ionicons name="sparkles" size={20} color={colors.white} />
      </View>
      <T variant="headline">Scout AI</T>
      <T variant="small" color={colors.textSecondary} center>
        Scout AI knows your trip — budget, weather, food nearby, who owes who, flights… Ask away or tap a question below.
      </T>
    </Card>
  ) : (
    <View style={{ alignItems: 'center', padding: 30, gap: 6 }}>
      <Ionicons name="chatbubbles-outline" size={34} color={colors.textMuted} />
      <T variant="title">Say hi to your crew 👋</T>
      <T variant="small" color={colors.textSecondary} center>
        Messages here are shared with everyone on the trip. Switch to Scout AI to ask the assistant.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', gap: 8, paddingVertical: 24, marginTop: 8 },
  introIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
});
