/**
 * The demo crew: friendly canned replies so a trip with no real friends on the other end still feels alive.
 * Never used in a trip that is shared across phones (the real friends answer there).
 */
export function friendReply(text: string, random: () => number = Math.random): string {
  const q = text.toLowerCase();
  if (/food|eat|dinner|lunch|ramen|sushi|hungry/.test(q)) return 'I’m always down for food 😋 count me in!';
  if (/\?$/.test(q.trim())) return 'Good question — let’s ask the assistant or put it to a vote 🗳️';
  if (/late|delay|wait/.test(q)) return 'No stress, we’ll save you a seat 🙌';
  if (/photo|pic|camera/.test(q)) return 'Drop them in the photo dump! 📸';
  if (/money|pay|owe|\$/.test(q)) return 'I’ll log it in Budget so we can settle up later 💸';
  const pool = ['Love it 🔥', 'Works for me 👍', 'Yesss can’t wait!! ✈️', 'Adding it to my calendar 📅', 'Haha same 😂', 'Let’s goooo 🙌'];
  return pool[Math.floor(random() * pool.length)];
}

/** Picks a random group member to reply (70% of the time) and a natural-feeling delay in milliseconds. */
export function planFriendReply<M>(others: M[], random: () => number = Math.random): { friend: M; delay: number } | null {
  if (!others.length || random() >= 0.7) return null;
  return { friend: others[Math.floor(random() * others.length)], delay: 2600 + random() * 1200 };
}
