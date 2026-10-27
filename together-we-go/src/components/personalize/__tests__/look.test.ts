import { barcodeWidths, lookLabel, lookNeedsReload, modeAfterPickingTheme, styleCode, type Look } from '../look';

const now: Look & { resolved: 'light' | 'dark' } = { theme: 'amalfi', corners: 'rounded', mode: 'system', resolved: 'light' };

describe('choosing a look', () => {
  it('switches to the dark mode with Grape and leaves the mode alone for every other theme', () => {
    expect(modeAfterPickingTheme('midnight', 'system')).toBe('dark');
    expect(modeAfterPickingTheme('midnight', 'light')).toBe('dark');
    expect(modeAfterPickingTheme('sunset', 'dark')).toBe('dark');
    expect(modeAfterPickingTheme('amalfi', 'system')).toBe('system');
    expect(modeAfterPickingTheme('lagoon', 'light')).toBe('light');
  });

  it('does not restart the app when nothing that shows has changed', () => {
    expect(lookNeedsReload({ theme: 'amalfi', corners: 'rounded', mode: 'system' }, now, false)).toBe(false);
    // "light" on a phone that is in the light mode looks the same as "system"
    expect(lookNeedsReload({ theme: 'amalfi', corners: 'rounded', mode: 'light' }, now, false)).toBe(false);
  });

  it('restarts for a new theme, new corners, or a light or dark that changes what is shown', () => {
    expect(lookNeedsReload({ theme: 'sunset', corners: 'rounded', mode: 'system' }, now, false)).toBe(true);
    expect(lookNeedsReload({ theme: 'amalfi', corners: 'bubbly', mode: 'system' }, now, false)).toBe(true);
    expect(lookNeedsReload({ theme: 'amalfi', corners: 'rounded', mode: 'dark' }, now, false)).toBe(true);
    // "system" on a phone that has gone dark is a different look from the light one on screen
    expect(lookNeedsReload({ theme: 'amalfi', corners: 'rounded', mode: 'system' }, now, true)).toBe(true);
  });

  it('describes a look in a few words, with the theme names the person sees', () => {
    expect(lookLabel({ theme: 'midnight', mode: 'dark' })).toBe('Grape · Dark');
    expect(lookLabel({ theme: 'amalfi', mode: 'system' })).toBe('Limoncello · System');
  });
});

describe('the code printed on the last page', () => {
  it('is three short words in capitals', () => {
    expect(styleCode('amalfi', 'Planner', 'Lively')).toBe('LIM-PLA-LIV');
    expect(styleCode('classic', 'Custom', 'Max')).toBe('INK-CUS-MAX');
  });

  it('draws the same stripes for the same answers and different ones for different answers', () => {
    expect(barcodeWidths('LIM-PLA-LIV')).toEqual(barcodeWidths('LIM-PLA-LIV'));
    expect(barcodeWidths('LIM-PLA-LIV')).not.toEqual(barcodeWidths('TOM-MON-MAX'));
    expect(barcodeWidths('LIM-PLA-LIV')).toHaveLength(34);
    for (const w of barcodeWidths('LIM-PLA-LIV')) expect([1, 2, 3]).toContain(w);
  });
});
