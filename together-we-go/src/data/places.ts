import { destinationById } from './destinations';

export type PlaceCategory =
  | 'food'
  | 'sightseeing'
  | 'adventure'
  | 'culture'
  | 'nightlife'
  | 'shopping'
  | 'relax';

export interface Place {
  id: string;
  destinationId: string;
  name: string;
  area: string;
  category: PlaceCategory;
  /** Typical visit length in minutes. */
  durationMin: number;
  /** Typical cost per person in USD (0 = free). */
  cost: number;
  rating: number;
  lat: number;
  lng: number;
  blurb: string;
}

const P = (
  destinationId: string,
  id: string,
  name: string,
  area: string,
  category: PlaceCategory,
  durationMin: number,
  cost: number,
  rating: number,
  lat: number,
  lng: number,
  blurb: string,
): Place => ({ destinationId, id, name, area, category, durationMin, cost, rating, lat, lng, blurb });

const curated: Place[] = [
  // Tokyo
  P('tokyo', 'tsukiji', 'Tsukiji Outer Market', 'Tsukiji', 'food', 90, 25, 4.7, 35.6655, 139.7707, 'Tamagoyaki, fresh tuna and grilled scallops from 400+ stalls.'),
  P('tokyo', 'sensoji', 'Senso-ji Temple', 'Asakusa', 'culture', 90, 0, 4.8, 35.7148, 139.7967, 'Tokyo’s oldest temple with the iconic Kaminarimon gate.'),
  P('tokyo', 'shibuya-crossing', 'Shibuya Crossing', 'Shibuya', 'sightseeing', 45, 0, 4.6, 35.6595, 139.7005, 'The world’s busiest scramble — best seen from Shibuya Sky.'),
  P('tokyo', 'meiji', 'Meiji Jingu Shrine', 'Harajuku', 'culture', 60, 0, 4.7, 35.6764, 139.6993, 'A forest shrine in the middle of the city.'),
  P('tokyo', 'teamlab', 'teamLab Planets', 'Toyosu', 'culture', 150, 30, 4.8, 35.6492, 139.7898, 'Walk barefoot through immersive digital-art rooms.'),
  P('tokyo', 'hamarikyu', 'Hama-rikyu Gardens', 'Shiodome', 'relax', 50, 2, 4.5, 35.66, 139.7633, 'Edo-era tidal garden with a teahouse on the pond.'),
  P('tokyo', 'skytree', 'Tokyo Skytree', 'Oshiage', 'sightseeing', 90, 25, 4.6, 35.7101, 139.8107, '634 m tower — on clear days you can see Mt Fuji.'),
  P('tokyo', 'gyoen', 'Shinjuku Gyoen', 'Shinjuku', 'relax', 90, 4, 4.7, 35.6852, 139.71, 'Huge garden for a picnic break between neighbourhoods.'),
  P('tokyo', 'omoide', 'Omoide Yokocho', 'Shinjuku', 'food', 60, 20, 4.5, 35.6929, 139.6996, 'Smoky lantern-lit alley of tiny yakitori bars.'),
  P('tokyo', 'akihabara', 'Akihabara Electric Town', 'Akihabara', 'shopping', 120, 0, 4.4, 35.6984, 139.7731, 'Arcades, retro games and anime shops.'),
  P('tokyo', 'odaiba', 'Odaiba Seaside Park', 'Odaiba', 'adventure', 240, 0, 4.4, 35.6298, 139.7745, 'Waterfront boardwalk, Rainbow Bridge views and the Gundam statue.'),
  P('tokyo', 'ichiran', 'Ichiran Ramen Shibuya', 'Shibuya', 'food', 45, 12, 4.5, 35.6612, 139.7016, 'Solo-booth tonkotsu ramen, open 24 hours.'),
  P('tokyo', 'sushi-dai', 'Sushi Dai Toyosu', 'Toyosu', 'food', 60, 45, 4.8, 35.6457, 139.7847, 'Legendary omakase breakfast at the fish market.'),
  P('tokyo', 'tokyo-tower', 'Tokyo Tower', 'Minato', 'sightseeing', 60, 10, 4.5, 35.6586, 139.7454, 'Retro orange landmark with a glass-floor deck.'),
  P('tokyo', 'ueno', 'Ueno Park & Museums', 'Ueno', 'culture', 180, 10, 4.5, 35.7156, 139.7745, 'National Museum, zoo and street-food stalls.'),
  P('tokyo', 'takeshita', 'Takeshita Street', 'Harajuku', 'shopping', 90, 15, 4.3, 35.6716, 139.7036, 'Crêpes, kawaii fashion and people-watching.'),
  P('tokyo', 'golden-gai', 'Golden Gai', 'Shinjuku', 'nightlife', 120, 30, 4.5, 35.6938, 139.7046, '200 micro-bars squeezed into six alleys.'),
  P('tokyo', 'takao', 'Mount Takao Hike', 'Hachioji', 'adventure', 360, 10, 4.7, 35.6251, 139.2436, 'Forest trails, a monkey park and a summit view of Fuji.'),
  P('tokyo', 'imperial', 'Imperial Palace East Gardens', 'Chiyoda', 'sightseeing', 60, 0, 4.4, 35.6852, 139.7528, 'Castle ruins and seasonal blooms — free entry.'),
  P('tokyo', 'gokart', 'Street Go-Kart Tour', 'Shinagawa', 'adventure', 120, 90, 4.6, 35.6284, 139.7387, 'Drive a go-kart past Tokyo Tower in costume.'),
  P('tokyo', 'sumida', 'Sumida River Cruise', 'Asakusa', 'sightseeing', 60, 12, 4.4, 35.7107, 139.7983, 'Water bus from Asakusa to Hama-rikyu.'),
  P('tokyo', 'karaoke', 'Karaoke Kan Shibuya', 'Shibuya', 'nightlife', 120, 20, 4.3, 35.66, 139.6985, 'Private karaoke rooms — perfect for groups.'),
  P('tokyo', 'gonpachi', 'Gonpachi Nishi-Azabu', 'Roppongi', 'food', 90, 35, 4.4, 35.6563, 139.724, 'Izakaya that inspired the Kill Bill fight scene.'),
  P('tokyo', 'afuri', 'Afuri Ramen Ebisu', 'Ebisu', 'food', 45, 13, 4.5, 35.6467, 139.7101, 'Light yuzu-shio ramen, a local favourite.'),
  P('tokyo', 'yanaka', 'Yanaka Ginza', 'Yanaka', 'food', 90, 10, 4.4, 35.7277, 139.766, 'Old-Tokyo shopping street with croquettes and cats.'),
  // Kyoto
  P('kyoto', 'inari', 'Fushimi Inari Taisha', 'Fushimi', 'culture', 150, 0, 4.9, 34.9671, 135.7727, 'Thousands of vermilion torii gates up Mount Inari.'),
  P('kyoto', 'bamboo', 'Arashiyama Bamboo Grove', 'Arashiyama', 'sightseeing', 60, 0, 4.6, 35.017, 135.6713, 'Towering bamboo — go before 8 am to beat crowds.'),
  P('kyoto', 'kiyomizu', 'Kiyomizu-dera', 'Higashiyama', 'culture', 90, 3, 4.8, 34.9949, 135.785, 'Wooden stage temple overlooking the city.'),
  P('kyoto', 'nishiki', 'Nishiki Market', 'Nakagyo', 'food', 90, 20, 4.5, 35.005, 135.7649, '“Kyoto’s kitchen” — skewers, pickles and matcha treats.'),
  P('kyoto', 'kinkakuji', 'Kinkaku-ji (Golden Pavilion)', 'Kita', 'sightseeing', 60, 3, 4.7, 35.0394, 135.7292, 'Gold-leaf pavilion reflected in a mirror pond.'),
  P('kyoto', 'gion', 'Gion Evening Walk', 'Gion', 'culture', 90, 0, 4.6, 35.0037, 135.7788, 'Teahouse lanes where geiko still walk at dusk.'),
  P('kyoto', 'philosopher', 'Philosopher’s Path', 'Sakyo', 'relax', 60, 0, 4.5, 35.0268, 135.7945, 'Canal-side stroll lined with cherry trees.'),
  P('kyoto', 'tea', 'Tea Ceremony Experience', 'Higashiyama', 'culture', 60, 40, 4.8, 34.9986, 135.7809, 'Learn to whisk matcha in a traditional machiya.'),
  P('kyoto', 'pontocho', 'Pontocho Alley Dinner', 'Nakagyo', 'food', 90, 40, 4.5, 35.0058, 135.7708, 'Narrow lane of riverside restaurants.'),
  P('kyoto', 'monkey', 'Iwatayama Monkey Park', 'Arashiyama', 'adventure', 90, 6, 4.5, 35.0108, 135.677, 'Short hike to wild macaques and city views.'),
  P('kyoto', 'hozugawa', 'Hozugawa River Boat Ride', 'Kameoka', 'adventure', 120, 35, 4.6, 35.0128, 135.6744, 'Two-hour wooden boat ride through a gorge.'),
];

const highlightCategories: PlaceCategory[] = ['sightseeing', 'culture', 'food', 'adventure', 'relax'];

/**
 * Curated nearby places for a destination. Destinations without curated data
 * get their highlights placed at deterministic offsets around the centre so
 * the radius filter still behaves sensibly.
 */
export function placesFor(destinationId: string): Place[] {
  const list = curated.filter((p) => p.destinationId === destinationId);
  if (list.length) return list;
  const d = destinationById(destinationId);
  if (!d) return [];
  return d.highlights.map((name, i) => {
    const angle = (i * 137.5 * Math.PI) / 180;
    const km = 1.2 + i * 1.7;
    return P(
      d.id, `${d.id}-h${i}`, name, d.city, highlightCategories[i % highlightCategories.length],
      [90, 120, 60, 240, 90][i % 5], [0, 15, 20, 45, 10][i % 5], 4.5 + ((i * 7) % 5) / 10,
      d.lat + (km / 111) * Math.cos(angle), d.lng + (km / (111 * Math.cos((d.lat * Math.PI) / 180))) * Math.sin(angle),
      `One of ${d.city}’s must-do experiences.`,
    );
  });
}

export const allCuratedPlaces = curated;
