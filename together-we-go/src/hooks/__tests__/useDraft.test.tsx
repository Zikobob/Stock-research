import { act, create } from 'react-test-renderer';

import { resetDrafts, useDraft } from '../useDraft';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setup(key: string) {
  const latest: { value: string; set: (v: string) => void; clear: () => void } = { value: '', set: () => {}, clear: () => {} };
  function Probe() {
    const [value, set, clear] = useDraft(key, '');
    latest.value = value;
    latest.set = set as (v: string) => void;
    latest.clear = clear;
    return null;
  }
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<Probe />);
  });
  return { latest, tree };
}

describe('useDraft', () => {
  beforeEach(resetDrafts);

  it('gives back what was typed when the form is opened again', () => {
    const first = setup('add-activity');
    act(() => first.latest.set('Sunset boat trip'));
    act(() => first.tree.unmount());
    expect(setup('add-activity').latest.value).toBe('Sunset boat trip');
  });

  it('starts empty again once the form is submitted', () => {
    const first = setup('add-expense');
    act(() => first.latest.set('Pizza'));
    act(() => first.latest.clear());
    act(() => first.tree.unmount());
    expect(setup('add-expense').latest.value).toBe('');
  });

  it('keeps different forms apart', () => {
    const a = setup('a');
    act(() => a.latest.set('one'));
    expect(setup('b').latest.value).toBe('');
  });
});
