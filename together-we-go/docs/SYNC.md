# How phones stay in sync

Friends can each plan on their own phone and see the same trip: chat, votes, the itinerary, expenses, the checklist, photos, documents and receipts. This page explains how it works, what is private, how it was tested and where it stops.

## Try it (two minutes)

1. On the computer that runs the app, open a **second terminal** in the project folder and start the sync server:

   ```bash
   npm run server
   ```

   It prints addresses such as `http://192.168.1.20:8787`. On Windows, click **Allow access** (private networks) when the firewall asks.

2. Start the app as usual (`npx expo start`). While developing, phones **find the server by themselves** (they use the same computer address that Expo Go used). If a phone cannot, enter the address in **Settings → Advanced → Sync across phones** and tap *Test connection*.

3. Phone A: **More → Crew & roles → Share this trip across phones**.
4. Phone B: **Join a trip**, type the invite code (or scan the QR code from *Crew & roles → QR code*; the QR code and invite link carry the server's address once the trip is shared, and the phone asks before using it). The trip appears with its chat, plan and photos, and the badge says **Live · 2 phones**.

Everything either phone changes shows up on the other within a second or two. Turn on airplane mode, make changes, turn it off: they catch up.

> Rules of the competition: judges must not scan QR codes or click links, so during the presentation type the code on the second phone instead.

## What is shared and what is not

| Shared with the group | Stays on your phone |
|---|---|
| Chat messages, polls and votes, the checklist, packing list | Your **Scout AI** conversation |
| Itinerary, activity votes, flights (without ticket files) | Other people's **email addresses** |
| Expenses and settle-up, members and roles | **Flight ticket files** (they hold personal details) |
| Photos, documents and receipt photos (as files) | Your password, settings, language, theme |

## The pieces

```
 phone A                                              phone B
 ┌────────────────────┐                               ┌────────────────────┐
 │ app store (Zustand)│                               │ app store (Zustand)│
 │        │ diff      │        ┌───────────────┐      │        ▲ rebuild   │
 │        ▼           │  ops   │  sync server  │ ops  │        │           │
 │  sync engine ──────┼──────► │ (Node, no     │ ─────┼──► sync engine     │
 │  registers + outbox│ ◄───── │  accounts)    │ ◄────┼─── registers+outbox│
 └────────────────────┘ long   │ log per trip  │ long └────────────────────┘
                        poll   │ files per trip│ poll
                               └───────────────┘
```

* `src/sync/schema.ts` says which parts of a trip are shared and how each part merges.
* `src/sync/crdt.ts` turns "what changed" into small stamped changes (ops) and merges ops into **registers**.
* `src/sync/engine.ts` watches the store, queues ops, sends them, fetches friends' ops, and writes the merged trip back into the store. It knows nothing about React or the network library, which is why the tests can run two phones against one server in memory.
* `src/sync/transport.ts` is the HTTP client (every request has a time limit). `server/` is the server.
* `src/sync/blobs.ts` moves photos, documents and receipts (see below).

### The merge rule

Every field of the trip is a **register** that remembers the stamp of the change that last wrote it. **The newest stamp wins**, field by field. Stamps are hybrid logical clocks (`<time>-<counter>-<phone>`), so they stay in order even when two phones' clocks disagree a little.

* Two people editing *different* things both win (one renames an activity, the other changes its time).
* Two people editing the *same* field: the later change wins, on every phone.
* Lists are lists of items with ids. Adding an item never conflicts. A delete leaves a small tombstone so a late change to a deleted item cannot bring it back.
* Votes and "who is assigned" are sets or maps, so two people voting at the same moment both count.

Because the rule is deterministic, phones that have seen the same changes hold the same trip, **no matter in what order the changes arrived**. The tests check this with random runs (see below).

### Offline and restarts

Changes go into an **outbox** that is saved on the phone. If the server is out of reach the badge says *Offline · 3 waiting* and the app keeps working. When the connection returns the outbox is sent. If the app is closed before that, the unsent change is found again on the next start (the engine compares the saved trip with what it last sent).

### Files

Photos, documents and receipts are too big to be changes. The phone that has the file uploads it (`PUT /v1/trips/:id/files/:fileId`) and then writes the server's file id on the item, which syncs like any other change. Friends' phones see the id, download the file into the app's private storage and show it; after that it opens offline too. Pictures that ship with the app are shared by name (`asset:amalfi`) instead of being uploaded. A file over 8 MB stays on the phone that has it, and that person is told once.

## The server

`server/index.js` is about 150 lines of Node with no dependencies. It keeps, for every shared trip, an append-only log of ops and a folder of files, in `server/data/` (a JSON file and a `files/` folder). It never has to understand an op.

| Request | What it does |
|---|---|
| `POST /v1/trips/:id/ops` | send changes (up to 500, 1 MB) |
| `GET /v1/trips/:id/ops?since=N&wait=ms` | get changes after N; if there are none, **wait** up to 25 s for one (long polling), so news arrives at once |
| `PUT` / `GET /v1/trips/:id/files/:fileId` | send / fetch a file (8 MB each, 150 MB per trip) |
| `GET /v1/codes/:code` | invite code to trip id (60 tries a minute per address) |
| `GET /health` | is it alive, how many trips |

**Security model (read this before you rely on it).** There are no accounts. A trip is protected by its **id**: 24 random characters (about 124 bits) from the phone's secure random generator. A phone only learns the id by entering the invite code, and code look-ups are rate limited. Traffic is plain HTTP, so **only run the server on a network you trust** (home wifi, a phone hotspot), not on a public network. Anyone who can read the network could read the trip. A production version would use HTTPS and real accounts.

## What was tested

* `src/sync/__tests__/crdt.test.ts`: the merge rule. **150 random runs** where three phones make random edits (add, change, delete, vote) and exchange changes in random orders always end with identical trips.
* `src/sync/__tests__/engine.test.ts`: sharing, joining, edits both ways, offline queueing, restart, a change made while the app was closed, private data staying private, paging a trip of 700 messages, an unknown code, a code that is already taken.
* `src/sync/__tests__/e2e.test.ts`: the same engines talking to the **real server over real HTTP**, including the long-poll wake-up.
* `src/sync/__tests__/blobs.test.ts`: uploading, downloading, retrying, too-big files, deleted files, bundled pictures.
* `src/sync/__tests__/transport.test.ts`: time limits, cancelling, error kinds, and server-address checks against **both** Node's `URL` and the phone's looser `URL` class.
* `server/__tests__/server.test.js`: the store and the HTTP API, including limits and restarts.
* Browser test (`e2e/twophones.js`): two separate browser profiles and one real server. Phone A shares, phone B joins from a decoded QR link, chat and expenses travel both ways, A goes offline and comes back, B restarts, and a photo, a receipt and a PDF reach the other phone.

## Limits (the honest list)

* The server is a program you run on your own computer; there is no hosted service. Phones need to reach it (same wifi, hotspot, or the address typed in Settings).
* Files uploaded to the server are not deleted when the item is deleted (the 150 MB per trip limit keeps this bounded).
* The first version of "last writer wins" means two people editing the *same* field at the same moment lose one of the edits (the later one stays). Chat messages, votes and expenses are separate items, so they never clash.
* The on-device file upload and download code, the camera QR scanner and "share as picture" use the phone's native modules. They build into the iPhone bundle and are covered by the web tests of everything around them, but they were **not run on a physical phone** while this was written.
