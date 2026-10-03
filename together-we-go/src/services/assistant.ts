/**
 * Trip Assistant.
 * 1. Offline engine (default): intent matching over the live trip data, so it
 *    answers accurately with no internet — important at venues with bad wifi.
 * 2. Claude mode (optional): when a user adds their own Anthropic API key in
 *    Settings, questions go to Claude with the trip as context. Any failure
 *    falls back to the offline engine.
 */
import Anthropic from '@anthropic-ai/sdk';

import { destinationById } from '@/data/destinations';
import { placesFor } from '@/data/places';
import { currencies, emergencyByCountry, phrasebook } from '@/data/reference';
import { balances, settlePlan, totalSpent } from '@/store/useAppStore';
import type { ChatMessage, RatesSnapshot, Trip, WeatherSnapshot } from '@/store/types';
import { durationLabel, money } from '@/utils/format';
import { distanceKm, kmLabel, nearestAirports } from '@/utils/geo';
import { addDays, dayLabel, deviceTimeZone, formatInTz, hoursAhead, partsInTz, time12, todayInTz, tzAbbrev } from '@/utils/time';

import { convert } from './currency';
import { cToF, weatherInfo } from './weather';

export const CLAUDE_MODEL = 'claude-opus-5-5';

export interface AssistantContext {
  trip: Trip;
  userId: string;
  weather?: WeatherSnapshot;
  rates: RatesSnapshot | null;
  homeCurrency: string;
}

const first = (t: Trip, id: string) => t.members.find((m) => m.id === id)?.name.split(' ')[0] ?? 'Someone';

const CURRENCY_WORDS: Record<string, string> = {
  dollar: 'USD', dollars: 'USD', usd: 'USD', $: 'USD', yen: 'JPY', jpy: 'JPY', '¥': 'JPY', euro: 'EUR', euros: 'EUR', eur: 'EUR', '€': 'EUR',
  pound: 'GBP', pounds: 'GBP', gbp: 'GBP', '£': 'GBP', won: 'KRW', krw: 'KRW', baht: 'THB', thb: 'THB', rupee: 'INR', rupees: 'INR', inr: 'INR',
  peso: 'MXN', pesos: 'MXN', mxn: 'MXN', franc: 'CHF', francs: 'CHF', chf: 'CHF', cad: 'CAD', aud: 'AUD', sgd: 'SGD', yuan: 'CNY', cny: 'CNY',
};

function currencyFrom(word: string | undefined): string | undefined {
  if (!word) return undefined;
  const w = word.toLowerCase();
  if (CURRENCY_WORDS[w]) return CURRENCY_WORDS[w];
  const up = w.toUpperCase();
  return currencies.some((c) => c.code === up) ? up : undefined;
}

