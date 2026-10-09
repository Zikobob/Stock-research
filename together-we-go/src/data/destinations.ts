import type { PhotoKey } from './images';

export type DestinationTag =
  | 'best'
  | 'adventure'
  | 'food'
  | 'culture'
  | 'beach'
  | 'nature'
  | 'city'
  | 'nightlife'
  | 'romantic'
  | 'family';

export interface Destination {
  id: string;
  city: string;
  country: string;
  countryCode: string;
  image: PhotoKey;
  rating: number;
  reviews: number;
  lat: number;
  lng: number;
  tz: string;
  currency: string;
  airport: string;
  language: string;
  tags: DestinationTag[];
  /** Typical daily spend per traveller in USD (mid-range: food, transit, one paid sight). */
  dailyCost: number;
  priceLevel: 1 | 2 | 3 | 4;
  bestMonths: string;
  blurb: string;
  highlights: string[];
}

export const destinations: Destination[] = [
  {
    id: 'tokyo', city: 'Tokyo', country: 'Japan', countryCode: 'JP', image: 'tokyo', rating: 4.9, reviews: 18420,
    lat: 35.6717, lng: 139.765, tz: 'Asia/Tokyo', currency: 'JPY', airport: 'HND', language: 'Japanese',
    tags: ['best', 'food', 'culture', 'city', 'nightlife', 'family'], dailyCost: 150, priceLevel: 3, bestMonths: 'Mar–May, Oct–Nov',
    blurb: 'Neon skylines, centuries-old shrines and the best food scene on earth — Tokyo rewards every kind of traveller.',
    highlights: ['Senso-ji Temple', 'Shibuya Crossing', 'Tsukiji Outer Market', 'teamLab Planets', 'Meiji Jingu'],
  },
  {
    id: 'kyoto', city: 'Kyoto', country: 'Japan', countryCode: 'JP', image: 'kyoto', rating: 4.8, reviews: 12210,
    lat: 35.0116, lng: 135.7681, tz: 'Asia/Tokyo', currency: 'JPY', airport: 'KIX', language: 'Japanese',
    tags: ['best', 'culture', 'nature', 'romantic'], dailyCost: 130, priceLevel: 3, bestMonths: 'Mar–Apr, Nov',
    blurb: 'Lantern-lit lanes, 1,600 temples and bamboo forests — Japan’s ancient capital moves at a gentler pace.',
    highlights: ['Fushimi Inari Taisha', 'Arashiyama Bamboo Grove', 'Kiyomizu-dera', 'Gion district', 'Nishiki Market'],
  },
  {
    id: 'paris', city: 'Paris', country: 'France', countryCode: 'FR', image: 'paris', rating: 4.8, reviews: 25110,
    lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris', currency: 'EUR', airport: 'CDG', language: 'French',
    tags: ['best', 'food', 'culture', 'city', 'romantic'], dailyCost: 190, priceLevel: 4, bestMonths: 'Apr–Jun, Sep–Oct',
    blurb: 'Café terraces, world-class museums and the Seine at golden hour — Paris never gets old.',
    highlights: ['Eiffel Tower', 'Louvre Museum', 'Montmartre', 'Seine river cruise', 'Le Marais food walk'],
  },
  {
    id: 'bali', city: 'Bali', country: 'Indonesia', countryCode: 'ID', image: 'bali', rating: 4.7, reviews: 15330,
    lat: -8.3405, lng: 115.092, tz: 'Asia/Makassar', currency: 'IDR', airport: 'DPS', language: 'Indonesian',
    tags: ['beach', 'nature', 'adventure', 'culture', 'romantic'], dailyCost: 70, priceLevel: 1, bestMonths: 'Apr–Oct',
    blurb: 'Rice terraces, surf breaks and lake temples — Bali balances adventure and calm.',
    highlights: ['Ulun Danu Beratan Temple', 'Tegallalang Rice Terraces', 'Mount Batur sunrise trek', 'Uluwatu', 'Ubud Monkey Forest'],
  },
  {
    id: 'bangkok', city: 'Bangkok', country: 'Thailand', countryCode: 'TH', image: 'bangkok', rating: 4.7, reviews: 14200,
    lat: 13.7563, lng: 100.5018, tz: 'Asia/Bangkok', currency: 'THB', airport: 'BKK', language: 'Thai',
    tags: ['food', 'culture', 'city', 'nightlife'], dailyCost: 65, priceLevel: 1, bestMonths: 'Nov–Feb',
    blurb: 'Golden temples, floating markets and legendary street food at every corner.',
    highlights: ['Grand Palace', 'Wat Arun', 'Chatuchak Weekend Market', 'Chinatown street food', 'Chao Phraya boat'],
  },
  {
    id: 'singapore', city: 'Singapore', country: 'Singapore', countryCode: 'SG', image: 'singapore', rating: 4.9, reviews: 13020,
    lat: 1.3521, lng: 103.8198, tz: 'Asia/Singapore', currency: 'SGD', airport: 'SIN', language: 'English',
    tags: ['best', 'food', 'city', 'family'], dailyCost: 160, priceLevel: 3, bestMonths: 'Feb–Apr',
    blurb: 'A garden city of hawker centres, futuristic skylines and spotless streets.',
    highlights: ['Gardens by the Bay', 'Marina Bay Sands', 'Hawker centres', 'Sentosa Island', 'Little India'],
  },
  {
    id: 'cape-town', city: 'Cape Town', country: 'South Africa', countryCode: 'ZA', image: 'cape-town', rating: 4.8, reviews: 8800,
    lat: -33.9249, lng: 18.4241, tz: 'Africa/Johannesburg', currency: 'ZAR', airport: 'CPT', language: 'English',
    tags: ['adventure', 'nature', 'beach', 'food'], dailyCost: 90, priceLevel: 2, bestMonths: 'Nov–Mar',
    blurb: 'Table Mountain, penguins on the beach and winelands an hour away.',
    highlights: ['Table Mountain', 'Boulders Beach', 'Cape Point', 'V&A Waterfront', 'Stellenbosch'],
  },
  {
    id: 'new-york', city: 'New York', country: 'United States', countryCode: 'US', image: 'new-york', rating: 4.7, reviews: 30420,
    lat: 40.7128, lng: -74.006, tz: 'America/New_York', currency: 'USD', airport: 'JFK', language: 'English',
    tags: ['city', 'food', 'culture', 'nightlife', 'family'], dailyCost: 230, priceLevel: 4, bestMonths: 'Apr–Jun, Sep–Nov',
    blurb: 'Broadway, bagels and a skyline you’ve seen in a thousand films.',
    highlights: ['Central Park', 'Top of the Rock', 'Brooklyn Bridge', 'The Met', 'Broadway show'],
  },
  {
    id: 'santorini', city: 'Santorini', country: 'Greece', countryCode: 'GR', image: 'santorini', rating: 4.8, reviews: 9900,
    lat: 36.3932, lng: 25.4615, tz: 'Europe/Athens', currency: 'EUR', airport: 'JTR', language: 'Greek',
    tags: ['best', 'beach', 'romantic'], dailyCost: 180, priceLevel: 4, bestMonths: 'May–Jun, Sep',
    blurb: 'Whitewashed villages on a volcanic caldera with the Aegean’s best sunsets.',
    highlights: ['Oia sunset', 'Red Beach', 'Caldera boat tour', 'Akrotiri ruins', 'Fira to Oia hike'],
  },
  {
    id: 'rome', city: 'Rome', country: 'Italy', countryCode: 'IT', image: 'rome', rating: 4.8, reviews: 22340,
    lat: 41.9028, lng: 12.4964, tz: 'Europe/Rome', currency: 'EUR', airport: 'FCO', language: 'Italian',
    tags: ['best', 'culture', 'food', 'city', 'romantic'], dailyCost: 160, priceLevel: 3, bestMonths: 'Apr–Jun, Sep–Oct',
    blurb: '2,700 years of history, perfect carbonara and a fountain on every piazza.',
    highlights: ['Colosseum', 'Vatican Museums', 'Trevi Fountain', 'Trastevere dinner', 'Pantheon'],
  },
  {
    id: 'london', city: 'London', country: 'United Kingdom', countryCode: 'GB', image: 'london', rating: 4.7, reviews: 26800,
    lat: 51.5072, lng: -0.1276, tz: 'Europe/London', currency: 'GBP', airport: 'LHR', language: 'English',
    tags: ['city', 'culture', 'family', 'nightlife'], dailyCost: 210, priceLevel: 4, bestMonths: 'May–Sep',
    blurb: 'Free museums, royal palaces and the Thames winding through it all.',
    highlights: ['Tower of London', 'British Museum', 'Borough Market', 'West End show', 'Camden'],
  },
  {
    id: 'iceland', city: 'Reykjavík', country: 'Iceland', countryCode: 'IS', image: 'iceland', rating: 4.9, reviews: 7300,
    lat: 64.1466, lng: -21.9426, tz: 'Atlantic/Reykjavik', currency: 'ISK', airport: 'KEF', language: 'Icelandic',
    tags: ['adventure', 'nature'], dailyCost: 240, priceLevel: 4, bestMonths: 'Jun–Aug (midnight sun), Sep–Mar (auroras)',
    blurb: 'Canyons, glaciers and northern lights — a road-trip country made for groups.',
    highlights: ['Golden Circle', 'Fjaðrárgljúfur canyon', 'Blue Lagoon', 'Glacier hike', 'Northern lights hunt'],
  },
  {
    id: 'swiss-alps', city: 'Lauterbrunnen', country: 'Switzerland', countryCode: 'CH', image: 'swiss-alps', rating: 4.9, reviews: 6100,
    lat: 46.5935, lng: 7.9091, tz: 'Europe/Zurich', currency: 'CHF', airport: 'ZRH', language: 'German',
    tags: ['best', 'adventure', 'nature', 'family'], dailyCost: 260, priceLevel: 4, bestMonths: 'Jun–Sep, Dec–Mar',
    blurb: 'A valley of 72 waterfalls under the Jungfrau — hiking and rail journeys at their best.',
    highlights: ['Staubbach Falls', 'Jungfraujoch', 'Mürren cliff walk', 'Paragliding Interlaken', 'Trümmelbach Falls'],
  },
  {
    id: 'maldives', city: 'Malé Atoll', country: 'Maldives', countryCode: 'MV', image: 'maldives', rating: 4.9, reviews: 5400,
    lat: 4.1755, lng: 73.5093, tz: 'Indian/Maldives', currency: 'MVR', airport: 'MLE', language: 'Dhivehi',
    tags: ['beach', 'romantic', 'nature'], dailyCost: 320, priceLevel: 4, bestMonths: 'Nov–Apr',
    blurb: 'Overwater villas and reef snorkelling straight from your deck.',
    highlights: ['Reef snorkelling', 'Sandbank picnic', 'Sunset dolphin cruise', 'Local island visit', 'Bioluminescent beach'],
  },
  {
    id: 'machu-picchu', city: 'Cusco', country: 'Peru', countryCode: 'PE', image: 'machu-picchu', rating: 4.9, reviews: 9800,
    lat: -13.1631, lng: -72.545, tz: 'America/Lima', currency: 'PEN', airport: 'CUZ', language: 'Spanish',
    tags: ['best', 'adventure', 'culture', 'nature'], dailyCost: 95, priceLevel: 2, bestMonths: 'May–Sep',
    blurb: 'The Inca citadel in the clouds, reached by train or a four-day trek.',
    highlights: ['Machu Picchu', 'Sacred Valley', 'Rainbow Mountain', 'Inca Trail', 'San Pedro Market'],
  },
  {
    id: 'ha-long-bay', city: 'Ha Long Bay', country: 'Vietnam', countryCode: 'VN', image: 'ha-long-bay', rating: 4.8, reviews: 8700,
    lat: 20.9101, lng: 107.1839, tz: 'Asia/Ho_Chi_Minh', currency: 'VND', airport: 'HAN', language: 'Vietnamese',
    tags: ['nature', 'adventure', 'romantic'], dailyCost: 75, priceLevel: 1, bestMonths: 'Mar–May, Sep–Nov',
    blurb: 'Emerald water and 1,600 limestone islands — best seen from a kayak.',
    highlights: ['Overnight junk cruise', 'Kayak to lagoons', 'Sung Sot Cave', 'Ti Top Island', 'Floating villages'],
  },
  {
    id: 'dubai', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', image: 'dubai', rating: 4.6, reviews: 16900,
    lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai', currency: 'AED', airport: 'DXB', language: 'Arabic',
    tags: ['city', 'adventure', 'family'], dailyCost: 200, priceLevel: 4, bestMonths: 'Nov–Mar',
    blurb: 'Record-breaking towers, desert dunes and souks of gold and spice.',
    highlights: ['Burj Khalifa', 'Desert safari', 'Dubai Marina', 'Gold Souk', 'Museum of the Future'],
  },
  {
    id: 'barcelona', city: 'Barcelona', country: 'Spain', countryCode: 'ES', image: 'barcelona', rating: 4.8, reviews: 21100,
    lat: 41.3874, lng: 2.1686, tz: 'Europe/Madrid', currency: 'EUR', airport: 'BCN', language: 'Spanish',
    tags: ['best', 'beach', 'food', 'culture', 'city', 'nightlife'], dailyCost: 150, priceLevel: 3, bestMonths: 'May–Jun, Sep',
    blurb: 'Gaudí architecture, tapas bars and a city beach in the same afternoon.',
    highlights: ['Sagrada Família', 'Park Güell', 'La Boqueria', 'Gothic Quarter', 'Barceloneta beach'],
  },
  {
    id: 'sydney', city: 'Sydney', country: 'Australia', countryCode: 'AU', image: 'sydney', rating: 4.8, reviews: 14100,
    lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney', currency: 'AUD', airport: 'SYD', language: 'English',
    tags: ['beach', 'city', 'adventure', 'family'], dailyCost: 190, priceLevel: 4, bestMonths: 'Sep–Nov, Mar–May',
    blurb: 'Harbour ferries, coastal walks and surf beaches minutes from the city.',
    highlights: ['Opera House', 'Bondi to Coogee walk', 'Harbour Bridge climb', 'Manly ferry', 'Blue Mountains'],
  },
  {
    id: 'seoul', city: 'Seoul', country: 'South Korea', countryCode: 'KR', image: 'seoul', rating: 4.8, reviews: 11800,
    lat: 37.5665, lng: 126.978, tz: 'Asia/Seoul', currency: 'KRW', airport: 'ICN', language: 'Korean',
    tags: ['food', 'city', 'culture', 'nightlife'], dailyCost: 120, priceLevel: 2, bestMonths: 'Apr–Jun, Sep–Nov',
    blurb: 'Palaces, K-BBQ, night markets and the coolest cafés in Asia.',
    highlights: ['Gyeongbokgung Palace', 'Bukchon Hanok Village', 'Myeongdong street food', 'N Seoul Tower', 'Hongdae nightlife'],
  },
  {
    id: 'istanbul', city: 'Istanbul', country: 'Türkiye', countryCode: 'TR', image: 'istanbul', rating: 4.7, reviews: 13500,
    lat: 41.0082, lng: 28.9784, tz: 'Europe/Istanbul', currency: 'TRY', airport: 'IST', language: 'Turkish',
    tags: ['culture', 'food', 'city'], dailyCost: 85, priceLevel: 2, bestMonths: 'Apr–May, Sep–Nov',
    blurb: 'Where Europe meets Asia: mosques, bazaars and Bosphorus ferries.',
    highlights: ['Blue Mosque', 'Hagia Sophia', 'Grand Bazaar', 'Bosphorus cruise', 'Galata Tower'],
  },
  {
    id: 'amsterdam', city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', image: 'amsterdam', rating: 4.7, reviews: 15200,
    lat: 52.3676, lng: 4.9041, tz: 'Europe/Amsterdam', currency: 'EUR', airport: 'AMS', language: 'Dutch',
    tags: ['city', 'culture', 'romantic'], dailyCost: 180, priceLevel: 3, bestMonths: 'Apr–May, Sep',
    blurb: 'Canal-side bikes, golden-age art and the coziest cafés in Europe.',
    highlights: ['Rijksmuseum', 'Anne Frank House', 'Canal cruise', 'Vondelpark', 'Jordaan'],
  },
  {
    id: 'prague', city: 'Prague', country: 'Czechia', countryCode: 'CZ', image: 'prague', rating: 4.8, reviews: 12400,
    lat: 50.0755, lng: 14.4378, tz: 'Europe/Prague', currency: 'CZK', airport: 'PRG', language: 'Czech',
    tags: ['culture', 'city', 'romantic', 'nightlife'], dailyCost: 95, priceLevel: 2, bestMonths: 'Apr–Jun, Sep–Oct',
    blurb: 'A fairytale old town of spires and the Charles Bridge at dawn.',
    highlights: ['Charles Bridge', 'Prague Castle', 'Old Town Square', 'Astronomical Clock', 'Letná beer garden'],
  },
  {
    id: 'lisbon', city: 'Lisbon', country: 'Portugal', countryCode: 'PT', image: 'lisbon', rating: 4.8, reviews: 13900,
    lat: 38.7223, lng: -9.1393, tz: 'Europe/Lisbon', currency: 'EUR', airport: 'LIS', language: 'Portuguese',
    tags: ['food', 'culture', 'city', 'beach'], dailyCost: 120, priceLevel: 2, bestMonths: 'Mar–Jun, Sep–Oct',
    blurb: 'Yellow trams, pastel de nata and miradouros over terracotta rooftops.',
    highlights: ['Tram 28', 'Belém Tower', 'Alfama fado night', 'Sintra day trip', 'Time Out Market'],
  },
  {
    id: 'banff', city: 'Banff', country: 'Canada', countryCode: 'CA', image: 'banff', rating: 4.9, reviews: 8200,
    lat: 51.1784, lng: -115.5708, tz: 'America/Edmonton', currency: 'CAD', airport: 'YYC', language: 'English',
    tags: ['adventure', 'nature', 'family'], dailyCost: 170, priceLevel: 3, bestMonths: 'Jun–Sep',
    blurb: 'Turquoise glacier lakes framed by the Canadian Rockies.',
    highlights: ['Moraine Lake', 'Lake Louise', 'Icefields Parkway', 'Johnston Canyon', 'Banff Gondola'],
  },
  {
    id: 'marrakech', city: 'Marrakech', country: 'Morocco', countryCode: 'MA', image: 'marrakech', rating: 4.6, reviews: 9100,
    lat: 31.6295, lng: -7.9811, tz: 'Africa/Casablanca', currency: 'MAD', airport: 'RAK', language: 'Arabic',
    tags: ['culture', 'food', 'adventure'], dailyCost: 70, priceLevel: 1, bestMonths: 'Mar–May, Sep–Nov',
    blurb: 'Spice-scented souks, riads with hidden courtyards and Atlas mountain day trips.',
    highlights: ['Jemaa el-Fnaa', 'Jardin Majorelle', 'Medina souks', 'Atlas Mountains', 'Agafay desert dinner'],
  },
  {
    id: 'rio', city: 'Rio de Janeiro', country: 'Brazil', countryCode: 'BR', image: 'rio', rating: 4.7, reviews: 10600,
    lat: -22.9068, lng: -43.1729, tz: 'America/Sao_Paulo', currency: 'BRL', airport: 'GIG', language: 'Portuguese',
    tags: ['beach', 'adventure', 'nightlife', 'nature'], dailyCost: 90, priceLevel: 2, bestMonths: 'Dec–Mar',
    blurb: 'Sugarloaf sunsets, samba and the world’s most famous beaches.',
    highlights: ['Sugarloaf Mountain', 'Christ the Redeemer', 'Copacabana', 'Selarón Steps', 'Tijuca Forest hike'],
  },
  {
    id: 'mexico-city', city: 'Mexico City', country: 'Mexico', countryCode: 'MX', image: 'mexico-city', rating: 4.7, reviews: 11300,
    lat: 19.4326, lng: -99.1332, tz: 'America/Mexico_City', currency: 'MXN', airport: 'MEX', language: 'Spanish',
    tags: ['food', 'culture', 'city', 'nightlife'], dailyCost: 80, priceLevel: 2, bestMonths: 'Mar–May, Oct–Nov',
    blurb: 'Tacos al pastor, Aztec ruins and colourful neighbourhoods like Coyoacán.',
    highlights: ['Teotihuacán pyramids', 'Frida Kahlo Museum', 'Xochimilco boats', 'Zócalo', 'Street-taco crawl'],
  },
  {
    id: 'grand-canyon', city: 'Grand Canyon', country: 'United States', countryCode: 'US', image: 'grand-canyon', rating: 4.9, reviews: 9600,
    lat: 36.0544, lng: -112.1401, tz: 'America/Phoenix', currency: 'USD', airport: 'PHX', language: 'English',
    tags: ['adventure', 'nature', 'family'], dailyCost: 140, priceLevel: 2, bestMonths: 'Mar–May, Sep–Nov',
    blurb: 'A mile-deep canyon carved over six million years — sunrise here is unforgettable.',
    highlights: ['South Rim sunrise', 'Bright Angel Trail', 'Desert View Watchtower', 'Horseshoe Bend', 'Skywalk'],
  },
  {
    id: 'cinque-terre', city: 'Cinque Terre', country: 'Italy', countryCode: 'IT', image: 'cinque-terre', rating: 4.8, reviews: 7800,
    lat: 44.1461, lng: 9.6439, tz: 'Europe/Rome', currency: 'EUR', airport: 'PSA', language: 'Italian',
    tags: ['beach', 'nature', 'romantic', 'food'], dailyCost: 150, priceLevel: 3, bestMonths: 'May–Jun, Sep',
    blurb: 'Five cliffside villages linked by hiking trails and pesto-scented harbours.',
    highlights: ['Sentiero Azzurro hike', 'Manarola at dusk', 'Vernazza harbour', 'Boat between villages', 'Pesto class'],
  },
  {
    id: 'venice', city: 'Venice', country: 'Italy', countryCode: 'IT', image: 'venice', rating: 4.7, reviews: 16300,
    lat: 45.4408, lng: 12.3155, tz: 'Europe/Rome', currency: 'EUR', airport: 'VCE', language: 'Italian',
    tags: ['romantic', 'culture', 'city'], dailyCost: 190, priceLevel: 4, bestMonths: 'Apr–Jun, Sep–Oct',
    blurb: 'Gondolas, glass-blowing islands and a city floating on 118 islets.',
    highlights: ['Grand Canal gondola', 'St Mark’s Basilica', 'Burano island', 'Rialto Market', 'Doge’s Palace'],
  },
  {
    id: 'mount-fuji', city: 'Fujiyoshida', country: 'Japan', countryCode: 'JP', image: 'mount-fuji', rating: 4.9, reviews: 6900,
    lat: 35.4875, lng: 138.7976, tz: 'Asia/Tokyo', currency: 'JPY', airport: 'HND', language: 'Japanese',
    tags: ['best', 'nature', 'adventure', 'culture'], dailyCost: 120, priceLevel: 2, bestMonths: 'Apr, Jul–Aug (climb), Nov',
    blurb: 'Chureito Pagoda framing Japan’s sacred peak — an easy day trip from Tokyo.',
    highlights: ['Chureito Pagoda', 'Lake Kawaguchiko', 'Oshino Hakkai', 'Fuji Five Lakes cycling', 'Summit climb (Jul–Aug)'],
  },
];

