# Attributions, sources & licences

TogetherWeGo was written for the FBLA Mobile Application Development event (2026–27). This file documents every third-party library, data source, font, icon set and image used, as required by the rating sheet’s *Documentation and copyright compliance* item.

## Starter template
The project was scaffolded with `npx create-expo-app` (default template, MIT licence — see `LICENSE`, © 650 Industries / Expo). The template’s example screens were removed; all screens, components, data and services in `src/` are original work for this project.

## Libraries (all open source)
| Package | Version | Licence |
|---|---|---|
| `expo` (SDK 57) and Expo modules: `expo-router`, `expo-notifications`, `expo-location`, `expo-image`, `expo-image-picker`, `expo-document-picker`, `expo-file-system`, `expo-print`, `expo-sharing`, `expo-speech`, `expo-crypto`, `expo-secure-store`, `expo-clipboard`, `expo-haptics`, `expo-linear-gradient`, `expo-linking`, `expo-localization`, `expo-asset`, `expo-font`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`, `expo-constants` | 57.x | MIT |
| `react`, `react-dom` | 19.2.3 | MIT |
| `react-native` | 0.86.3 | MIT |
| `react-native-web` | 0.21.3 | MIT |
| `react-native-maps` | 1.27.2 | MIT |
| `react-native-safe-area-context`, `react-native-screens`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets` | — | MIT |
| `@react-native-async-storage/async-storage` | 2.2.0 | MIT |
| `zustand` | 5.0.15 | MIT |
| `immer` | 11.1.21 | MIT |
| `@expo/vector-icons` (Ionicons, Material Community Icons) | 15.1.1 | MIT |
| `@expo-google-fonts/outfit` (Outfit typeface by Rodrigo Fuenzalida) | 0.4.3 | MIT (package) / SIL Open Font License 1.1 (font) |
| `@anthropic-ai/sdk` (optional Claude mode) | 0.131.0 | MIT |

