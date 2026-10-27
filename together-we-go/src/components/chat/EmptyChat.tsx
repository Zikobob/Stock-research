import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/bits';

/** What an empty Crew chat or an empty Scout AI thread shows: an invitation to write the first line. */
export function EmptyChat({ ai, onSay }: { ai: boolean; onSay?: (text: string) => void }) {
  return ai ? (
    <EmptyState icon="compass-outline" title="Ask Scout" body="Scout knows your budget, the weather, food nearby, who owes who and your flights. Ask anything, or tap a question below." />
  ) : (
    <EmptyState icon="chatbubbles-outline" title="Say hi to the crew" body="Messages here are shared with everyone on the trip. Switch to Scout AI to ask the assistant.">
      {onSay ? (
        <View style={{ alignItems: 'center' }}>
          <Button label="Say hi" icon="hand-left-outline" variant="secondary" size="md" full={false} onPress={() => onSay('Hi, crew')} />
        </View>
      ) : null}
    </EmptyState>
  );
}
