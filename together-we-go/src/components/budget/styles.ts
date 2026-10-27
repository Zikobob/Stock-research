import { StyleSheet } from 'react-native';

import { colors, hair, line, radius } from '@/theme';

/** Styles shared by the parts of the Budget screen. */
export const styles = StyleSheet.create({
  /** The title row of a block: a serif headline with something small on the right, above an ink rule. */
  sectionTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, minHeight: 36, marginBottom: 8 },
  /** A line of a ledger: the next row gets a hairline above it. */
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  ledgerDivider: { borderTopWidth: hair, borderTopColor: colors.border },
  /** A square outlined icon, like the stamp box in a ticket's corner. */
  iconBox: { width: 40, height: 40, borderRadius: radius.button, borderWidth: line, borderColor: colors.ink, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
