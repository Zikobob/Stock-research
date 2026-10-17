import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { useAppStore } from '@/store/useAppStore';
import { colors, fonts, radius } from '@/theme';

import { Press } from './Press';
import { T } from './T';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface InputProps extends TextInputProps {
  label?: string;
  /** Show the label inside the field (floating style from the sign-in screen). */
  inlineLabel?: boolean;
  icon?: IconName;
  error?: string | null;
  hint?: string;
  right?: ReactNode;
  secureToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  onPressField?: () => void;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, inlineLabel, icon, error, hint, right, secureToggle, containerStyle, multiline, onPressField, style, secureTextEntry, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const scale = useAppStore((s) => s.settings.textScale);
  const hasValue = !!rest.value;
  const borderColor = error ? colors.red : focused ? colors.primary : colors.border;

  const field = (
    <View
      style={[
        styles.field,
        multiline && styles.multiline,
        { borderColor },
        focused && !error && styles.focused,
        error && styles.errored,
      ]}>
      {icon && <Ionicons name={icon} size={18} color={error ? colors.red : colors.textMuted} style={{ marginRight: 10 }} />}
      <View style={{ flex: 1 }}>
        {inlineLabel && label && (hasValue || focused) ? (
          <T variant="micro" color={colors.textSecondary} style={{ marginBottom: 1 }}>
            {label}
          </T>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          editable={!onPressField}
          pointerEvents={onPressField ? 'none' : 'auto'}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          accessibilityLabel={label}
          {...rest}
          placeholder={inlineLabel && !hasValue && !focused ? label : rest.placeholder}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            { fontSize: 15 * scale },
            multiline && { minHeight: 64, textAlignVertical: 'top' },
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
            style,
          ]}
        />
      </View>
      {secureToggle && (
        <Press accessibilityLabel={hidden ? 'Show password' : 'Hide password'} onPress={() => setHidden((h) => !h)} hitSlop={10}>
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={colors.textMuted} />
        </Press>
      )}
      {right}
    </View>
  );

  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label && !inlineLabel ? (
        <T variant="small" weight="semibold">
          {label}
        </T>
      ) : null}
      {onPressField ? (
        <Press onPress={onPressField} scaleTo={0.99} accessibilityLabel={label}>
          {field}
        </Press>
      ) : (
        field
      )}
      {error ? (
        <T variant="caption" color={colors.red} accessibilityLiveRegion="polite">
          {error}
        </T>
      ) : hint ? (
        <T variant="caption" color={colors.textMuted}>
          {hint}
        </T>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.2,
    backgroundColor: colors.cardMuted,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiline: { alignItems: 'flex-start', paddingVertical: 12 },
  focused: { backgroundColor: colors.white },
  errored: { backgroundColor: '#FFF8F8' },
  input: {
    fontFamily: fonts.regular,
    color: colors.text,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
});
