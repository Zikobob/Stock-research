import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { T } from '@/components/ui/T';
import { toast } from '@/components/ui/feedback';
import { tap } from '@/components/ui/Press';
import type { Trip } from '@/store/types';
import { useAppStore } from '@/store/useAppStore';
import { money } from '@/utils/format';
import { parseAmount, validateAmount } from '@/utils/validation';

import { AmountField } from './AmountField';

/** Changes the group's budget: one amount in US dollars. Opened by tapping the budget on the summary. */
export function BudgetCapSheet({ visible, onClose, trip }: { visible: boolean; onClose: () => void; trip: Trip }) {
  const updateTrip = useAppStore((s) => s.updateTrip);
  // Until the person types, the field shows the trip's current budget (so a change from another phone shows up here too).
  const [typed, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const text = typed ?? String(trip.budget);

  const close = () => {
    setTyped(null);
    setError(null);
    onClose();
  };
  const save = () => {
    const e = validateAmount(text, { min: 1, max: 1_000_000, label: 'a budget' });
    setError(e);
    if (e) return tap('warning');
    const v = parseAmount(text)!;
    updateTrip(trip.id, { budget: v });
    toast(`Budget set to ${money(v)}`);
    close();
  };

  return (
    <Sheet visible={visible} onClose={close} title="Group budget" footer={<Button label="Save budget" icon="checkmark" onPress={save} testID="budget-cap-save" />}>
      <T variant="kicker">Group budget cap in USD</T>
      <AmountField value={text} onChange={(v) => setTyped(v.replace(/[^0-9.,]/g, ''))} symbol="$" label="Group budget cap in USD" error={error} onSubmit={save} testID="budget-cap" />
    </Sheet>
  );
}