export const destinationById = (id: string) => destinations.find((d) => d.id === id);

export interface FeaturedDestination {
  id: string;
  destinationId: string;
  headline: string;
  image: PhotoKey;
  days: number;
  fromPrice: number;
  tags: string[];
}

export const featured: FeaturedDestination[] = [
  {
    id: 'f1', destinationId: 'ha-long-bay', headline: 'Emerald Waters,\nTimeless Beauty', image: 'ha-long-bay',
    days: 5, fromPrice: 890, tags: ['5 days', 'Kayaking', 'Scenic', 'Group-friendly'],
  },
  {
    id: 'f2', destinationId: 'mount-fuji', headline: 'Pagodas &\nSnow-capped Peaks', image: 'fuji-blossom',
    days: 3, fromPrice: 420, tags: ['3 days', 'Culture', 'Photo spots', 'Day trip'],
  },
  {
    id: 'f3', destinationId: 'maldives', headline: 'Lagoons Made\nfor Slowing Down', image: 'lagoon',
    days: 6, fromPrice: 1890, tags: ['6 days', 'Snorkel', 'Beach', 'Relax'],
  },
];

export const exploreCategories: { key: 'all' | DestinationTag; labelKey: string; image: PhotoKey }[] = [
  { key: 'all', labelKey: 'cat.all', image: 'tokyo-skyline' },
  { key: 'best', labelKey: 'cat.best', image: 'santorini' },
  { key: 'adventure', labelKey: 'cat.adventure', image: 'banff' },
  { key: 'food', labelKey: 'cat.food', image: 'ramen' },
  { key: 'culture', labelKey: 'cat.culture', image: 'kyoto' },
  { key: 'beach', labelKey: 'cat.beach', image: 'maldives' },
  { key: 'nature', labelKey: 'cat.nature', image: 'iceland' },
  { key: 'nightlife', labelKey: 'cat.nightlife', image: 'shibuya' },
];
