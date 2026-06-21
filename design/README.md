# Handoff: Whale Watch — Polymarket Insider Radar

## Overview
Whale Watch is a real-time analytics dashboard that monitors Polymarket for "emerging whale" activity — wallets with little or no prior trading history that suddenly place large bets on low-probability outcomes. The product surfaces these as potential signals of non-public information or coordinated insider activity.

## About the Design Files
`Whale Watch.dc.html` is a **high-fidelity interactive design reference** built in HTML/React. It is a prototype showing intended look, layout, and behavior — not production code to copy directly. The task for Claude Code is to **recreate this design in your actual tech stack** (Next.js 14, Tailwind CSS, Postgres, Recharts) using its established patterns, real API data, and proper routing. The HTML file is a pixel-perfect fidelity target and an interactive spec.

## Fidelity
**High-fidelity.** Colors, typography, spacing, layout, component styling, and interactions are all final. Recreate pixel-precisely using your codebase's design system and libraries.

---

## Screens / Views

### 1. Live Feed (Homepage — `/`)

The primary screen. A real-time stream of flagged whale bets.

**Layout:**
- Sticky top bar: `height: 52px`, `background: #080b10`, `padding: 0 18px`, `border-bottom: 1px solid #1a2230`
- Scrolling ticker strip: `height: 30px`, `background: #080b10`, `border-bottom: 1px solid #141b26`
- Cluster alert banner (conditional): `padding: 9px 18px`, red gradient background
- Content area: `padding: 18px`
- Metrics row: 4-column CSS grid, `gap: 12px`, `margin-bottom: 18px`
- Filter bar: flex row, space-between
- Feed table: full-width, 8-column grid

**Top Bar Components:**
- Logo mark: `26×26px` square, `border: 1.5px solid #00e5a0`, `border-radius: 3px`, `◑` glyph in `#00e5a0`
- Wordmark: `WHALE WATCH` — `font-weight: 700`, `letter-spacing: 1.5px`, `font-size: 13px`
- Subtitle: `POLYMARKET INSIDER RADAR` — `color: #4a5666`, `font-size: 9px`, `letter-spacing: 2px`
- LIVE badge: green dot (7px, `#00e5a0`, blinking) + `LIVE` text — `background: rgba(0,229,160,.08)`, `border: 1px solid rgba(0,229,160,.25)`, `border-radius: 3px`, `padding: 4px 10px`
- Search input: `width: 230px`, `height: 32px`, `background: #0c1118`, `border: 1px solid #1a2230`, `border-radius: 3px`, `font-size: 12px`
- UTC clock: live-updating ISO time string, `color: #9aa7b6`, `font-size: 12px`; subtitle `UTC · POLYGON` `color: #4a5666`

**Scrolling Ticker:**
- Green pill on left: `FLAGGED ▸` — `background: #00e5a0`, `color: #06080c`, `font-weight: 700`, `font-size: 10px`
- Infinite scroll animation: `translateX(0) → translateX(-50%)`, `38s linear infinite`
- Each item: tier (colored), wallet address (short), size, `@odds`, side (colored)

**Cluster Alert Banner (shown when cluster active, dismissable):**
- Background: `linear-gradient(90deg, rgba(255,77,77,.14), rgba(255,77,77,.03))`
- Border-bottom: `1px solid rgba(255,77,77,.35)`
- Pulsing red dot: 9px, `animation: pulse 1.8s infinite` (box-shadow keyframe)
- `CLUSTER DETECTED` label: `color: #ff4d4d`, `font-weight: 700`, `font-size: 11px`, `letter-spacing: 1.5px`
- Summary text: wallet count, side, market name (bold white), time window, aggregate size
- `INVESTIGATE →` button: `background: #ff4d4d`, `color: #06080c`, `height: 28px`, `border-radius: 3px`
- Dismiss `×` button: transparent with border

**Metrics Cards (4 of them, same style):**
- `background: #0a0f16`, `border: 1px solid #1a2230`, `border-radius: 4px`, `padding: 14px 16px`
- Label: `color: #6b7888`, `font-size: 10px`, `letter-spacing: 1px`
- Value: `font-size: 24px`, `font-weight: 700`
- Metrics shown: Whale Volume 24h (green delta), New Whale Wallets Today, Hottest Market (orange bet count), Biggest Bet All-Time (red + MEGA badge)

**Filter Chips:**
- `ALL` / `SHARK` / `WHALE` / `MEGA` — `height: 28px`, `border-radius: 3px`, monospace font
- Active state: colored border + colored text matching tier color; inactive: `#1a2230` border, `#9aa7b6` text
- Count shown inside each chip

**Stream toggle button:** `STREAMING` (green dot) / `STREAM PAUSED` (grey) — `height: 28px`

