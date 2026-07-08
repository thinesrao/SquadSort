# ⚽ SquadSort

A strictly **mobile-first**, one-handed web app for organizing casual **7-a-side
futsal** matches from a pitch. Paste a messy WhatsApp roster, generate teams with
a specific sequential-fill algorithm, get an auto-generated **borrow / rolling-sub
schedule**, and run a loud interval **match timer** — all offline, no backend.

Built with **Vite + React + TypeScript**, **Tailwind CSS v4**, and **Lucide** icons.

## Features

The app flows through four thumb-reachable tabs:

1. **Roster** — Paste the WhatsApp list (robust parser strips hidden characters
   and header lines), then **edit it directly**: add, rename, or remove players.
   Toggle **star ratings** (hidden by default) and **goalkeeper** flags per
   player; ratings are remembered by name across weeks.
2. **Setup** — Steppers for team size / count with a game-rule recommendation
   (**≤18 → 2 teams**, **≥19 → 3 teams**), **Skill balancing** and **Rolling
   subs** toggles, a **Squad pool** to bench late dropouts, and **Pairings**
   (keep two players **together** or **apart**).
3. **Teams** — Colored teams shown as side-by-side columns with **GK markers**, a
   **★ strength/balance** readout, and rolling-sub benches. Long-press to
   drag/swap, tap the coin to mark **paid**, and export via **Copy text**,
   **Share image** (~square PNG with the logo), or a backend-free **share link**.
4. **Timer** — Countdown ring, presets, auto-repeat, screen Wake Lock, **Jumbo**
   landscape mode, a **referee full-time whistle** + red/black flash alarm, and a
   **live scoreboard**: the current fixture with ± counters, **auto-advance** on
   the whistle, and optional **spoken matchup** announcements.

Balancing lives in `buildTeams`: sizing (rolling-subs even split or sequential
borrow) → goalkeeper pre-seed (one per team) → skill snake-draft → keep-together
/ keep-apart repair.

Pitch-side touches: **offline PWA** (service worker) so it loads with no signal,
**haptic feedback**, and installable to the home screen. State persists across
tab switches and refreshes (localStorage).

## The sorting algorithm (sequential fill)

Unlike an even distribution, teams are filled **sequentially up to the target
size**, and the **final team gets the remainder**:

1. Fisher–Yates shuffle the parsed players.
2. Fill each non-final team up to the target size.
3. Dump everyone left into the final team.

> Example: **19 players, target 7, 3 teams → 7 / 7 / 5.**

## The borrow / rolling-sub schedule

When the final team is short, a round-robin schedule tells it who to borrow subs
from (the resting team). For the default 3 teams:

| Match | Fixture           | Rests | Note                                   |
| ----- | ----------------- | ----- | -------------------------------------- |
| 1     | White vs Black    | Red   | —                                      |
| 2     | Black vs Red      | White | Team Red borrows *N* players from White |
| 3     | Red vs White      | Black | Team Red borrows *N* players from Black |

## Getting started

```bash
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # type-check + production build to dist/
npm run preview   # preview the production build
npm run test      # run the unit tests (parser, generator, schedule)
```

## Deploying

`npm run build` emits a fully static site in `dist/`. Drop it on any static host
(Vercel, Netlify, GitHub Pages, Cloudflare Pages) — no server or env vars needed.

## Project structure

```
src/
  App.tsx                 # top-level state + tab switching (state lifted here)
  types.ts, constants.ts  # models + team-color palette / defaults
  lib/
    parser.ts             # WhatsApp roster -> clean names
    teamGenerator.ts      # Fisher–Yates + sequential fill
    schedule.ts           # round-robin + borrow annotations
    teamEdit.ts           # pure swap/move for manual drag edits
    format.ts             # "Copy for WhatsApp" text block
    shareImage.ts         # Canvas-rendered ~square PNG + Web Share / download
    audio.ts              # Web Audio chime (no asset files)
    haptics.ts            # navigator.vibrate patterns
    __tests__/            # vitest unit tests
  hooks/                  # usePersistentState, useTimer, useWakeLock, usePlayerDrag
  components/             # BottomNav, ViewShell, TeamCard, MatchCard, Stepper
  views/                  # RosterView, SettingsView, ResultView, TimerView
public/                   # logo.svg, PNG icons, web manifest (PWA / favicon)
```
