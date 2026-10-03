import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';

import { colors } from '@/theme';

import { T } from './ui/T';

/** Brand mark: forest-green tile with a take-off plane (matches the app icon). */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <View
      accessibilityLabel="TogetherWeGo logo"
      style={{ width: size, height: size, borderRadius: size * 0.28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="airplane-takeoff" size={size * 0.56} color={colors.white} />
    </View>
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} />
      <T variant="h3" weight="bold">
        TogetherWeGo
      </T>
    </View>
  );
}