## APIs & data
| Data | Source | Terms |
|---|---|---|
| Weather forecasts | [Open-Meteo](https://open-meteo.com) | Free, no key, CC BY 4.0 attribution |
| Exchange rates | [ExchangeRate-API open endpoint](https://www.exchangerate-api.com/docs/free) (`open.er-api.com`) | Free with attribution; cached for 6 h |
| Maps (phone) | Apple Maps (iOS) / Google Maps (Android) via react-native-maps | Platform map terms |
| Maps (web preview) | [OpenStreetMap](https://www.openstreetmap.org/copyright) embed | © OpenStreetMap contributors, ODbL |
| Airport coordinates & codes | Public IATA codes and coordinates (compiled by hand, 100+ airports) | Factual data |
| Emergency numbers | Official tourism / government pages, e.g. [JNTO emergency numbers](https://www.jnto.go.jp/safety-tips/eng/emergency-numbers.html) | Factual data |
| Destination & place facts | Summarised in our own words from public tourism information | Original text |
| AI chatbot (optional) | [Anthropic Claude API](https://docs.claude.com) — only when a user adds their own API key | Anthropic usage policies |

The built-in offline Trip Assistant is original rule-based code (`src/services/assistant.ts`) that reads the trip’s own data.

## Photography
All photos are from [Unsplash](https://unsplash.com) and used under the [Unsplash License](https://unsplash.com/license) (free for commercial and non-commercial use, no permission needed). They are bundled in `assets/images/photos/` (resized/compressed) so the app looks complete offline. Source URLs:

| File | Source |
|---|---|
| `tokyo.jpg` | https://images.unsplash.com/photo-1536098561742-ca998e48cbcc |
| `kyoto.jpg` | https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e |
| `paris.jpg` | https://images.unsplash.com/photo-1502602898657-3e91760cbb34 |
| `bali.jpg` | https://images.unsplash.com/photo-1537996194471-e657df975ab4 |
| `bangkok.jpg` | https://images.unsplash.com/photo-1563492065599-3520f775eeed |
| `singapore.jpg` | https://images.unsplash.com/photo-1525625293386-3f8f99389edd |
| `cape-town.jpg` | https://images.unsplash.com/photo-1580060839134-75a5edca2e99 |
| `new-york.jpg` | https://images.unsplash.com/photo-1534430480872-3498386e7856 |
| `santorini.jpg` | https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e |
| `rome.jpg` | https://images.unsplash.com/photo-1552832230-c0197dd311b5 |
| `london.jpg` | https://images.unsplash.com/photo-1513635269975-59663e0ac1ad |
| `iceland.jpg` | https://images.unsplash.com/photo-1504893524553-b855bce32c67 |
| `swiss-alps.jpg` | https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99 |
| `maldives.jpg` | https://images.unsplash.com/photo-1514282401047-d79a71a590e8 |
| `machu-picchu.jpg` | https://images.unsplash.com/photo-1526392060635-9d6019884377 |
| `ha-long-bay.jpg` | https://images.unsplash.com/photo-1528127269322-539801943592 |
| `dubai.jpg` | https://images.unsplash.com/photo-1512453979798-5ea266f8880c |
| `barcelona.jpg` | https://images.unsplash.com/photo-1583422409516-2895a77efded |
| `sydney.jpg` | https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9 |
| `seoul.jpg` | https://images.unsplash.com/photo-1517154421773-0529f29ea451 |
| `istanbul.jpg` | https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b |
| `amsterdam.jpg` | https://images.unsplash.com/photo-1534351590666-13e3e96b5017 |
| `prague.jpg` | https://images.unsplash.com/photo-1519677100203-a0e668c92439 |
| `lisbon.jpg` | https://images.unsplash.com/photo-1585208798174-6cedd86e019a |
| `banff.jpg` | https://images.unsplash.com/photo-1561134643-668f9057cce4 |
| `marrakech.jpg` | https://images.unsplash.com/photo-1597212618440-806262de4f6b |
| `rio.jpg` | https://images.unsplash.com/photo-1483729558449-99ef09a8c325 |
| `mexico-city.jpg` | https://images.unsplash.com/photo-1512813195386-6cf811ad3542 |
| `grand-canyon.jpg` | https://images.unsplash.com/photo-1615551043360-33de8b5f410c |
| `cinque-terre.jpg` | https://images.unsplash.com/photo-1499678329028-101435549a4e |
| `venice.jpg` | https://images.unsplash.com/photo-1514890547357-a9ee288728e0 |
| `mount-fuji.jpg` | https://images.unsplash.com/photo-1528164344705-47542687000d |
| `onboard-1.jpg` | https://images.unsplash.com/photo-1501555088652-021faa106b9b |
| `onboard-2.jpg` | https://images.unsplash.com/photo-1469854523086-cc02fe5d8800 |
| `onboard-3.jpg` | https://images.unsplash.com/photo-1507525428034-b723cf961d3e |
| `lagoon.jpg` | https://images.unsplash.com/photo-1506929562872-bb421503ef21 |
| `shibuya.jpg` | https://images.unsplash.com/photo-1542051841857-5f90071e7989 |
| `akihabara.jpg` | https://images.unsplash.com/photo-1540959733332-eab4deabeeaf |
| `fushimi-inari.jpg` | https://images.unsplash.com/photo-1478436127897-769e1b3f0f36 |
| `omoide-yokocho.jpg` | https://images.unsplash.com/photo-1554797589-7241bb691973 |
| `lantern-alley.jpg` | https://images.unsplash.com/photo-1528360983277-13d401cdc186 |
| `fuji-blossom.jpg` | https://images.unsplash.com/photo-1490806843957-31f4c9a91c65 |
| `tokyo-skyline.jpg` | https://images.unsplash.com/photo-1513407030348-c983a97b98d8 |
| `kyoto-skyline.jpg` | https://images.unsplash.com/photo-1545569341-9eb8b30979d9 |
| `sushi.jpg` | https://images.unsplash.com/photo-1579871494447-9811cf80d66c |
| `ramen.jpg` | https://images.unsplash.com/photo-1569718212165-3a8278d5f624 |
| `planning.jpg` | https://images.unsplash.com/photo-1488646953014-85cb44e25828 |
| `avatar-maya.jpg` | https://images.unsplash.com/photo-1494790108377-be9c29b29330 |
| `avatar-diego.jpg` | https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d |
| `avatar-priya.jpg` | https://images.unsplash.com/photo-1534528741775-53994a69daeb |
| `avatar-sam.jpg` | https://images.unsplash.com/photo-1500648767791-00dcc994a43e |
| `avatar-ana.jpg` | https://images.unsplash.com/photo-1438761681033-6461ffad8d80 |
| `avatar-noah.jpg` | https://images.unsplash.com/photo-1506794778202-cad84cf45f1d |

Portrait photos are used only as avatars for the fictional demo group (Maya, Diego, Priya, Sam, Ana, Noah). All demo people, trips, chats and bookings are fictional sample data.

## App icon & logo
Original design for this project: forest-green tile, the Material Community Icons “airplane-takeoff” glyph (Apache 2.0 / MIT via `@expo/vector-icons`) and three dots representing the travel group. Rendered to PNG for the app icon, Android adaptive icon and splash screen.

## Design reference
The visual style (cream background, forest-green accents, pill navigation, card layouts) follows the reference prototype video provided by the team.
