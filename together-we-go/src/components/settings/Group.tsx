import type { ReactNode } from 'react';
import { View } from 'react-native';

import { T } from '@/components/ui/T';
import { colors } from '@/theme';

/** One labelled group inside a card: a small caps label over its controls (Language, Reminders, Text and touch). */
export function Group({ label, children, gap = 10 }: { label: string; children: ReactNode; gap?: number }) {
  return (
    <View style={{ gap }}>
      <T variant="kicker" color={colors.textSecondary} accessibilityRole="header">
        {label}
      </T>
      {children}
    </View>
  );
}
