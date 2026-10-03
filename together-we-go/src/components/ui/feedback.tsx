/**
 * Global toast + dialog system. Works the same on iOS, Android and web
 * (React Native's Alert is a no-op on web, so we render our own).
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { colors, radius, shadowStrong } from '@/theme';

import { Button } from './Button';
import type { IconName } from './bits';
import { tap } from './Press';
import { T } from './T';

interface ToastState {
  toast: { id: number; text: string; icon: IconName; tone: 'ok' | 'info' | 'warn' } | null;
  show: (text: string, opts?: { icon?: IconName; tone?: 'ok' | 'info' | 'warn' }) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  toast: null,
  show: (text, opts) => set({ toast: { id: Date.now(), text, icon: opts?.icon ?? 'checkmark-circle', tone: opts?.tone ?? 'ok' } }),
  hide: () => set({ toast: null }),
}));

export const toast = (text: string, opts?: { icon?: IconName; tone?: 'ok' | 'info' | 'warn' }) => {
  if (opts?.tone === 'warn') tap('warning');
  useToast.getState().show(text, opts);
};

export function ToastHost() {
  const t = useToast((s) => s.toast);
  const hide = useToast((s) => s.hide);
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!t) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: Platform.OS !== 'web', friction: 8 }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: Platform.OS !== 'web' }).start(() => hide());
    }, 2600);
    return () => clearTimeout(timer);
  }, [t, anim, hide]);

  if (!t) return null;
  const bg = t.tone === 'warn' ? '#3A1F1F' : colors.primaryDark;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.toastWrap,
        { top: insets.top + 10, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] },
      ]}>
      <Pressable onPress={hide} style={[styles.toast, { backgroundColor: bg }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Ionicons name={t.icon} size={18} color={t.tone === 'warn' ? '#FFB4B4' : '#BFE5AE'} />
        <T variant="small" weight="medium" color={colors.white} style={{ flex: 1 }}>
          {t.text}
        </T>
      </Pressable>
    </Animated.View>
  );
}

export interface DialogAction {
  label: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface DialogState {
  dialog: { title: string; message?: string; actions: DialogAction[]; icon?: IconName } | null;
  open: (d: DialogState['dialog']) => void;
  close: () => void;
}

export const useDialog = create<DialogState>((set) => ({
  dialog: null,
  open: (d) => set({ dialog: d }),
  close: () => set({ dialog: null }),
}));

export function showDialog(title: string, message?: string, actions: DialogAction[] = [{ label: 'OK' }], icon?: IconName) {
  useDialog.getState().open({ title, message, actions, icon });
}

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  opts: { confirmLabel?: string; destructive?: boolean } = {},
) {
  showDialog(
    title,
    message,
    [
      { label: 'Cancel', style: 'cancel' },
      { label: opts.confirmLabel ?? 'Confirm', style: opts.destructive ? 'destructive' : 'default', onPress: onConfirm },
    ],
    opts.destructive ? 'warning-outline' : 'help-circle-outline',
  );
}

export function DialogHost() {
  const d = useDialog((s) => s.dialog);
  const close = useDialog((s) => s.close);
  if (!d) return null;
  return (
    <Modal transparent visible animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.dialogBackdrop}>
        <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
          {d.icon ? (
            <View style={styles.dialogIcon}>
              <Ionicons name={d.icon} size={24} color={colors.primary} />
            </View>
          ) : null}
          <T variant="h3" center>
            {d.title}
          </T>
          {d.message ? (
            <T variant="bodySm" color={colors.textSecondary} center style={{ marginTop: 6 }}>
              {d.message}
            </T>
          ) : null}
          <View style={{ gap: 8, marginTop: 18, alignSelf: 'stretch' }}>
            {d.actions.map((a) => (
              <Button
                key={a.label}
                label={a.label}
                size="md"
                variant={a.style === 'cancel' ? 'secondary' : a.style === 'destructive' ? 'danger' : 'primary'}
                onPress={() => {
                  close();
                  a.onPress?.();
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: radius.md,
    maxWidth: 480,
    width: '100%',
    ...shadowStrong,
  },
  dialogBackdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 28 },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 22,
    alignItems: 'center',
    ...shadowStrong,
  },
  dialogIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySofter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
});
