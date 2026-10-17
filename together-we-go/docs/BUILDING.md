# Running TogetherWeGo without Expo Go

The competition rules ask for a solution that runs on its own. Expo Go is a development tool: it needs your laptop's dev server running and reachable. This page lists the ways to get a standalone copy and what each one costs.

| Goal | Way | Cost |
|---|---|---|
| Android phone, no laptop needed | Build an **`.apk`** with EAS (below) | Free Expo account |
| iPhone, no laptop needed | EAS build for iOS or TestFlight | **Apple Developer Program** (paid, yearly) |
| iPhone, laptop running | Expo Go with the laptop on the same wifi or a phone hotspot (`npx expo start`, or `--tunnel` if the wifi blocks devices from seeing each other). SDK 57 is not in Apple's App Store: build your own Expo Go with `npx eas-cli@latest go` (see the README) | Apple Developer Program for that TestFlight build, and the laptop must stay running |
| Any phone or laptop browser | Web export (below) | Free, fewer features |

## Android `.apk` with EAS (about 15 minutes, mostly waiting)

```bash
npm install
npx eas-cli@latest login            # free account at expo.dev
npx eas-cli@latest init             # links this folder to your account (writes a project id into app.json)
npx eas-cli@latest build -p android --profile preview
```

When the build finishes (about 10 to 20 minutes in the cloud queue) EAS prints a link to the `.apk`. Open it on the phone, allow installing from the browser, and install. The app then runs with **no laptop, no dev server and no internet**. The first build asks to create a signing key: say yes.

You can also build on your own computer with Android Studio installed: `npx expo run:android`.

## iPhone

An installable iPhone build always needs an Apple Developer account:

```bash
npx eas-cli@latest device:create     # registers a phone (internal distribution)
npx eas-cli@latest build -p ios --profile preview
```

Without that account, use the web build on the iPhone (below) or an Android phone with Expo Go. Tip for the competition: start Expo on the laptop **before** the set-up window, join a phone hotspot with both devices, and keep the screenshots in `docs/screenshots/` as a backup.

## Web build

```bash
npx expo export --platform web      # writes a static site to dist/
```

Host the `dist/` folder anywhere that serves static files. On an iPhone, *Share → Add to Home Screen* gives it an icon. The web build runs the whole planner, but not the things that need a phone's hardware: notifications, the native map (it falls back to OpenStreetMap), the camera QR scanner, haptics and speech on some browsers.

## Sync from an installed copy

The sync server speaks plain HTTP on your own network. The build settings allow that (`app.json`: Android `usesCleartextTraffic`, iOS `NSAllowsLocalNetworking`), and the first time the app talks to the server iOS asks for local-network access. An installed copy cannot guess the server's address the way Expo Go does, so either:

* open an invite link or scan an invite QR code that carries the address, or
* type the address once in *Settings → Sync across phones* (the server prints it when it starts).

## Windows tips

* If PowerShell says *running scripts is disabled on this system*, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use **Command Prompt** instead.
* The first time `npm run server` or `npx expo start` runs, Windows Firewall asks whether Node.js may use the network. Choose **Allow** for private networks. Without it phones cannot reach ports 8081 (Expo) or 8787 (sync).
* The phone and the laptop must be on the same network, and some school or venue wifi blocks devices from talking to each other. A phone hotspot always works.

## Things to know

* The native map on a standalone Android build needs a Google Maps API key (`android.config.googleMaps.apiKey` in `app.json`). Expo Go already includes one. The offline radar map needs nothing.
* Live weather and exchange rates need internet; offline the app shows the last saved data and says so.
* `npx expo prebuild` generates the native projects if you want to open them in Xcode or Android Studio. The generated folders are not committed.
