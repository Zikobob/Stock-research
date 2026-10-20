import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Frosted glass for small controls that float over a photo (trip name, 360° button, bell).
 * iOS and the web blur what is behind; Android uses a plain dark tint, which is cheap on low-end phones.
 */
export function Glass({ children, style, intensity = 40 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; intensity?: number }) {
  if (Platform.OS === 'android') return <View style={[style, { backgroundColor: 'rgba(18,18,18,0.55)' }]}>{children}</View>;
  return (
    <BlurView tint="dark" intensity={intensity} style={[style, { overflow: 'hidden' }]}>
      {children}
    </BlurView>
  );
}
