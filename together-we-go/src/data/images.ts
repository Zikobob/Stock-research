/**
 * Bundled photography (Unsplash License — see ATTRIBUTIONS.md).
 * Images ship inside the app so Explore, onboarding and the photo dump
 * look complete even with no internet connection.
 */
import type { ImageSourcePropType } from 'react-native';

export const photos = {
  tokyo: require('@/assets/images/photos/tokyo.jpg'),
  kyoto: require('@/assets/images/photos/kyoto.jpg'),
  paris: require('@/assets/images/photos/paris.jpg'),
  bali: require('@/assets/images/photos/bali.jpg'),
  bangkok: require('@/assets/images/photos/bangkok.jpg'),
  singapore: require('@/assets/images/photos/singapore.jpg'),
  'cape-town': require('@/assets/images/photos/cape-town.jpg'),
  'new-york': require('@/assets/images/photos/new-york.jpg'),
  santorini: require('@/assets/images/photos/santorini.jpg'),
  rome: require('@/assets/images/photos/rome.jpg'),
  london: require('@/assets/images/photos/london.jpg'),
  iceland: require('@/assets/images/photos/iceland.jpg'),
  'swiss-alps': require('@/assets/images/photos/swiss-alps.jpg'),
  maldives: require('@/assets/images/photos/maldives.jpg'),
  'machu-picchu': require('@/assets/images/photos/machu-picchu.jpg'),
  'ha-long-bay': require('@/assets/images/photos/ha-long-bay.jpg'),
  dubai: require('@/assets/images/photos/dubai.jpg'),
  barcelona: require('@/assets/images/photos/barcelona.jpg'),
  sydney: require('@/assets/images/photos/sydney.jpg'),
  seoul: require('@/assets/images/photos/seoul.jpg'),
  istanbul: require('@/assets/images/photos/istanbul.jpg'),
  amsterdam: require('@/assets/images/photos/amsterdam.jpg'),
  prague: require('@/assets/images/photos/prague.jpg'),
  lisbon: require('@/assets/images/photos/lisbon.jpg'),
  banff: require('@/assets/images/photos/banff.jpg'),
  marrakech: require('@/assets/images/photos/marrakech.jpg'),
  rio: require('@/assets/images/photos/rio.jpg'),
  'mexico-city': require('@/assets/images/photos/mexico-city.jpg'),
  'grand-canyon': require('@/assets/images/photos/grand-canyon.jpg'),
  'cinque-terre': require('@/assets/images/photos/cinque-terre.jpg'),
  venice: require('@/assets/images/photos/venice.jpg'),
  'mount-fuji': require('@/assets/images/photos/mount-fuji.jpg'),
  'onboard-1': require('@/assets/images/photos/onboard-1.jpg'),
  'onboard-2': require('@/assets/images/photos/onboard-2.jpg'),
  'onboard-3': require('@/assets/images/photos/onboard-3.jpg'),
  lagoon: require('@/assets/images/photos/lagoon.jpg'),
  shibuya: require('@/assets/images/photos/shibuya.jpg'),
  akihabara: require('@/assets/images/photos/akihabara.jpg'),
  'fushimi-inari': require('@/assets/images/photos/fushimi-inari.jpg'),
  'omoide-yokocho': require('@/assets/images/photos/omoide-yokocho.jpg'),
  'lantern-alley': require('@/assets/images/photos/lantern-alley.jpg'),
  'fuji-blossom': require('@/assets/images/photos/fuji-blossom.jpg'),
  'tokyo-skyline': require('@/assets/images/photos/tokyo-skyline.jpg'),
  'kyoto-skyline': require('@/assets/images/photos/kyoto-skyline.jpg'),
  sushi: require('@/assets/images/photos/sushi.jpg'),
  ramen: require('@/assets/images/photos/ramen.jpg'),
  planning: require('@/assets/images/photos/planning.jpg'),
  'avatar-maya': require('@/assets/images/photos/avatar-maya.jpg'),
  'avatar-diego': require('@/assets/images/photos/avatar-diego.jpg'),
  'avatar-priya': require('@/assets/images/photos/avatar-priya.jpg'),
  'avatar-sam': require('@/assets/images/photos/avatar-sam.jpg'),
  'avatar-ana': require('@/assets/images/photos/avatar-ana.jpg'),
  'avatar-noah': require('@/assets/images/photos/avatar-noah.jpg'),
} as const satisfies Record<string, ImageSourcePropType>;

export type PhotoKey = keyof typeof photos;

/** Accepts either a bundled photo key or a file/remote URI. */
export function imageSource(ref: string | undefined | null): ImageSourcePropType | undefined {
  if (!ref) return undefined;
  if (ref in photos) return photos[ref as PhotoKey];
  return { uri: ref };
}