**Feed Table:**
- Table header: `height: 34px`, `background: #0c1219`, `color: #5a6776`, `font-size: 10px`, `letter-spacing: 1px`
- Grid columns: `104px 152px 122px 1fr 78px 70px 88px 104px`
- Columns: TIER | WALLET | SIZE | MARKET | ODDS | SIDE | SCORE | TIME
- Row height: 46px (comfortable) / 38px (compact); `border-bottom: 1px solid #121925`
- Row hover: `background: #0e151f`
- New rows: entrance animation `translateY(-6px) → 0` + background flash from `rgba(0,229,160,.16) → transparent`, `1.1s ease-out`
- Tier cell: 3px colored left-bar tick + tier name in tier color
- Wallet: `0x1234…abcd` format, `color: #9aa7b6`
- Size: right-aligned, `color: #e6edf3`, `font-weight: 600`
- Market: truncated, `color: #c7d2de`, `padding-left: 14px`
- Odds: right-aligned; `< 15%` = `#ff8f3f`, else `#c7d2de`
- Side badge: `font-size: 10px`, `font-weight: 700`, `padding: 2px 7px`, `border-radius: 2px`; YES = `#00e5a0` on `rgba(0,229,160,.12)`, NO = `#ff5c7a` on `rgba(255,92,122,.12)`
- Score: mini progress bar (`34×4px`, `border-radius: 2px`, `background: #1a2230`) + numeric score; color by score: ≥85 = red, ≥70 = orange, else amber
- Time: `color: #6b7888`, `font-size: 11px`; updates live: "just now" < 5s, "Xs ago" < 1m, "Xm ago" < 1h, "Xh Xm ago" otherwise

---

### 2. Wallet Detail (`/wallet/[address]`)

Accessed by clicking any row in the feed.

**Layout:**
- Back breadcrumb: `← LIVE FEED`, `color: #6b7888`, `font-size: 11px`
- Top section: 2-column grid — `1fr 300px`, `gap: 14px`
- P/L chart card: full width
- Bets table: full width
- `max-width: 1180px`

**Wallet Header Card (`1fr` column):**
- Full address (truncated: `0x1234…abcdef`), `font-size: 18px`, `font-weight: 600`
- Copy icon: `⧉`, `color: #4a5666`
- Cluster badge (conditional): `⬡ CLUSTER MEMBER` — red pill, clickable → Cluster view
- 4-stat row (grid): Wallet Age | Lifetime Trades | Hit Rate | Realized P/L
  - Each stat: label `font-size: 10px`, `letter-spacing: 1px`; value `font-size: 17px`, `font-weight: 600`
  - Trades: green `#00e5a0` if `< 5`, else `#9aa7b6`
  - P/L: green if positive, `#ff5c7a` if negative

**Suspicion Gauge (`300px` column):**
- SVG semicircle gauge: `120×64px` viewBox `0 0 120 64`
- Track: `stroke: #1a2230`, `stroke-width: 9`
- Fill arc: colored by suspicion (≥80 = `#ff4d4d`, ≥60 = `#ff8f3f`, else `#f5b942`)
- Score number centered below arc: `font-size: 28px`, `font-weight: 700`
- Label: `HIGHLY SUSPICIOUS` / `ELEVATED` / `MODERATE`

**Suspicion score formula:**
```
base 50 + (5 - trades) × 7 + floor((0.30 - odds) / 0.30 × 22) + (inCluster ? 16 : 0) + random(0–8)
capped at 98
```

**Cumulative P/L Chart:**
- SVG line chart: `viewBox="0 0 900 120"`, `width: 100%`, `height: 120px`, `preserveAspectRatio: none`
- Zero baseline: dashed line at y=60, `stroke: #141b26`, `stroke-dasharray: 4 4`
- Area fill: `rgba(0,229,160,.08)`
- Line: `stroke: #00e5a0`, `stroke-width: 2`
- Computed from cumulative resolved bet P/L

**Bets Table:**
- Columns: `1fr 120px 78px 70px 110px 120px`
- Columns: MARKET | SIZE | ODDS | SIDE | RESULT | P/L
- Row height: `44px`
- Result colors: `WON` = `#00e5a0`, `LOST` = `#ff5c7a`, `OPEN` = `#6b7888`
- P/L colors: positive = `#00e5a0`, negative = `#ff5c7a`, `—` = `#4a5666`

---

### 3. Cluster Alert (`/cluster/[id]`)

Accessed via the cluster banner "INVESTIGATE →" button, or the CLUSTER MEMBER badge on a wallet.

