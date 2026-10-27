import { friendReply, planFriendReply } from '../pretendFriends';

describe('friendReply', () => {
  it('answers by topic', () => {
    expect(friendReply('anyone hungry for dinner?')).toMatch(/food/);
    expect(friendReply('what time is the ferry?')).toMatch(/assistant|vote/);
    expect(friendReply('running a bit late')).toMatch(/save you a seat/);
    expect(friendReply('sent you the pics')).toMatch(/photo dump/);
    expect(friendReply('I paid $40 for the taxi')).toMatch(/Budget/);
  });

  it('falls back to a short cheer, chosen by the random number', () => {
    expect(friendReply('see you there', () => 0)).toBe('Love it 🔥');
    expect(friendReply('see you there', () => 0.999)).toBe('Let’s goooo 🙌');
  });
});

describe('planFriendReply', () => {
  it('stays quiet when nobody is there to answer', () => {
    expect(planFriendReply([], () => 0)).toBeNull();
  });

  it('replies about 70% of the time, with a delay of a few seconds', () => {
    expect(planFriendReply(['a', 'b'], () => 0.71)).toBeNull();
    const plan = planFriendReply(['a', 'b'], () => 0.5);
    expect(plan?.friend).toBe('b');
    expect(plan?.delay).toBeGreaterThanOrEqual(2600);
    expect(plan?.delay).toBeLessThanOrEqual(3800);
  });
});
