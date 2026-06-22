<div align="center">

# JKT48 Stream

**Unofficial Video Streaming Platform for JKT48 Fans**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20Edge%20Functions-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8)](https://web.dev/progressive-web-apps/)
[![Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen)](#)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture & Data Flow](#architecture--data-flow)
- [Routing](#routing)
- [Pages](#pages)
- [Core Components](#core-components)
- [State Management & Local Storage](#state-management--local-storage)
- [Theme System](#theme-system)
- [Progressive Web App](#progressive-web-app)
- [Backend — Supabase Edge Functions](#backend--supabase-edge-functions)
- [JKT48 Member Data](#jkt48-member-data)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [Code Conventions](#code-conventions)
- [Security Notes](#security-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

JKT48 Stream is a Single Page Application (SPA) styled as a video streaming platform (similar to YouTube) dedicated exclusively to JKT48-related content. The app aggregates videos from several official JKT48 YouTube channels, provides access to member live streams via IDN Live and Showroom, and includes personalization features such as watch history, saved videos, and user-created playlists — all stored locally on the user's device with no account or login system required.

The frontend is built entirely with React, TypeScript, and Vite, while all communication with third-party APIs (YouTube Data API, IDN Live, Showroom) is proxied through Supabase Edge Functions so that sensitive API credentials are never exposed to the user's browser. The application can also be installed as a Progressive Web App (PWA) on both desktop and mobile devices.

---

## Key Features

**Video Browsing & Playback**
- Home feed that aggregates videos from multiple JKT48 YouTube channels at once, with infinite scroll
- Channel Page with Videos, Playlists, and Live Archive tabs, plus sort options (newest/oldest)
- Video search with real-time autocomplete suggestions
- Trending page for popular videos
- Custom video player built on the YouTube IFrame API (not a static iframe) for full control over playback, quality, and watch progress
- Automatic detection of portrait-oriented videos (e.g. YouTube Shorts) so fullscreen mode isn't forced into landscape on mobile
- Mini Player — video keeps playing in a small floating window while the user navigates to other pages

**Member Live Streaming**
- Dedicated "Member Live" tab that checks the live status of all JKT48 members in parallel (bulk check) across two platforms: IDN Live and Showroom
- Member search and filtering by name and team (Team Love, Team Dream, Team Passion, Trainee)
- Real-time visual status indicators (live/offline) with animated signal effects
- Dedicated streaming player (Streaming Player Page) using HLS.js to play `.m3u8` streams, complete with:
  - Multi-quality switching
  - Picture-in-Picture (PiP) mode
  - Volume, fullscreen, and orientation controls
  - Share button for the live stream link
  - Automatic refresh when the stream connection drops

**User Personalization (No Account/Login)**
- Automatic watch history with resume-from-last-progress
- Saved videos (Watch Later)
- User-created playlist system: create, edit, delete, reorder videos, and set visibility (public/private/unlisted)
- Save official YouTube channel playlists into a personal, read-only collection
- Subscriptions tab listing all integrated official JKT48 channels

**User Experience**
- Dark/light theme with an animated circular "reveal" transition powered by the View Transitions API (with a fallback overlay animation for Safari/Firefox)
- Automatic API status banner that appears whenever the YouTube API has issues (quota exceeded, rate limit, upstream error, etc.)
- Responsive navigation: a Sidebar for large screens, a Bottom Navigation Bar for mobile devices
- Page and UI transition animations powered by Framer Motion and custom Tailwind animations
- Installable as a PWA on Android, iOS, and desktop, with basic offline support via a Service Worker

---

## Tech Stack

| Category | Technology |
|---|---|
| UI Framework | React 18 (function components + hooks) |
| Language | TypeScript |
| Build Tool | Vite (`@vitejs/plugin-react-swc`) |
| Styling | Tailwind CSS + `tailwindcss-animate` |
| UI Components | shadcn/ui (built on Radix UI primitives) |
| Animation | Framer Motion |
| Routing | React Router v6 |
| Data Fetching / Caching | TanStack Query (React Query) |
| HLS Playback | hls.js (for IDN Live & Showroom streams) |
| YouTube Playback | YouTube IFrame Player API |
| Serverless Backend | Supabase Edge Functions (Deno runtime) |
| Form Validation | Zod + React Hook Form |
| Testing | Vitest + React Testing Library |
| Linting | ESLint (typescript-eslint) |
| Package Manager | pnpm |

There is no global state management library (Redux, Zustand, etc.) in use. All state is managed through a combination of `useState`/`useReducer`, React Context, TanStack Query, and `localStorage`.

---

## Project Structure

```
jkt48-stream/
├── public/
│   ├── assets/foto/              -- Member photos, grouped by team
│   │   ├── love/
│   │   ├── dream/
│   │   ├── passion/
│   │   └── trainee/
│   ├── logo.png
│   ├── manifest.json              -- PWA manifest
│   └── sw.js                      -- Service Worker
├── src/
│   ├── components/
│   │   ├── ui/                    -- shadcn/ui components (generated, avoid manual edits)
│   │   ├── AddToPlaylistModal.tsx
│   │   ├── ApiStatusBanner.tsx
│   │   ├── AppLayout.tsx          -- Main layout (Navbar, Sidebar, Outlet, MiniPlayer)
│   │   ├── MiniPlayer.tsx
│   │   ├── MobileBottomNav.tsx
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── VideoCard.tsx
│   ├── contexts/
│   │   ├── PWAContext.tsx         -- PWA install prompt state
│   │   └── ThemeContext.tsx       -- Dark/light theme state
│   ├── data/
│   │   └── members.ts             -- Data for all JKT48 members
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── integrations/supabase/
│   │   ├── client.ts              -- Supabase client initialization
│   │   └── types.ts               -- Database types (generated)
│   ├── lib/
│   │   ├── miniPlayer.ts          -- Global Mini Player state
│   │   ├── storage.ts             -- All localStorage interactions
│   │   ├── utils.ts               -- `cn()` helper for class names
│   │   └── youtube.ts             -- YouTube API call wrapper via Edge Function
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── ChannelPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── WatchPage.tsx
│   │   ├── TrendingPage.tsx
│   │   ├── SubscriptionsPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── SavedPage.tsx
│   │   ├── PlaylistsPage.tsx
│   │   ├── PlaylistDetailPage.tsx
│   │   ├── UserPlaylistDetailPage.tsx
│   │   ├── ChannelPlaylistDetailPage.tsx
│   │   ├── MemberLivePage.tsx
│   │   ├── StreamingPlayerPage.tsx
│   │   ├── YouTubeLivePlayerPage.tsx
│   │   └── NotFound.tsx
│   ├── test/
│   │   ├── setup.ts
│   │   └── example.test.ts
│   ├── App.tsx                    -- All route definitions
│   ├── main.tsx                   -- React entry point
│   └── index.css                  -- CSS variables, theming, custom animations
├── supabase/
│   ├── config.toml
│   └── functions/
│       ├── youtube/               -- YouTube Data API v3 proxy
│       ├── check-idn-live/        -- IDN live status check (single)
│       ├── check-idn-live-bulk/   -- IDN live status check (bulk/parallel)
│       ├── check-showroom-live/   -- Showroom live status check (single)
│       ├── check-showroom-live-bulk/ -- Showroom live status check (bulk/parallel)
│       └── get-idn-stream/        -- Retrieve IDN stream URL for hls.js
├── .env.example
├── components.json                -- shadcn/ui configuration
├── tailwind.config.ts
├── vite.config.ts
├── vitest.config.ts
├── vercel.json                    -- SPA rewrite rule for Vercel
└── package.json
```

---

## Architecture & Data Flow

```
Browser (React SPA)
    │
    ├── React Router v6        -- client-side routing
    ├── TanStack Query         -- data fetching & caching
    ├── ThemeContext           -- dark/light theme state
    ├── PWAContext             -- PWA install prompt
    └── localStorage           -- all user personalization data
            │
            ▼
    Supabase Edge Functions (Deno)
    ├── /youtube                    → YouTube Data API v3 proxy
    ├── /check-idn-live(-bulk)      → check & fetch IDN Live stream status
    ├── /check-showroom-live(-bulk) → check & fetch Showroom stream status
    └── /get-idn-stream             → fetch IDN stream URL for hls.js
            │
            ▼
    External APIs
    ├── YouTube Data API v3
    ├── IDN Live
    └── Showroom Live
```

The core architectural principle: **the frontend never talks directly to third-party APIs**. Every request is routed through Supabase Edge Functions, so sensitive API keys (such as the YouTube Data API key) live only on the server side (as Supabase Secrets) and are never sent to the browser.

YouTube API calls from React components **must** go through the helper in `src/lib/youtube.ts`, rather than calling `supabase.functions.invoke` directly. This helper handles:
- Error parsing and classification (`QUOTA_EXCEEDED`, `RATE_LIMITED`, `UPSTREAM_ERROR`, `CONFIG_ERROR`, `NETWORK`, `UNKNOWN`)
- Automatically triggering the `ApiStatusBanner` via the `api-status` custom event
- Full TypeScript types for video, playlist, and channel info responses

---

## Routing

All route definitions live in `src/App.tsx`, wrapped by `AppLayout` (except the 404 page).

| Path | Page | Description |
|---|---|---|
| `/` | `Home` | Home feed, aggregated videos from all channels |
| `/channel/:handle` | `ChannelPage` | Channel detail — videos/playlists/live tabs |
| `/search` | `SearchPage` | Search results (`?q=`) |
| `/watch` | `WatchPage` | YouTube video player (`?v=`, optionally `&list=` or `&userlist=`) |
| `/history` | `HistoryPage` | Watch history |
| `/saved` | `SavedPage` | Saved videos |
| `/trending` | `TrendingPage` | Trending videos |
| `/subscriptions` | `SubscriptionsPage` | List of official channels |
| `/playlist` | `PlaylistDetailPage` | YouTube playlist detail (`?list=`) |
| `/playlists` | `PlaylistsPage` | User playlist management |
| `/playlists/:id` | `UserPlaylistDetailPage` | User-created playlist detail |
| `/playlists/channel/:id` | `ChannelPlaylistDetailPage` | Saved channel playlist detail |
| `/member-live` | `MemberLivePage` | Live status of all members (IDN & Showroom) |
| `/stream` | `StreamingPlayerPage` | HLS player for member live streams |
| `*` | `NotFound` | 404 page |

Query parameters on `/stream` (read via `useSearchParams`):

```
memberId   -- Member ID from src/data/members.ts
platform   -- "idn" or "showroom"
streamUrl  -- HLS stream URL (.m3u8)
liveUrl    -- URL of the live page on the source platform
quality    -- list of available qualities (JSON stringified)
```

---

## Pages

Summary of each main page's function:

- **Home** — Displays the latest videos from all registered channels, interleaved together, with `IntersectionObserver`-based infinite scroll.
- **ChannelPage** — Three tabs: `videos` (with newest/oldest sorting), `playlists`, and `live` (completed stream archive). Supports per-tab pagination tokens.
- **SearchPage** — Video search with debounced autocomplete suggestions and infinite-scroll results.
- **WatchPage** — Main video player built on the YouTube IFrame API; records watch history and progress, supports both YouTube playlists and user playlists, and supports switching to the Mini Player.
- **TrendingPage** — List of most popular videos.
- **SubscriptionsPage** — List of official JKT48 channels connected to the app.
- **HistoryPage** — Full watch history with options to delete individual items or clear all.
- **SavedPage** — Collection of videos marked as saved by the user.
- **PlaylistsPage** — Full CRUD for user playlists: create, edit title/description/visibility, delete, and manage videos within them.
- **PlaylistDetailPage / UserPlaylistDetailPage / ChannelPlaylistDetailPage** — Detail views for each playlist type (YouTube, user-created, and saved channel playlist copies).
- **MemberLivePage** — Checks the live status of all members in parallel on IDN Live and Showroom, with search and team filters plus real-time visual indicators.
- **StreamingPlayerPage** — Dedicated HLS player for member streams, with quality controls, PiP, fullscreen, and automatic refresh when the stream drops.
- **NotFound** — Standard 404 page.

---

## Core Components

### `VideoCard`
`src/components/VideoCard.tsx`

The video card used throughout the app (Home, Search, Channel, Playlist, etc). Supports lazy-loaded thumbnails, duration badges, channel info, relative timestamps (e.g. "3 days ago"), and a context menu for saving a video, adding it to a playlist, or opening it in a new tab.

### `MiniPlayer`
`src/components/MiniPlayer.tsx`

A small video player that appears in the corner of the screen so users can keep watching while browsing other pages. State is managed globally via `src/lib/miniPlayer.ts` using `useSyncExternalStore`:

```typescript
import { useMiniPlayer } from "@/lib/miniPlayer";

const { videoId, title, channelTitle, isMini, open, close, setMini } = useMiniPlayer();
```

### `ApiStatusBanner`
`src/components/ApiStatusBanner.tsx`

An automatic banner that appears whenever the YouTube API encounters an issue. It listens for the `api-status` custom event on `window` and is already mounted globally in `App.tsx` — no need to call it manually on individual pages.

### `AddToPlaylistModal`
`src/components/AddToPlaylistModal.tsx`

Modal for adding a video to one of the user's playlists.

### `Sidebar`, `Navbar`, `MobileBottomNav`
Handle the app's main navigation. `Sidebar` appears on large screens (≥ `lg`) with collapsed/expanded modes, `Navbar` is always shown at the top (containing search with autocomplete, theme toggle, and the PWA install button), while `MobileBottomNav` replaces the sidebar on small screens.

### `AppLayout`
`src/components/AppLayout.tsx`

The layout wrapper for every page (`<Outlet />`). Handles page transitions, automatically collapsing/expanding the sidebar while on the video player pages (mirroring YouTube's behavior), and hosts the global `MiniPlayer`.

---

## State Management & Local Storage

There is no global state manager. The approach used is:

1. `useState` / `useReducer` — local component state
2. React Context (`ThemeContext`, `PWAContext`) — cross-component state that rarely changes
3. TanStack Query — asynchronous data fetching (ready to be expanded further)
4. `localStorage` via `src/lib/storage.ts` — all user personalization data
5. Custom DOM events (`window.dispatchEvent`) — synchronization between components that aren't directly connected, such as `jkt48-storage` and `api-status`

All `localStorage` interactions **must** go through `src/lib/storage.ts`, which exposes the following API:

```typescript
import {
  addHistory, useHistory,
  toggleSaved, useSaved,
  setProgress, getProgress,
  createPlaylist, getPlaylists, usePlaylists, usePlaylist,
  updatePlaylist, deletePlaylist,
  addVideoToPlaylist, removeVideoFromPlaylist, reorderPlaylistVideos,
  saveChannelPlaylistFromChannel, useSavedChannelPlaylists,
} from "@/lib/storage";
```

Functions prefixed with `use` (`useHistory`, `useSaved`, `usePlaylists`, etc.) are React hooks that automatically re-render when related data changes, by subscribing to the `jkt48-storage` event.

**localStorage keys used:**

| Key | Data Stored |
|---|---|
| `jkt48-watch-history` | Watch history (capped at 100 entries) |
| `jkt48-saved-videos` | List of saved video IDs |
| `jkt48-watch-progress` | Per-video watch progress |
| `jkt48-user-playlists` | User-created playlists |
| `jkt48-saved-channel-playlists` | Saved copies of channel playlists |
| `jkt48-theme` | Theme preference (light/dark) |

No personal data is ever sent to any server — all of the data above is stored purely on the user's own device.

---

## Theme System

Managed by `src/contexts/ThemeContext.tsx`. The theme is persisted in `localStorage` (`jkt48-theme`) and automatically follows the system preference (`prefers-color-scheme`) if it has never been set before.

Theme transitions use a circular "reveal" animation originating from the toggle button's click position:

- **Modern browsers (Chrome/Edge)** — uses the View Transitions API (`document.startViewTransition`) with a circular `clip-path` animation.
- **Fallback (Safari/Firefox)** — a manual overlay animation using `clip-path`, removed right before the theme is actually applied so the real content stays visible underneath.
- Users with `prefers-reduced-motion: reduce` get an instant theme switch with no animation.

Theme CSS variables are defined in `src/index.css`, including:

```css
--header-h: 56px;        /* top navbar height */
--sidebar-w: 240px;       /* desktop sidebar width when expanded */
--sidebar-mini-w: 72px;   /* desktop sidebar width when collapsed */
--primary: 350 88% 50%;   /* primary color (JKT48 red), in HSL format */
--primary-glow: ...;      /* accent/glow color */
```

Custom animation classes available: `animate-fade-in-down`, `animate-fade-in-up`, `animate-fade-in-left`, `animate-scale-in`, `animate-scale-in-bounce`, `page-enter`, and `yt-chip`.

---

## Progressive Web App

The app can be installed as a PWA through two main files:

- **`public/manifest.json`** — Defines the app name, icons, theme color, display mode (`standalone`), and screen orientation (`portrait`).
- **`public/sw.js`** — Service Worker using a *network-first, fallback-to-cache* strategy. Non-GET requests and requests to external domains (YouTube, Supabase, Google APIs) are intentionally skipped from caching to keep data always up to date.

PWA install state is managed by `src/contexts/PWAContext.tsx`, which captures the browser's `beforeinstallprompt` and `appinstalled` events, then exposes the following state to the rest of the app:

```typescript
import { usePWA } from "@/contexts/PWAContext";

const { canInstall, isInstalled, installing, triggerInstall } = usePWA();
```

Whenever the precached static assets change, the `CACHE_VERSION` value in `public/sw.js` should be bumped so the Service Worker performs a cache refresh.

---

## Backend — Supabase Edge Functions

Any logic that requires secret credentials (API keys) runs server-side via Supabase Edge Functions (Deno runtime), never in the browser. The frontend only communicates with these functions through the Supabase client (`src/integrations/supabase/client.ts`), which is initialized with public (anon) credentials from an environment variable.

### `youtube`

Proxy for the YouTube Data API v3. Invoked via the `action` query parameter:

| Action | Parameters | Returns |
|---|---|---|
| `channel` | `handle`, `order`, `pageToken?` | `{ videos, nextPageToken }` |
| `search` | `q`, `pageToken?` | `{ videos, nextPageToken }` |
| `suggest` | `q` | `{ suggestions: string[] }` |
| `videos` | `ids` (comma-separated) | `{ videos }` |
| `related` | `videoId` | `{ videos }` |
| `playlists` | `handle`, `pageToken?` | `{ playlists, nextPageToken, totalResults }` |
| `playlistItems` | `playlistId`, `pageToken?` | `{ videos, nextPageToken, totalResults }` |
| `playlistInfo` | `playlistId` | `YTPlaylist` |
| `channelInfo` | `handle` | `YTChannelInfo` |

This function securely reads the YouTube API key via `Deno.env.get("YOUTUBE_API_KEY")` on the server side — the key is never hardcoded in the source code or sent to the client.

### `check-idn-live` / `check-idn-live-bulk`

Checks a member's live status on IDN Live (single or bulk/parallel for multiple members at once).

```typescript
// Input
{ username: string }  // or { usernames: string[] } for the bulk variant

// Output
{
  is_live: boolean;
  live_url: string | null;
  stream_url: string | null;   // HLS (.m3u8) URL
  slug: string | null;
}
```

### `check-showroom-live` / `check-showroom-live-bulk`

Checks a member's live status on Showroom (single or bulk).

```typescript
// Input
{ room_url_key: string }  // or { room_url_keys: string[] } for the bulk variant

// Output
{
  is_live: boolean;
  stream_url: string | null;      // high quality
  stream_url_low: string | null;  // low quality
}
```

### `get-idn-stream`

Retrieves the HLS stream URL from IDN Live for playback via hls.js in `StreamingPlayerPage`.

**Security note on Edge Functions:** some of the live-status-checking functions currently embed third-party API configuration directly within the function code. For safer production practice, credentials like this should be moved to **Supabase Secrets** (environment variables on the Edge Function side) rather than being written directly into source files, so they never end up in version control history.

---

## JKT48 Member Data

File: `src/data/members.ts`

```typescript
export type Team = "Team Love" | "Team Dream" | "Team Passion" | "Trainee" | "Official";

export interface Member {
  id: string;                      // unique identifier, snake_case, e.g. "alya_amanda"
  name: string;                    // full name
  photoFile: string;               // photo file name (without extension)
  team: Team;
  teamFolder: "love" | "dream" | "passion" | "trainee" | "official";
  idnUsername: string | null;      // IDN Live username, null if unavailable
  showroomKey: string | null;      // Showroom room_url_key, null if unavailable
  showroomRoomId: number | null;   // Showroom room_id, null if unavailable
}
```

The dataset includes more than 60 active members, divided into four teams: **Team Love**, **Team Dream**, **Team Passion**, and **Trainee**, plus a dedicated entry for the **JKT48 Official** account.

Member photos are stored at `public/assets/foto/{teamFolder}/{photoFile}.jpg` and retrieved via the following helper:

```typescript
import { getMemberPhotoUrl, TEAM_BADGE_COLORS } from "@/data/members";

const url = getMemberPhotoUrl(member);            // Full URL of the member's photo
const badgeClass = TEAM_BADGE_COLORS[member.team]; // Tailwind classes for the team badge
```

**Adding a new member:**

1. Add the photo file to `public/assets/foto/{teamFolder}/{member_name}.jpg`
2. Add a new entry to the `MEMBERS` array in `src/data/members.ts`, following the `Member` interface shown above.

---

## Environment Variables

Environment configuration is split into two categories based on sensitivity.

### Frontend (`.env`, public)

Variables prefixed with `VITE_*` get bundled into the production build and are visible to anyone opening the app in a browser. Only public credentials (anon/publishable keys) should ever go here.

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project endpoint URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key (safe to expose publicly, scoped by Row Level Security) |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

Copy `.env.example` to `.env` and fill it in with your own Supabase project credentials:

```bash
cp .env.example .env
```

### Backend (Supabase Secrets, sensitive)

The following variables are **never** placed in the frontend `.env`. They should only be configured as secrets on Supabase Edge Functions (via the Supabase CLI or dashboard), since they're only accessible from the server side:

| Variable | Description | Used in |
|---|---|---|
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | Edge Function `youtube` |
| Other third-party service credentials | Used for live status checks | IDN Live status-checking Edge Functions |

```bash
# Example of setting a secret via the Supabase CLI
supabase secrets set YOUTUBE_API_KEY=your_key_here
```

> The `.env` file (containing real project credentials) is already listed in `.gitignore` and is not included in this repository. Always use `.env.example` as the reference for the required variable structure, and never push real credentials to a public version control repository.

---

## Installation

**Prerequisites:**

- Node.js version 18 or later
- pnpm (the package manager used to run this project) — install it via `npm install -g pnpm` if you don't already have it
- An active Supabase account and project (required to run the Edge Functions)
- Supabase CLI (optional, only needed if you want to develop or deploy Edge Functions locally)

**Steps:**

```bash
# 1. Clone the repository
git clone <your-repository-url>
cd jkt48-stream

# 2. Install dependencies
pnpm install

# 3. Copy and fill in the frontend environment variables
cp .env.example .env
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY,
# and VITE_SUPABASE_PROJECT_ID with your own Supabase project credentials

# 4. (Optional) Configure and deploy Supabase Edge Functions
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set YOUTUBE_API_KEY=<your-youtube-api-key>
supabase functions deploy youtube
supabase functions deploy check-idn-live
supabase functions deploy check-idn-live-bulk
supabase functions deploy check-showroom-live
supabase functions deploy check-showroom-live-bulk
supabase functions deploy get-idn-stream
```

---

## Running the Project

```bash
# Start the development server (default: http://localhost:8080)
pnpm dev

# Build for production
pnpm build

# Build in development mode (without full minification)
pnpm build:dev

# Preview the production build locally
pnpm preview

# Run linting
pnpm lint
```

---

## Testing

Testing framework: **Vitest** and **@testing-library/react**.

```bash
# Run the full test suite once
pnpm test

# Run tests in watch mode
pnpm test:watch
```

The test setup file lives at `src/test/setup.ts`. Tests are placed either in `src/test/` or as `*.test.ts` files alongside the module being tested.

Example test:

```typescript
import { describe, it, expect } from "vitest";
import { formatDuration, timeAgo } from "@/lib/youtube";

describe("formatDuration", () => {
  it("should format seconds correctly", () => {
    expect(formatDuration("PT3M45S")).toBe("3:45");
    expect(formatDuration("PT1H2M3S")).toBe("1:02:03");
  });
});
```

---

## Build & Deployment

This project is configured for deployment on **Vercel** via `vercel.json`, which rewrites every path to `index.html` so that client-side routing (React Router) works correctly on page refresh and direct URL access:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**General deployment steps:**

1. Run `pnpm build` to generate the `dist/` folder.
2. Connect the repository to Vercel (or any other static hosting platform that supports SPA rewrites).
3. Set the `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID` environment variables in the hosting platform's dashboard — do not commit a `.env` file into a public repository as part of the build process.
4. Make sure all Supabase Edge Functions are deployed and their secrets are configured before pointing the frontend application at a production Supabase project.

---

## Code Conventions

- **Import paths** — always use the `@/` alias for imports from `src/` (e.g. `@/lib/youtube`), avoid deeply nested relative paths like `../../lib/youtube`.
- **Components** — all components are TypeScript function components; use named exports for small/utility components and default exports for pages. Props are always defined as a TypeScript interface.
- **Styling** — use Tailwind CSS for all styling; avoid inline CSS except for dynamic values (e.g. HSL colors or custom animations). Use the `cn()` helper from `@/lib/utils` for conditional class names.
- **shadcn/ui components** — files in `src/components/ui/` are generated by shadcn/ui and shouldn't be modified directly without a strong reason; use the shadcn CLI for updates.
- **Infinite scroll** — the standard pattern uses an `IntersectionObserver` on a sentinel element at the end of the list, with a `rootMargin` of around `400px` for a smooth loading experience.
- **Race conditions in `useEffect`** — use a `cancelled` flag to prevent calling `setState` after a component has unmounted.
- **Custom events** — every data change in `localStorage` made through `storage.ts` triggers the `jkt48-storage` event, so that all subscribed hooks (`useSaved`, `usePlaylists`, etc.) automatically update.

---

## Security Notes

- The `.env` file contains real project credentials and is **not** included in this documentation or in public version control history (already listed in `.gitignore`).
- The `VITE_SUPABASE_PUBLISHABLE_KEY` variable is public by design (Supabase anon key) and is safe to expose to the browser as long as Row Level Security (RLS) is properly configured on the Supabase project — though it still shouldn't be shared without good reason.
- Sensitive third-party API keys (such as the YouTube Data API key) **must** be configured as Supabase Secrets on the Edge Function side, never stored in frontend code or in a `.env` file that gets bundled into the browser.
- Before contributing to or publishing a fork of this project, make sure no credentials, API keys, or real Supabase Project IDs are accidentally committed to the repository.

---

## Contributing

Contributions are welcome. To contribute:

1. Fork this repository.
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and test them locally (`pnpm dev`, `pnpm test`, `pnpm lint`).
4. Commit with a clear message: `git commit -m "Add: description of change"`
5. Push your branch: `git push origin feature/your-feature-name`
6. Open a Pull Request describing what was changed and why.

Before opening a Pull Request, make sure:

- No leftover `console.log` statements (except intentional `console.error` calls)
- No TypeScript errors (`any` only when truly necessary)
- Import paths consistently use the `@/` alias
- Any new member data includes a corresponding photo in `public/assets/foto/`
- No changes break the existing `localStorage` schema
- `CACHE_VERSION` in `public/sw.js` is bumped whenever precached static assets change

---

## License

This is a fan-made project and is not officially affiliated with JKT48 or its associated agency. All rights to JKT48 trademarks, names, photos, and official content remain with their respective rights holders. The license status of this project's source code follows the terms set by the repository owner; contact the project maintainer before reusing this code outside the context of personal development or contribution.

---

<div align="center">

**JKT48 Stream - Built with React, TypeScript, and Supabase**

*An unofficial video streaming platform for JKT48 fans*

</div>