**Layout:**
- Back breadcrumb: `← LIVE FEED`
- Page title: pulsing red dot + `COORDINATED ACTIVITY` + `CRITICAL` badge
- 4-stat metric row: Fresh Wallets | Aggregate Position | Time Window | Unified Side
- Target market card
- Coordination timeline card

**Cluster Detection Criteria (implement in backend):**
- 3+ wallets, each with `< 5` total lifetime trades
- All bet the same market
- All bet the same side (YES or NO)
- All bets within a 60-minute window

**Metric Row (same card style as feed metrics):**
- Fresh Wallets: `color: #ff4d4d`
- Aggregate Position: `color: #ff8f3f`
- Time Window: `color: #e6edf3` (e.g. `52m`)
- Unified Side: colored by side (YES=green, NO=red)

**Target Market Card:**
- Label + market name `font-size: 15px`, `font-weight: 600`
- Secondary row: "odds at flag" (orange) + "whale $ on [side]"

**Coordination Timeline:**
- Vertical timeline: `2px` line on left, `left: 4px`, `background: #1a2230`
- Each entry: red circle dot `10×10px` on line, `border: 2px solid #06080c`
- Grid columns: `120px 150px 110px 70px 1fr` — Time | Wallet (clickable, green) | Size | Side badge | Note
- Notes: "first mover · opened position" for earliest, "mirror entry · same side" for subsequent
- Sorted chronologically ascending

---

## Tier Definitions

| Tier | Min Bet | Max Odds | Color | Priority |
|---|---|---|---|---|
| SHARK | $25,000 | 30% | `#f5b942` (amber) | Medium |
| WHALE | $100,000 | 25% | `#ff8f3f` (orange) | High |
| MEGA WHALE | $500,000 | 20% | `#ff4d4d` (red) | Critical |

**Alert Score formula:**
```
tier_weight (MEGA=40, WHALE=30, SHARK=20)
+ floor((0.30 - odds) / 0.30 × 30)   // rarity bonus
+ (5 - trades) / 5 × 18               // freshness bonus
+ min(12, log10(size) / 6 × 12)       // size bonus
clamped to [40, 99]
```
Score color: ≥85 = `#ff4d4d`, ≥70 = `#ff8f3f`, else `#f5b942`

---

## Interactions & Behavior

| Interaction | Behavior |
|---|---|
| Click feed row | Navigate to `/wallet/[address]` |
| Click `INVESTIGATE →` in banner | Navigate to `/cluster/[id]` |
| Click `× ` on banner | Dismiss banner for session |
| Click `⬡ CLUSTER MEMBER` badge | Navigate to `/cluster/[id]` |
| Click wallet in cluster timeline | Navigate to `/wallet/[address]` |
| Click `← LIVE FEED` | Return to feed |
| Click tier filter chip | Filter feed table to that tier only |
| Click `STREAMING` / `STREAM PAUSED` | Toggle live data polling on/off |
| Click logo | Return to feed |

**Live behaviors:**
- Timestamps ("3m ago", "just now") update every 2–3 seconds
- New rows animate in at the top of the feed: `translateY(-6px → 0)` + background flash from `rgba(0,229,160,.16) → transparent`, `1.1s ease-out`; new = within last 6 seconds of arrival
- UTC clock in top bar updates every second
- Polling interval: 60s (or WebSocket)

---

## Animations

```css
/* New row entrance */
@keyframes wwIn {
  0%   { background: rgba(0,229,160,.16); transform: translateY(-6px); opacity: 0; }
  60%  { opacity: 1; transform: translateY(0); }
  100% { background: transparent; }
}

/* LIVE dot blink */
@keyframes wwBlink {
  0%, 100% { opacity: 1; }
  50%       { opacity: .25; }
}

/* Ticker infinite scroll */
@keyframes wwTick {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

/* Cluster pulsing dot */
@keyframes wwPulse {
  0%   { box-shadow: 0 0 0 0   rgba(255,77,77,.45); }
  70%  { box-shadow: 0 0 0 7px rgba(255,77,77,0);   }
  100% { box-shadow: 0 0 0 0   rgba(255,77,77,0);   }
}
```

---

## Design Tokens

### Colors