export function answerLocally(question: string, ctx: AssistantContext): string {
  const q = question.toLowerCase().trim();
  const { trip } = ctx;
  const dest = destinationById(trip.destinationId);
  const tz = dest?.tz ?? 'UTC';
  const spent = totalSpent(trip);
  const per = spent / Math.max(1, trip.members.length);
  const has = (re: RegExp) => re.test(q);

  // Currency conversion: "convert 50 usd to jpy", "how much is 3000 yen"
  const conv = q.match(/([\d][\d,.]*)\s*([a-z$€£¥]{1,8})?\s*(?:to|in|into)?\s*([a-z$€£¥]{3,8})?/);
  if (has(/convert|exchange|how much is|in (yen|dollars|euros|usd|jpy|eur)|→/) && conv) {
    const amount = Number(conv[1].replace(/,/g, ''));
    const from = currencyFrom(conv[2]) ?? (has(/yen|jpy/) && !has(/to (yen|jpy)/) ? 'JPY' : 'USD');
    let to = currencyFrom(conv[3]) ?? (from === (dest?.currency ?? 'JPY') ? ctx.homeCurrency : dest?.currency ?? 'JPY');
    if (to === from) to = from === 'USD' ? dest?.currency ?? 'EUR' : 'USD';
    const out = convert(amount, from, to, ctx.rates);
    return `${money(amount, from, { decimals: true })} ≈ ${money(out, to, { decimals: true })} ${ctx.rates?.live ? '(live rate)' : '(offline reference rate)'}. Tip: the Budget tab has a full converter with home/local view.`;
  }

  if (has(/owe|settle|split|pay (back|me)|who pays|balance/)) {
    const plan = settlePlan(trip);
    if (!plan.length) return 'Everyone is square right now — no one owes anything. 🎉';
    const lines = plan.slice(0, 5).map((p) => `• ${first(trip, p.from)} → ${first(trip, p.to)}: ${money(p.amount, 'USD', { decimals: true })}`);
    const mine = balances(trip)[ctx.userId] ?? 0;
    return `Here’s the simplest way to settle up (${plan.length} transfer${plan.length > 1 ? 's' : ''}):\n${lines.join('\n')}\n\nYou are ${mine >= 0 ? `owed ${money(mine)}` : `owing ${money(-mine)}`}. Tap “Settle up” in Budget to record payments.`;
  }

  if (has(/budget|spent|spend|money|afford|left|expens|cost so far/)) {
    const pct = Math.round((spent / Math.max(1, trip.budget)) * 100);
    const byCat: Record<string, number> = {};
    trip.expenses.filter((e) => !e.settlement).forEach((e) => (byCat[e.category] = (byCat[e.category] ?? 0) + e.amount));
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    const remaining = trip.budget - spent;
    const days = Math.max(1, Math.round((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000) + 1);
    return `You’ve committed ${money(spent)} of ${money(trip.budget)} — about ${pct}% of the group budget (${money(per)} per person). ${top ? `Biggest category: ${top[0]} (${money(top[1])}). ` : ''}${remaining >= 0 ? `${money(remaining)} left ≈ ${money(remaining / days / trip.members.length)} per person per day.` : `You’re ${money(-remaining)} over — Food is usually the easiest place to trim.`}`;
  }

  if (has(/weather|rain|temperature|forecast|umbrella|cold|hot|sunny|snow|degrees/)) {
    const w = ctx.weather;
    if (!w) return `I don’t have a forecast for ${dest?.city ?? 'the destination'} yet — open the Weather screen while online and I’ll remember it for offline use.`;
    const now = weatherInfo(w.current.code);
    const tomorrow = w.daily[1];
    const rainy = w.daily.slice(0, 3).some((d) => d.rain >= 50);
    return `${dest?.city}: ${w.current.temp}°C (${cToF(w.current.temp)}°F), ${now.label.toLowerCase()}. ${tomorrow ? `Tomorrow ${tomorrow.min}–${tomorrow.max}°C, ${tomorrow.rain}% chance of rain. ` : ''}${rainy ? 'Pack an umbrella ☔ — rain is likely in the next few days.' : 'Looks good for walking days. 👟'}${w.live ? '' : ' (estimated — connect to refresh)'}`;
  }

  if (has(/food|eat|restaurant|dinner|lunch|breakfast|ramen|sushi|hungry|snack|cafe|coffee/)) {
    const cheap = has(/cheap|budget|afford|under/);
    const center = dest ? { lat: dest.lat, lng: dest.lng } : null;
    const list = placesFor(trip.destinationId)
      .concat(trip.extraDestinationIds.flatMap((id) => placesFor(id)))
      .filter((p) => p.category === 'food' && (!cheap || p.cost <= 20))
      .map((p) => ({ p, km: center ? distanceKm(center, p) : 0 }))
      .sort((a, b) => b.p.rating - a.p.rating)
      .slice(0, 3);
    if (!list.length) return 'I couldn’t find food spots for this destination yet — try the Nearby screen to widen the radius.';
    return `Top-rated food${cheap ? ' on a budget' : ''} near ${dest?.city}:\n${list
      .map(({ p, km }) => `• ${p.name} (${p.area}) — ★${p.rating}, ~${p.cost ? money(p.cost) : 'free'}/person, ${kmLabel(km)} from centre`)
      .join('\n')}\nWant one added to the itinerary? Open Nearby and tap “Add”.`;
  }

  if (has(/flight|land|arriv|depart|airport|plane/)) {
    const arrivals = trip.flights.filter((f) => f.direction === 'arrival').sort((a, b) => a.arriveUtc - b.arriveUtc);
    const missing = trip.members.filter((m) => !trip.flights.some((f) => f.memberId === m.id)).map((m) => m.name.split(' ')[0]);
    const air = dest ? nearestAirports(dest, 1)[0] : undefined;
    const lines = arrivals.map((f) => `• ${first(trip, f.memberId)} — ${f.flightNo}, lands ${formatInTz(f.arriveUtc, tz)} ${tzAbbrev(tz)}`);
    return `${lines.length ? `Arrivals:\n${lines.join('\n')}` : 'No flights added yet.'}${missing.length ? `\n${missing.join(', ')} still need to add flights.` : ''}${air ? `\nNearest airport to ${dest?.city} centre: ${air.iata} (${air.name}).` : ''}`;
  }

  if (has(/time zone|timezone|what time|jet ?lag|time difference/)) {
    const home = deviceTimeZone();
    const diff = hoursAhead(tz, home);
    const p = partsInTz(Date.now(), tz);
    return `It’s ${time12(p.hhmm)} in ${dest?.city} (${tzAbbrev(tz)}). That’s ${diff === 0 ? 'the same as' : `${Math.abs(diff)}h ${diff > 0 ? 'ahead of' : 'behind'}`} your phone’s time zone. Itinerary times are always shown in local trip time.${Math.abs(diff) >= 6 ? ' Jet-lag tip: get daylight on arrival day and avoid naps over 30 min.' : ''}`;
  }

  if (has(/how (do|to) (i |you |we )?say|translate|phrase|in japanese|in french|in spanish/)) {
    const book = dest ? phrasebook[dest.language] : undefined;
    if (!book) return 'Open the Phrasebook from the menu for common phrases with audio.';
    const hit = book.phrases.find((p) => q.includes(p.en.toLowerCase().replace(/[?!]/g, '').split(' / ')[0]));
    if (hit) return `“${hit.en}” in ${book.lang}: ${hit.local}${hit.roman ? ` (${hit.roman})` : ''}. Tap the speaker in the Phrasebook to hear it.`;
    return `Handy ${book.lang} phrases:\n${book.phrases.slice(0, 4).map((p) => `• ${p.en} — ${p.local}${p.roman ? ` (${p.roman})` : ''}`).join('\n')}`;
  }

  if (has(/emergency|police|hospital|ambulance|lost passport|help me|doctor|stolen/)) {
    const em = emergencyByCountry[dest?.countryCode ?? ''] ?? emergencyByCountry.DEFAULT;
    return `In ${dest?.country ?? 'this country'}: Police ${em.police} · Ambulance ${em.ambulance} · Fire ${em.fire}.\n${em.tips[0] ?? ''}\nThe Emergency screen works offline and can share your location by text.`;
  }

  if (has(/pack|bring|luggage|suitcase/)) {
    const left = trip.packing.filter((p) => !p.packed);
    const rainy = ctx.weather?.daily.slice(0, 5).some((d) => d.rain >= 50);
    return `${left.length ? `Still to pack (${left.length}): ${left.slice(0, 5).map((p) => p.text).join(', ')}${left.length > 5 ? '…' : ''}.` : 'Everything on the packing list is packed! 🎒'}${rainy ? ' Rain is forecast — add an umbrella.' : ''} ${dest?.countryCode === 'JP' ? 'Japan uses type A plugs (100V) and is still cash-friendly — bring a coin purse.' : ''}`.trim();
  }

  if (has(/vote|poll|decide|undecided/)) {
    const open = trip.polls.filter((p) => !p.closed);
    const voting = trip.activities.filter((a) => a.status === 'voting');
    const pollLines = open.map((p) => {
      const leader = p.options.slice().sort((a, b) => b.votes.length - a.votes.length)[0];
      const voted = p.options.some((o) => o.votes.includes(ctx.userId));
      return `• “${p.question}” — leading: ${leader?.text ?? '—'}${voted ? '' : ' (you haven’t voted)'}`;
    });
    return `${pollLines.length ? `Open polls:\n${pollLines.join('\n')}` : 'No open polls.'}${voting.length ? `\nActivities waiting on votes: ${voting.map((a) => a.title).join(', ')}.` : ''}`;
  }

  if (has(/task|checklist|to-?do|remaining|left to do/)) {
    const open = trip.tasks.filter((k) => !k.done);
    if (!open.length) return 'The checklist is all done ✅';
    return `${open.length} task${open.length > 1 ? 's' : ''} left:\n${open.map((k) => `• ${k.text}${k.assignee ? ` — ${first(trip, k.assignee)}` : ''}`).join('\n')}`;
  }

  if (has(/who('s| is)|role|treasurer|navigator|photographer|members?/)) {
    return `Roles for ${trip.name}:\n${trip.members.map((m) => `• ${m.name.split(' ')[0]} — ${m.role}`).join('\n')}\nChange roles in Profile → Members & roles.`;
  }

  const dayMatch = q.match(/day\s*(\d{1,2})/);
  if (has(/next|today|tomorrow|schedule|itinerary|plan for|what('s| is) on/) || dayMatch) {
    const today = todayInTz(tz);
    let target = today;
    if (has(/tomorrow/)) target = addDays(today, 1);
    if (dayMatch) target = addDays(trip.startDate, Number(dayMatch[1]) - 1);
    if (has(/next/) && !dayMatch) {
      const nowP = partsInTz(Date.now(), tz);
      const upcoming = trip.activities
        .filter((a) => a.date > nowP.ymd || (a.date === nowP.ymd && a.time >= nowP.hhmm))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
      if (!upcoming) return 'Nothing else is scheduled — time to plan something fun! Try “suggest something to do”.';
      return `Next up: ${upcoming.title} — ${dayLabel(upcoming.date)} at ${time12(upcoming.time)}, ${upcoming.location} (${durationLabel(upcoming.durationMin)}). ${upcoming.reminder ? 'Reminder is on 🔔' : 'Turn on the bell to get a reminder.'}`;
    }
    if (target < trip.startDate) target = trip.startDate;
    const acts = trip.activities.filter((a) => a.date === target).sort((a, b) => a.time.localeCompare(b.time));
    if (!acts.length) return `${dayLabel(target)} is a free day so far. Want ideas? Ask “what should we do?”`;
    return `${dayLabel(target)}:\n${acts.map((a) => `• ${time12(a.time)} ${a.title}${a.status !== 'confirmed' ? ` (${a.status})` : ''}`).join('\n')}`;
  }

  if (has(/what (should|can|could) we do|idea|suggest|recommend|bored|activity|things to do|adventure|museum|culture|nightlife|shopping/)) {
    const planned = new Set(trip.activities.map((a) => a.placeId));
    const cat = has(/adventure|hike|outdoor/) ? 'adventure' : has(/museum|culture|temple|shrine/) ? 'culture' : has(/night|bar|karaoke/) ? 'nightlife' : has(/shop/) ? 'shopping' : undefined;
    const ideas = placesFor(trip.destinationId)
      .concat(trip.extraDestinationIds.flatMap((id) => placesFor(id)))
      .filter((p) => !planned.has(p.id) && (!cat || p.category === cat))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
    if (!ideas.length) return 'You’ve already planned the top spots! Try the Recommendations survey for new destinations.';
    return `Ideas not on your itinerary yet:\n${ideas.map((p) => `• ${p.name} — ${p.category}, ${durationLabel(p.durationMin)}, ${p.cost ? `${money(p.cost)}/person` : 'free'} (★${p.rating})`).join('\n')}\nAdd one from the Nearby screen or put it to a vote.`;
  }

  if (has(/^(hi|hey|hello|yo|sup|good (morning|evening|afternoon))\b/)) {
    return `Hey! 👋 I’m your Trip Assistant for ${trip.name}. Ask me about the budget, weather, food nearby, flights, what’s next, or “convert 50 USD to ${dest?.currency ?? 'EUR'}”.`;
  }

  return `I can help with: budget & who owes who, weather, food nearby, today’s/tomorrow’s plan, flights & arrivals, currency (“convert 20 USD”), time zones, phrases, packing and emergencies. Try one of the quick questions below!`;
}

function systemPrompt(ctx: AssistantContext): string {
  const { trip } = ctx;
  const dest = destinationById(trip.destinationId);
  const tz = dest?.tz ?? 'UTC';
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? id;
  const acts = trip.activities
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map((a) => `${a.date} ${a.time} | ${a.title} | ${a.location} | ${a.status} | $${a.costPerPerson}/pp | ${durationLabel(a.durationMin)}`)
    .join('\n');
  const flights = trip.flights.map((f) => `${name(f.memberId)} ${f.direction} ${f.flightNo} ${f.from}->${f.to} ${formatInTz(f.direction === 'arrival' ? f.arriveUtc : f.departUtc, tz)}`).join('\n');
  const w = ctx.weather;
  return [
    'You are the Trip Assistant inside TogetherWeGo, a group trip-planning app, replying in the group chat.',
    'Be friendly and concise: 1–4 short sentences or a short bullet list. Use the trip data below; do not invent bookings.',
    'You cannot edit the trip yourself — when someone wants a change, suggest it and point them to the right screen (Itinerary → Add Activity, Budget → Add expense, Profile → polls/checklist).',
    '',
    `Trip: ${trip.name} — ${dest?.city}, ${dest?.country}; ${trip.startDate} to ${trip.endDate}; local time zone ${tz}; today (local) ${todayInTz(tz)}.`,
    `Members: ${trip.members.map((m) => `${m.name} (${m.role})`).join(', ')}.`,
    `Budget: spent $${Math.round(totalSpent(trip))} of $${trip.budget} cap. Expenses: ${trip.expenses.map((e) => `${e.title} $${e.amount} (${e.category}, paid by ${name(e.paidBy)})`).join('; ')}.`,
    w ? `Weather now: ${w.current.temp}°C ${weatherInfo(w.current.code).label}; next days: ${w.daily.slice(0, 4).map((d) => `${d.date} ${d.min}-${d.max}°C rain ${d.rain}%`).join(', ')}.` : '',
    `Itinerary (local times):\n${acts || 'none yet'}`,
    flights ? `Flights:\n${flights}` : '',
    `Open tasks: ${trip.tasks.filter((k) => !k.done).map((k) => k.text).join(', ') || 'none'}.`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function askClaude(apiKey: string, question: string, history: ChatMessage[], ctx: AssistantContext): Promise<string> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 45_000 });
  const recent = history.filter((m) => m.kind !== 'system').slice(-12);
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of recent) {
    if (m.ai) messages.push({ role: 'assistant', content: m.text });
    else messages.push({ role: 'user', content: `${ctx.trip.members.find((x) => x.id === m.authorId)?.name ?? 'Member'}: ${m.text}` });
  }
  while (messages.length && messages[0].role !== 'user') messages.shift();
  messages.push({ role: 'user', content: question });

  const resp = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2048,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: systemPrompt(ctx),
    messages,
  });
  if (resp.stop_reason === 'refusal') throw new Error('refused');
  const text = resp.content
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n')
    .trim();
  if (!text) throw new Error('empty');
  return text;
}
