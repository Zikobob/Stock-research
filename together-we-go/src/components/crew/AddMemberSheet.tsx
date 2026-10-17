import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/feedback';
import { Input } from '@/components/ui/Input';
import { tap } from '@/components/ui/Press';
import { Sheet } from '@/components/ui/Sheet';
import { validateEmail, validateName } from '@/utils/validation';

/** Add someone by name (they can still join with the invite code later). */
export function AddMemberSheet({ visible, onClose, onAdd, onShare }: { visible: boolean; onClose: () => void; onAdd: (name: string, email?: string) => void; onShare: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ name?: string | null; email?: string | null }>({});
  return (
    <Sheet visible={visible} onClose={onClose} title="Add a member" subtitle="Add someone by name, or share the invite code so they can join themselves">
      <Button label="Share invite code instead" variant="soft" icon="share-social-outline" onPress={onShare} />
      <Input label="Name" value={name} onChangeText={setName} error={errors.name} icon="person-outline" autoCapitalize="words" />
      <Input label="Email (optional)" value={email} onChangeText={setEmail} error={errors.email} icon="mail-outline" autoCapitalize="none" keyboardType="email-address" />
      <Button
        label="Add member"
        icon="person-add-outline"
        onPress={() => {
          const e = { name: validateName(name), email: email.trim() ? validateEmail(email) : null };
          setErrors(e);
          if (e.name || e.email) return tap('warning');
          onAdd(name, email);
          toast(`${name.trim().split(' ')[0]} added to the trip`);
          setName('');
          setEmail('');
          onClose();
        }}
      />
    </Sheet>
  );
}