| Token | Value | Usage |
|---|---|---|
| `bg-app` | `#06080c` | App background |
| `bg-surface` | `#0a0f16` | Cards, table |
| `bg-bar` | `#080b10` | Top bar, ticker |
| `bg-header-row` | `#0c1219` | Table header rows |
| `bg-input` | `#0c1118` | Search input |
| `border-default` | `#1a2230` | Card borders |
| `border-subtle` | `#141b26` | Row dividers |
| `border-faint` | `#121925` | Inner row dividers |
| `text-primary` | `#e6edf3` | Main text |
| `text-secondary` | `#c7d2de` | Market names |
| `text-muted` | `#9aa7b6` | Wallet addresses |
| `text-dim` | `#6b7888` | Labels, times |
| `text-faint` | `#4a5666` | Subtitles |
| `text-ghost` | `#3a4452` | Footer |
| `accent-green` | `#00e5a0` | Live, YES, P/L positive |
| `tier-shark` | `#f5b942` | Shark amber |
| `tier-whale` | `#ff8f3f` | Whale orange |
| `tier-mega` | `#ff4d4d` | Mega Whale red |
| `side-yes` | `#00e5a0` | YES side |
| `side-no` | `#ff5c7a` | NO side |
| `cluster-red` | `#ff4d4d` | Cluster alerts |

### Typography

| Use | Family | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| All UI | JetBrains Mono | 13px base | 400 | — |
| Wordmark | JetBrains Mono | 13px | 700 | 1.5px |
| Table headers | JetBrains Mono | 10px | 400 | 1px |
| Metric values | JetBrains Mono | 24px | 700 | — |
| Wallet detail stats | JetBrains Mono | 17px | 600 | — |
| Tier badges | JetBrains Mono | 11px | 600 | 0.5px |
| Side badges | JetBrains Mono | 10px | 700 | — |
| Scores | JetBrains Mono | 12px | 700 | — |
| Timestamps | JetBrains Mono | 11px | 400 | — |
| Ticker | JetBrains Mono | 11px | 400/600 | — |

### Spacing
- Content padding: `18px`
- Card padding: `14px 16px` (metrics) / `18px 20px` (wallet detail)
- Grid gap: `12px` (metric cards) / `14px` (wallet detail grid)
- Row height: `46px` (comfortable) / `38px` (compact) for feed, `44px` for bet rows, `34px` for headers

### Borders & Radius
- Cards: `border-radius: 4px`
- Buttons: `border-radius: 3px`
- Side badges: `border-radius: 2px`
- Tier tick bar: `border-radius: 1px`, `3×14px`

### Scrollbar (webkit)
- Track: `#06080c`
- Thumb: `#1c2632` → hover `#2a3848`
- Width: `10px`
- `border-radius: 0` (square, terminal aesthetic)

---

## State Management

### Feed page
```ts
{
  tierFilter: 'all' | 'SHARK' | 'WHALE' | 'MEGA WHALE'
  streamPaused: boolean
  clusterBannerDismissed: boolean
  // from API
  bets: Bet[]        // sorted desc by timestamp, last 3h
  cluster: Cluster | null
}
```

### Wallet Detail
```ts
{
  wallet: {
    address: string
    firstTradeDate: Date
    totalLifetimeTrades: number
    bets: Bet[]           // all bets, most recent first
    resolvedBets: Bet[]   // subset where resolved
    cumulativePnl: number
    hitRate: number       // wins / resolved
    suspicionScore: number
    inCluster: boolean
    clusterId?: string
  }
}
```

### Cluster Alert
```ts
{
  cluster: {
    id: string
    market: string
    side: 'YES' | 'NO'
    oddsAtFlag: number
    members: { wallet: string; size: number; timestamp: Date }[]
    windowMinutes: number
    aggregateSize: number
  }
}
```

---

## Data Sources (from your spec)

| Source | Use |
|---|---|
| **Goldsky subgraph** | On-chain trade events from Polygon; wallet history |
| **Polymarket CLOB API** | Current market odds, market metadata |
| **Postgres** | Store processed bets, wallet records, cluster events, alert scores |
| **Python ingestion service** | Poll Goldsky every 60s, compute tiers + scores + cluster detection, write to Postgres |

**Key Polymarket data fields needed per trade:**
- `walletAddress`, `marketId`, `marketTitle`, `outcomeIndex` (YES/NO), `amount` (USD), `price` (= odds 0–1), `timestamp`, `transactionHash`

**Wallet history query:** count all past trades for `walletAddress` on Polymarket to get `lifetimeTrades`.

---

## Pages to Build (MVP)

1. `/` — Live Feed (this design)
2. `/wallet/[address]` — Wallet Detail (this design)
3. `/cluster/[id]` — Cluster Alert (this design)

**V2 (not in this design):**
- `/market/[id]` — Market Detail
- `/leaderboard` — Top wallets by win, hit rate, profit
- `/settings` — User-configurable thresholds

---

## Files in This Package

| File | Description |
|---|---|
| `Whale Watch.dc.html` | Full interactive HTML prototype — open in browser to explore all three views |
| `README.md` | This document |

Open `Whale Watch.dc.html` directly in a browser to navigate all views. Click any feed row to see Wallet Detail. Click `INVESTIGATE →` in the red cluster banner for the Cluster Alert view.
