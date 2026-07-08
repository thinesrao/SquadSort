# ⚽ SquadSort

A strictly **mobile-first**, one-handed web app for organizing casual **7-a-side
futsal** matches from a pitch. Paste a messy WhatsApp roster, generate teams with
a specific sequential-fill algorithm, get an auto-generated **borrow / rolling-sub
schedule**, and run a loud interval **match timer** — all offline, no backend.

Built with **Vite + React + TypeScript**, **Tailwind CSS v4**, and **Lucide** icons.

## Features

The app flows through four thumb-reachable tabs:

1. **Roster** — Paste the WhatsApp list. A robust parser strips zero-width /
   hidden formatting characters, ignores date/time/location header lines, keeps
   only numbered player lines, and shows a live player count.
2. **Setup** — Chunky steppers for **Target team size** (default 7) and **Number
   of teams** (default 3), plus a live split preview.
3. **Teams** — Randomized teams with fixed colors (**White**, **Black**, **Red**,
   …) shown as compact side-by-side columns, the match schedule with borrow
   notes, and two share options: **Copy text** (paste-ready WhatsApp block) and
   **Share image** (a rendered PNG you can send straight to a WhatsApp group via
   the native share sheet, with a download fallback).
4. **Timer** — Big countdown ring, presets (5/8/10/12m), fine adjust, auto-repeat
   rounds, a loud Web-Audio chime at zero, and best-effort screen Wake Lock.

State persists across tab switches and page refreshes (localStorage).

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
    format.ts             # "Copy for WhatsApp" text block
    shareImage.ts         # Canvas-rendered PNG + Web Share / download
    audio.ts              # Web Audio chime (no asset files)
    __tests__/            # vitest unit tests
  hooks/                  # usePersistentState, useTimer, useWakeLock
  components/             # BottomNav, ViewShell, TeamCard, MatchCard, Stepper
  views/                  # RosterView, SettingsView, ResultView, TimerView
```
