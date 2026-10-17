import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { PlaceCard } from '@/components/explore';
import { Chip, EmptyState } from '@/components/ui/bits';
import { Header, Screen } from '@/components/ui/Screen';
import { T } from '@/components/ui/T';
import { destinations, exploreCategories, type DestinationTag } from '@/data/destinations';
import { useT } from '@/i18n';
import { useAppStore } from '@/store/useAppStore';
import { MAX_WIDTH, colors, fonts, radius } from '@/theme';

type Sort = 'rating' | 'cheap' | 'name';

export default function Destinations() {
  const t = useT();
  const params = useLocalSearchParams<{ q?: string; cat?: string }>();
  const { width } = useWindowDimensions();
  const favorites = useAppStore((s) => s.favorites);
  const [q, setQ] = useState(params.q ?? '');
  const [cat, setCat] = useState<'all' | DestinationTag | 'fav'>((params.cat as DestinationTag) ?? 'all');
  const [sort, setSort] = useState<Sort>('rating');
  const colW = Math.min(width, MAX_WIDTH) - 40;

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return destinations
      .filter((d) => (cat === 'all' ? true : cat === 'fav' ? favorites.includes(d.id) : d.tags.includes(cat)))
      .filter((d) => !s || `${d.city} ${d.country} ${d.highlights.join(' ')}`.toLowerCase().includes(s))
      .sort((a, b) => (sort === 'rating' ? b.rating - a.rating : sort === 'cheap' ? a.dailyCost - b.dailyCost : a.city.localeCompare(b.city)));
  }, [q, cat, sort, favorites]);

  return (
    <Screen header={<Header title="All destinations" subtitle={`${list.length} places to explore`} />}>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder={t('explore.search')} placeholderTextColor={colors.textMuted} style={styles.input} accessibilityLabel="Search destinations" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }} style={{ marginHorizontal: -20, marginTop: 12 }}>
        <Chip label="★ Favourites" active={cat === 'fav'} onPress={() => setCat('fav')} />
        {exploreCategories.map((c) => (
          <Chip key={c.key} label={t(c.labelKey)} image={c.image} active={cat === c.key} onPress={() => setCat(c.key)} />
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        <T variant="caption" color={colors.textSecondary}>
          Sort by
        </T>
        {(
          [
            ['rating', 'Top rated'],
            ['cheap', 'Budget-friendly'],
            ['name', 'A–Z'],
          ] as [Sort, string][]
        ).map(([k, l]) => (
          <Chip key={k} small label={l} active={sort === k} onPress={() => setSort(k)} />
        ))}
      </View>
      {list.length ? (
        <View style={styles.grid}>
          {list.map((d) => (
            <View key={d.id} style={{ width: (colW - 12) / 2, gap: 4 }}>
              <PlaceCard d={d} height={170} />
              <T variant="caption" color={colors.textSecondary}>
                ~${d.dailyCost}/day · {d.bestMonths.split(',')[0]}
              </T>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState icon="search-outline" title="No matches" body={cat === 'fav' ? 'Tap the ☆ on any place to save it here.' : 'Try another search or category.'} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 48 },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, height: '100%', ...({ outlineStyle: 'none' } as object) },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
