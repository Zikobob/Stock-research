import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { PlaceCard } from '@/components/explore';
import { Chip, EmptyState } from '@/components/ui/bits';
import { Input } from '@/components/ui/Input';
import { Header, Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { T } from '@/components/ui/T';
import { destinations, exploreCategories, type DestinationTag } from '@/data/destinations';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { MAX_WIDTH, colors, space } from '@/theme';
import { money } from '@/utils/format';

type Sort = 'rating' | 'cheap' | 'name';

/** The first range of "May–Jun, Sep–Oct": enough for a caption under a photo. */
const firstRange = (months: string) => months.split(',')[0].trim();

/**
 * Every destination as a photo: a search box, the interests as chips, a sort, then two columns of photo cards. Under each photo the
 * daily cost and the best months in mono, the two facts people choose by.
 */
export default function Destinations() {
  const t = useT();
  const params = useLocalSearchParams<{ q?: string; cat?: string }>();
  const { width } = useWindowDimensions();
  const favorites = useAppStore((s) => s.favorites);
  const [q, setQ] = useState(params.q ?? '');
  const [cat, setCat] = useState<'all' | DestinationTag | 'fav'>((params.cat as DestinationTag) ?? 'all');
  const [sort, setSort] = useState<Sort>('rating');
  const colW = Math.min(width, MAX_WIDTH) - 40;
  const cardW = Math.floor((colW - 12) / 2);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return destinations
      .filter((d) => (cat === 'all' ? true : cat === 'fav' ? favorites.includes(d.id) : d.tags.includes(cat)))
      .filter((d) => !s || `${d.city} ${d.country} ${d.highlights.join(' ')}`.toLowerCase().includes(s))
      .sort((a, b) => (sort === 'rating' ? b.rating - a.rating : sort === 'cheap' ? a.dailyCost - b.dailyCost : a.city.localeCompare(b.city)));
  }, [q, cat, sort, favorites]);

  return (
    <Screen header={<Header kicker="Explore" title="Destinations" subtitle={`${list.length} ${list.length === 1 ? 'place' : 'places'} to explore`} />}>
      <Input icon="search" value={q} onChangeText={setQ} placeholder={t('explore.search')} accessibilityLabel="Search destinations" returnKeyType="search" autoCorrect={false} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
        <Chip label="Favourites" icon="star-outline" active={cat === 'fav'} onPress={() => setCat(cat === 'fav' ? 'all' : 'fav')} />
        {exploreCategories.map((c) => (
          <Chip key={c.key} label={t(c.labelKey)} image={c.image} active={cat === c.key} onPress={() => setCat(c.key)} />
        ))}
      </ScrollView>

      <View style={styles.sort}>
        <T variant="kicker" color={colors.textSecondary} style={{ marginBottom: 6 }}>
          Sort by
        </T>
        <Segmented
          value={sort}
          onChange={setSort}
          options={[
            { key: 'rating', label: 'Top rated' },
            { key: 'cheap', label: 'Cheapest' },
            { key: 'name', label: 'A to Z' },
          ]}
        />
      </View>

      {list.length ? (
        <View style={styles.grid}>
          {list.map((d) => (
            <View key={d.id} style={{ width: cardW, gap: 6 }}>
              <PlaceCard d={d} height={176} />
              <T variant="kicker" color={colors.textSecondary} numberOfLines={1}>
                {money(d.dailyCost)}/day · {firstRange(d.bestMonths)}
              </T>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState icon="search-outline" title="No matches" body={cat === 'fav' ? 'Tap the star on any place to save it here.' : 'Try another search or category.'} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // the chips run to the screen edges so they scroll under the margin, not into it
  chipScroll: { marginHorizontal: -20, marginTop: space.lg, flexGrow: 0 },
  chips: { gap: space.sm, paddingHorizontal: 20, paddingRight: 28 },
  sort: { marginTop: space.lg, marginBottom: space.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: space.lg },
});
