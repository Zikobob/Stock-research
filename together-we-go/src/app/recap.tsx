import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ShareSheet } from '@/components/ShareSheet';
import { NoTrip } from '@/components/trip/NoTrip';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, Pill, type IconName } from '@/components/ui/bits';
import { toast } from '@/components/ui/feedback';
import { Press } from '@/components/ui/Press';
import { FadeIn } from '@/components/ui/motion';
import { Header, Screen } from '@/components/ui/Screen';
import { T, type TProps } from '@/components/ui/T';
import { destinationById } from '@/data/destinations';
import { imageSource } from '@/data/images';
import { settlePlan, totalSpent, tripStatus, useActiveTrip } from '@/store/useAppStore';
import { colors, radius, shadow } from '@/theme';
import { money } from '@/utils/format';
import { distanceKm, kmLabel } from '@/utils/geo';
import { daysBetween, rangeLabel } from '@/utils/time';

/** End-of-trip summary: the "completion" stage of the planning → travel → memories journey. */
export default function Recap() {
  const trip = useActiveTrip();
  const [share, setShare] = useState(false);
  const [rating, setRating] = useState(0);
  if (!trip) return <NoTrip />;

  const dest = destinationById(trip.destinationId)!;
  const status = tripStatus(trip);
  const days = daysBetween(trip.startDate, trip.endDate) + 1;
  const spent = totalSpent(trip);
  const stops = trip.activities.filter((a) => a.lat && a.lng).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const km = stops.reduce((sum, a, i) => (i ? sum + distanceKm(stops[i - 1] as { lat: number; lng: number }, a as { lat: number; lng: number }) : 0), 0);
  const votes = trip.activities.reduce((n, a) => n + Object.keys(a.votes).length, 0) + trip.polls.reduce((n, p) => n + p.options.reduce((m, o) => m + o.votes.length, 0), 0);
  const topPhoto = trip.photos.slice().sort((a, b) => b.likes.length - a.likes.length)[0];
  const topActivity = trip.activities.filter((a) => a.type !== 'transport' && a.type !== 'stay').sort((a, b) => Object.values(b.votes).filter((v) => v === 1).length - Object.values(a.votes).filter((v) => v === 1).length)[0];
  const byCat: Record<string, number> = {};
  trip.expenses.filter((e) => !e.settlement).forEach((e) => (byCat[e.category] = (byCat[e.category] ?? 0) + e.amount));
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const photographer = trip.members
    .map((m) => ({ m, n: trip.photos.filter((p) => p.by === m.id).length }))
    .sort((a, b) => b.n - a.n)[0];
  const owed = settlePlan(trip);

  const perPerson = spent / Math.max(1, trip.members.length);
  const stats: [IconName, string, string][] = [
    ['calendar-outline', `${days}`, 'days'],
    ['flag-outline', `${trip.activities.length}`, 'activities'],
    ['navigate-outline', kmLabel(km), 'between stops'],
    ['wallet-outline', money(spent), 'spent together'],
    ['images-outline', `${trip.photos.length}`, 'photos'],
    ['thumbs-up-outline', `${votes}`, 'votes cast'],
  ];
  const storyStats: [string, string][] = [
    [`${days}`, 'days'],
    [`${trip.activities.length}`, 'activities'],
    [`${trip.photos.length}`, 'photos'],
    [money(perPerson), 'spent each'],
  ];

  const summary = `Our trip “${trip.name}” 🌏 ${days} days in ${dest.city} · ${trip.activities.length} activities · ${trip.photos.length} photos · ${kmLabel(km)} explored · ${money(perPerson)} each. Planned together on TogetherWeGo ✈️`;

  return (
    <Screen header={<Header title="Trip recap" subtitle={status === 'completed' ? 'Your memories, wrapped up' : 'A preview — the full recap unlocks when the trip ends'} />}>
      <View style={{ alignSelf: 'center', marginBottom: 14 }}>
        <Pill label={status === 'completed' ? 'Trip complete 🎉' : status === 'active' ? 'In progress' : 'Coming up'} tone={status === 'completed' ? 'yellow' : 'green'} />
      </View>

      <FadeIn from="scale" style={{ alignItems: 'center' }}>
        <View style={styles.story} accessible accessibilityLabel={`Story card. ${summary}`}>
          <Image source={imageSource(trip.cover)} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.92)']} locations={[0, 0.3, 0.82]} style={StyleSheet.absoluteFill} />
          <View style={styles.storyTag}>
            <Fixed variant="micro" weight="bold" color={colors.onAccent} style={{ letterSpacing: 1.2 }}>
              TRIP RECAP
            </Fixed>
          </View>
          <View style={styles.storyBottom}>
            <Fixed variant="display" color={colors.white} numberOfLines={3} style={{ fontSize: 40, lineHeight: 42 }}>
              {trip.name}
            </Fixed>
            <Fixed variant="small" weight="semibold" color={colors.white} style={{ marginTop: 8 }}>
              {dest.city}, {dest.country}
            </Fixed>
            <Fixed variant="caption" color="rgba(255,255,255,0.75)">
              {rangeLabel(trip.startDate, trip.endDate)}
            </Fixed>
            <View style={styles.storyStats}>
              {storyStats.map(([value, label]) => (
                <View key={label} style={styles.storyStat}>
                  <Fixed variant="headline" color={colors.accent} numberOfLines={1} style={{ fontSize: 24, lineHeight: 28 }}>
                    {value}
                  </Fixed>
                  <Fixed variant="micro" color="rgba(255,255,255,0.8)">
                    {label}
                  </Fixed>
                </View>
              ))}
            </View>
            <View style={styles.storyBrand}>
              <View style={styles.storyLogo}>
                <Ionicons name="airplane" size={11} color={colors.onAccent} />
              </View>
              <Fixed variant="small" weight="extrabold" color={colors.white} style={{ letterSpacing: 0.3 }}>
                TogetherWeGo
              </Fixed>
            </View>
          </View>
        </View>
      </FadeIn>
      <Button label="Share story card" icon="share-social-outline" onPress={() => setShare(true)} style={{ marginTop: 14 }} />

      <View style={styles.grid}>
        {stats.map(([icon, value, label]) => (
          <View key={label} style={styles.stat}>
            <View style={styles.statIcon}>
              <Ionicons name={icon} size={15} color={colors.onAccent} />
            </View>
            <T variant="h3">{value}</T>
            <T variant="caption" color={colors.textSecondary}>
              {label}
            </T>
          </View>
        ))}
      </View>

      <Card style={[styles.card, { marginTop: 14, gap: 12 }]}>
        <T variant="headline" accessibilityRole="header">
          Highlights
        </T>
        {topActivity ? <Highlight icon="trophy-outline" title="Group favourite" body={`${topActivity.title} — ${Object.values(topActivity.votes).filter((v) => v === 1).length}/${trip.members.length} said “I’m in”`} /> : null}
        {topPhoto ? <Highlight icon="heart-outline" title="Most-liked photo" body={`“${topPhoto.caption || 'Untitled'}” · ${topPhoto.likes.length} likes`} /> : null}
        {photographer && photographer.n ? <Highlight icon="camera-outline" title="Chief photographer" body={`${photographer.m.name.split(' ')[0]} with ${photographer.n} photos`} /> : null}
        {topCat ? <Highlight icon="pie-chart-outline" title="Biggest spend" body={`${topCat[0]} · ${money(topCat[1])} (${Math.round((topCat[1] / Math.max(1, spent)) * 100)}%)`} /> : null}
        <Highlight icon="people-outline" title="The crew" body={trip.members.map((m) => `${m.name.split(' ')[0]} (${m.role})`).join(', ')} />
      </Card>

      <Card style={[styles.card, { marginTop: 14, gap: 10 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T variant="headline" accessibilityRole="header">
            Final balances
          </T>
          <Press onPress={() => router.navigate('/(tabs)/budget')} hitSlop={8}>
            <T variant="small" weight="semibold" color={colors.blue}>
              Settle up
            </T>
          </Press>
        </View>
        {owed.length ? (
          owed.slice(0, 4).map((p) => {
            const a = trip.members.find((m) => m.id === p.from);
            const b = trip.members.find((m) => m.id === p.to);
            return (
              <View key={`${p.from}${p.to}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Avatar name={a?.name ?? '?'} src={a?.avatar} size={24} />
                <T variant="small" style={{ flex: 1 }}>
                  {a?.name.split(' ')[0]} → {b?.name.split(' ')[0]}
                </T>
                <T variant="small" weight="semibold">
                  {money(p.amount)}
                </T>
              </View>
            );
          })
        ) : (
          <T variant="small" color={colors.textSecondary}>
            Everyone is square ✅
          </T>
        )}
      </Card>

      <Card style={[styles.card, { marginTop: 14, alignItems: 'center', gap: 8 }]}>
        <T variant="headline" accessibilityRole="header">
          How was the trip?
        </T>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Press
              key={n}
              onPress={() => {
                setRating(n);
                toast(n >= 4 ? 'Saved — sounds like a great trip! 🥳' : 'Thanks for the feedback');
              }}
              accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
              <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={32} color={colors.star} />
            </Press>
          ))}
        </View>
      </Card>

      <Button label="Open the photo dump" icon="images-outline" variant="secondary" onPress={() => router.push('/photos')} style={{ marginTop: 16 }} />
      <ShareSheet visible={share} onClose={() => setShare(false)} title="Share your trip recap" message={summary} preview={summary} />
    </Screen>
  );
}

/** Text for the story card: a fixed-size graphic, so it ignores the text-size setting. */
function Fixed(props: TProps) {
  return <T allowFontScaling={false} {...props} />;
}

function Highlight({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={styles.hlIcon}>
        <Ionicons name={icon} size={16} color={colors.onAccent} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="caption" color={colors.textSecondary}>
          {title}
        </T>
        <T variant="small" weight="semibold">
          {body}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl },
  story: { width: 270, height: 480, borderRadius: 28, overflow: 'hidden', backgroundColor: '#111111', justifyContent: 'space-between', padding: 20 },
  storyTag: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  storyBottom: { gap: 0 },
  storyStats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 8, marginTop: 16 },
  storyStat: { width: '47%', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 12, paddingVertical: 8 },
  storyBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  storyLogo: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  stat: { width: '31.8%', backgroundColor: colors.card, borderRadius: radius.lg, padding: 12, gap: 2, borderWidth: 1, borderColor: colors.border, alignItems: 'flex-start', ...shadow },
  statIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  hlIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
