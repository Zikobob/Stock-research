/** Printable trip planner: builds a styled HTML document and prints / saves it as PDF. */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { destinationById } from '@/data/destinations';
import { emergencyByCountry } from '@/data/reference';
import { totalSpent } from '@/store/useAppStore';
import type { Trip } from '@/store/types';
import { durationLabel, money } from '@/utils/format';
import { dayLabel, formatInTz, rangeLabel, time12, tripDays, tzAbbrev, weekdayShort } from '@/utils/time';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function plannerHtml(trip: Trip): string {
  const dest = destinationById(trip.destinationId);
  const tz = dest?.tz ?? 'UTC';
  const name = (id: string) => trip.members.find((m) => m.id === id)?.name ?? 'Member';
  const days = tripDays(trip.startDate, trip.endDate)
    .map((d, i) => {
      const acts = trip.activities.filter((a) => a.date === d).sort((a, b) => a.time.localeCompare(b.time));
      const rows = acts.length
        ? acts
            .map(
              (a) => `<tr><td class="time">${time12(a.time)}</td><td><b>${esc(a.title)}</b><div class="muted">${esc(a.location)} · ${durationLabel(a.durationMin)}${a.costPerPerson ? ` · ${money(a.costPerPerson)}/person` : ''}</div>${a.notes ? `<div class="note">${esc(a.notes)}</div>` : ''}</td><td class="who">${a.assigned.map((x) => esc(name(x).split(' ')[0])).join(', ')}</td><td class="box">☐</td></tr>`,
            )
            .join('')
        : '<tr><td colspan="4" class="muted">Free day — explore at your own pace ✨</td></tr>';
      return `<section class="day"><h3>Day ${i + 1} · ${weekdayShort(d)} ${dayLabel(d)}</h3><table>${rows}</table></section>`;
    })
    .join('');
  const flights = trip.flights
    .slice()
    .sort((a, b) => a.arriveUtc - b.arriveUtc)
    .map((f) => `<tr><td>${esc(name(f.memberId))}</td><td>${esc(f.flightNo)} · ${f.from}→${f.to}</td><td>${f.direction === 'arrival' ? 'Arrives' : 'Departs'} ${formatInTz(f.direction === 'arrival' ? f.arriveUtc : f.departUtc, tz)}</td></tr>`)
    .join('');
  const em = emergencyByCountry[dest?.countryCode ?? ''] ?? emergencyByCountry.DEFAULT;
  const spent = totalSpent(trip);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(trip.name)} — Planner</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1A1C17;margin:28px;font-size:12.5px}
  header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1F4D25;padding-bottom:10px;margin-bottom:16px}
  h1{margin:0;font-size:24px;color:#1F4D25} h2{font-size:15px;margin:18px 0 6px;color:#1F4D25} h3{font-size:13px;margin:14px 0 6px;background:#EAF5E4;padding:6px 10px;border-radius:6px}
  table{width:100%;border-collapse:collapse} td{padding:6px 8px;border-bottom:1px solid #E7E9DF;vertical-align:top}
  .time{width:70px;font-weight:600;white-space:nowrap} .who{width:110px;color:#5F645A} .box{width:20px;font-size:15px}
  .muted{color:#7A7F73;font-size:11.5px} .note{margin-top:3px;font-style:italic;color:#5F645A}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px} .stat{background:#F4F4EE;border-radius:8px;padding:8px 10px}
  .stat b{display:block;font-size:16px;color:#1F4D25} .day{page-break-inside:avoid} footer{margin-top:18px;color:#959A8E;font-size:10.5px;text-align:center}
</style></head><body>
<header><div><h1>${esc(trip.name)}</h1><div class="muted">${esc(dest ? `${dest.city}, ${dest.country}` : '')} · ${rangeLabel(trip.startDate, trip.endDate)} · times in ${tzAbbrev(tz)}</div></div><div class="muted">Invite code <b>${trip.inviteCode}</b></div></header>
<div class="grid">
  <div class="stat">Travellers<b>${trip.members.length}</b>${trip.members.map((m) => esc(m.name.split(' ')[0]) + ' (' + esc(m.role) + ')').join(', ')}</div>
  <div class="stat">Budget<b>${money(spent)} / ${money(trip.budget)}</b>${money(trip.budget / Math.max(1, trip.members.length))} per person</div>
  <div class="stat">Emergency<b>Police ${em.police} · Ambulance ${em.ambulance}</b>${esc(em.tips[0] ?? '')}</div>
</div>
<h2>Day-by-day itinerary</h2>${days}
${flights ? `<h2>Flights & arrivals</h2><table>${flights}</table>` : ''}
<h2>Checklist</h2><table>${trip.tasks.map((k) => `<tr><td class="box">${k.done ? '☑' : '☐'}</td><td>${esc(k.text)}</td><td class="who">${k.assignee ? esc(name(k.assignee).split(' ')[0]) : 'Everyone'}</td></tr>`).join('')}</table>
<footer>Printed from TogetherWeGo · Plan together, travel better</footer>
</body></html>`;
}

export async function printPlanner(trip: Trip) {
  const html = plannerHtml(trip);
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) throw new Error('Pop-up blocked');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
    return;
  }
  await Print.printAsync({ html });
}

export async function sharePlannerPdf(trip: Trip) {
  if (Platform.OS === 'web') return printPlanner(trip);
  const { uri } = await Print.printToFileAsync({ html: plannerHtml(trip) });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${trip.name} planner`, UTI: 'com.adobe.pdf' });
  }
}
