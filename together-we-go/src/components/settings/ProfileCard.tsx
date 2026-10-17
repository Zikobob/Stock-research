import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Avatar, Card, Chip } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { Press, tap } from '@/components/ui/Press';
import { T } from '@/components/ui/T';
import { pickImage } from '@/services/files';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import { colors } from '@/theme';
import { maxLen, validateName } from '@/utils/validation';

const AVATARS = ['avatar-maya', 'avatar-diego', 'avatar-priya', 'avatar-sam', 'avatar-ana', 'avatar-noah'];

/** Name, home city, avatar (a built-in one, a photo, or just initials). */
export function ProfileCard() {
  const user = useCurrentUser();
  const updateProfile = useAppStore((s) => s.updateProfile);
  const [name, setName] = useState(user?.name ?? '');
  const [city, setCity] = useState(user?.homeCity ?? '');
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const saveProfile = () => {
    const e = { name: validateName(name), city: maxLen(40, 'City')(city) };
    setErrors(e);
    if (e.name || e.city) return tap('warning');
    updateProfile({ name: name.trim(), homeCity: city.trim() || undefined });
    toast('Profile saved');
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
    <Card style={{ gap: 12 }}>
      <T variant="title">Profile</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={user?.name ?? 'You'} src={user?.avatar} size={60} />
        <View style={{ flex: 1, gap: 6 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {AVATARS.map((a) => (
              <Press key={a} onPress={() => updateProfile({ avatar: a })} accessibilityLabel="Choose this avatar" style={[styles.avatarOpt, user?.avatar === a && { borderColor: colors.primary }]}>
                <Avatar name="Avatar" src={a} size={36} />
              </Press>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip small icon="image-outline" label="Upload photo" onPress={pickAvatarPhoto} />
            <Chip small icon="text-outline" label="Initials" onPress={() => updateProfile({ avatar: undefined })} />
          </View>
        </View>
      </View>
      <Input label="Name" value={name} onChangeText={setName} error={errors.name} icon="person-outline" />
      <Input label="Home city" value={city} onChangeText={setCity} error={errors.city} icon="home-outline" placeholder="e.g. Middletown, DE" />
      <T variant="caption" color={colors.textSecondary}>
        Signed in as {user?.email} · {user?.provider === 'google' ? 'Google' : 'email & password'}
      </T>
      <Button label="Save profile" size="md" onPress={saveProfile} />
    </Card>
  );
}

const styles = StyleSheet.create({
  avatarOpt: { borderRadius: 22, borderWidth: 2, borderColor: 'transparent', padding: 1 },
});
