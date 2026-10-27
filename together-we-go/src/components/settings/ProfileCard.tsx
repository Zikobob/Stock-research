import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Avatar, Card, Chip, Divider } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { pickImage } from '@/services/files';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { colors, line } from '@/theme';
import { maxLen, validateName } from '@/utils/validation';

const AVATARS = ['avatar-maya', 'avatar-diego', 'avatar-priya', 'avatar-sam', 'avatar-ana', 'avatar-noah'];

/** Who you are in one line; tap it to change the name, home city or avatar (a built-in one, a photo, or just initials). */
export function ProfileCard() {
  const user = useCurrentUser();
  const updateProfile = useAppStore((s) => s.updateProfile);
  const [name, setName] = useState(user?.name ?? '');
  const [city, setCity] = useState(user?.homeCity ?? '');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [open, setOpen] = useState(false);

  const saveProfile = () => {
    const e = { name: validateName(name), city: maxLen(40, 'City')(city) };
    setErrors(e);
    if (e.name || e.city) return tap('warning');
    updateProfile({ name: name.trim(), homeCity: city.trim() || undefined });
    toast('Profile saved');
    setOpen(false);
  };

  const pickAvatarPhoto = async () => {
    try {
      const f = await pickImage();
      if (f) {
        updateProfile({ avatar: f.uri });
        toast('Profile photo updated');
      }
    } catch {
      toast('Couldn’t open your photos', { tone: 'warn' });
    }
  };

  return (
    <Card padded={false}>
      <Press onPress={() => setOpen((o) => !o)} style={styles.summary} scaleTo={0.99} accessibilityLabel={open ? 'Close the profile editor' : 'Edit profile'} accessibilityState={{ expanded: open }}>
        <Avatar name={user?.name ?? 'You'} src={user?.avatar} size={48} />
        <View style={{ flex: 1 }}>
          <T variant="title" weight="bold" numberOfLines={1}>
            {user?.name ?? 'You'}
          </T>
          <T variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {[user?.email, user?.homeCity].filter(Boolean).join(' · ')}
          </T>
        </View>
        <T variant="kicker">{open ? 'Close' : 'Edit'}</T>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.ink} />
      </Press>
      {open ? (
        <View style={styles.body}>
          <Divider />
          <T variant="kicker" color={colors.textSecondary}>
            Picture
          </T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {AVATARS.map((a) => {
              const on = user?.avatar === a;
              return (
                <Press
                  key={a}
                  onPress={() => updateProfile({ avatar: a })}
                  accessibilityLabel="Choose this avatar"
                  accessibilityState={{ selected: on }}
                  style={[styles.avatarOpt, on && { backgroundColor: colors.accent }]}>
                  <Avatar name="Avatar" src={a} size={36} />
                </Press>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip small icon="image-outline" label="Upload photo" onPress={pickAvatarPhoto} />
            <Chip small icon="text-outline" label="Initials" onPress={() => updateProfile({ avatar: undefined })} />
          </View>
          <Input label="Name" value={name} onChangeText={setName} error={errors.name} icon="person-outline" style={styles.field} />
          <Input label="Home city" value={city} onChangeText={setCity} error={errors.city} icon="home-outline" placeholder="e.g. Middletown, DE" style={styles.field} />
          <T variant="caption" color={colors.textSecondary}>
            Signed in as {user?.email} · {user?.provider === 'google' ? 'Google' : 'email & password'}
          </T>
          <Button label="Save profile" size="md" onPress={saveProfile} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, minHeight: 80 },
  body: { gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
  field: { minHeight: 44 },
  avatarOpt: { width: 48, height: 48, borderRadius: 24, borderWidth: line, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
