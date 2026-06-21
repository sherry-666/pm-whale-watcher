# Whale Watch — Technical Design Document

A real-time analytics dashboard that monitors Polymarket for "emerging whale" activity — wallets with little or no trading history that suddenly place large bets on low-probability outcomes. Surfaces these as potential signals of insider activity.

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Polymarket APIs (all public, no auth)                │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Gamma API         │  │ CLOB API          │  │ Data API             │  │
│  │ gamma-api.        │  │ clob.polymarket   │  │ data-api.polymarket  │  │
│  │ polymarket.com    │  │ .com              │  │ .com                 │  │
│  │                   │  │                   │  │                      │  │
│  │ Market metadata,  │  │ Prices,           │  │ Trade history,       │  │
│  │ odds, search      │  │ order book        │  │ wallet activity      │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                     │                        │              │
│  ┌────────┴─────────────────────┴────────────────────────┘              │
│  │ CLOB WebSocket                                                       │
│  │ wss://ws-subscriptions-clob.polymarket.com/ws/market                 │
│  │ Real-time trade stream (no auth, persistent connection)              │
│  └──────────────────────────────┬──────────────────────────────────────┘│
└─────────────────────────────────┼──────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Backend — Python Ingestion Service                     │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │ REST Poller      │  │ WebSocket        │  │ Freshness Checker      │ │
│  │ (every 5 min)    │──│ Listener         │──│ Query wallet history   │ │
│  │ Market discovery │  │ Low-odds markets │  │ via Data API           │ │
│  └─────────────────┘  └────────┬────────┘  └───────────┬─────────────┘ │
│                                │                        │               │
│                       ┌────────▼────────┐  ┌───────────▼─────────────┐ │
│                       │ Tier Classifier  │──│ Alert Scorer            │ │
│                       │ SHARK/WHALE/MEGA │  │ Score formula [40–99]   │ │
│                       └─────────────────┘  └───────────┬─────────────┘ │
│                                                        │               │
│                                               ┌────────▼──────────┐    │
│                                               │ Cluster Detector  │    │
│                                               │ 3+ wallets, same  │    │
│                                               │ market+side, <60m │    │
│                                               └────────┬──────────┘    │
└────────────────────────────────────────────────────────┼───────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │    PostgreSQL        │
                                              │  (Railway managed)   │
                                              └──────────┬──────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Frontend — Next.js 14 (App Router)                    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ API Routes                                                      │    │
│  │ GET /api/feed    GET /api/wallet/[addr]    GET /api/cluster/[id]│    │
│  │ GET /api/stream (SSE — Server-Sent Events)                      │    │
│  └────────────────────────────┬────────────────────────────────────┘    │
│                               │                                         │
│  ┌────────────────────────────▼────────────────────────────────────┐    │
│  │ Pages                                                           │    │
│  │ /                    /wallet/[address]         /cluster/[id]     │    │
│  │ Live Feed            Wallet Detail             Cluster Alert     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Goldsky subgraph** | ❌ Not used | Deprecated as of April 2026. All data available via REST + WebSocket |
| **Real-time ingestion** | WebSocket (primary) + REST polling (discovery) | WebSocket for instant trade detection; REST for market discovery every 5 min |
| **Frontend ↔ Backend real-time** | Server-Sent Events (SSE) | One-directional push, simpler than WebSocket, works natively with Next.js API routes |
| **Wallet identity** | Proxy wallets (Gnosis Safes) | Polymarket uses proxy wallets, NOT EOAs. "Wallet age" = first trade on Polymarket — ideal for our freshness heuristic |

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | **Next.js 14** (App Router) | Per design spec. SSR + API routes in one project |
| Styling | **Tailwind CSS v3** | Per design spec. Custom config maps all design tokens |
| Font | **JetBrains Mono** (Google Fonts) | Per design spec. Monospace terminal aesthetic |
| Charts | **Recharts** + **custom SVG** | Recharts for P/L area chart; raw SVG for semicircle suspicion gauge |
| Database | **PostgreSQL** (Railway managed) | Railway-provisioned Postgres. Docker Compose for local dev |
| ORM | **Drizzle ORM** | SQL-first, type-safe, ~7KB bundle, excellent for complex analytics queries |
| Real-time (FE) | **Server-Sent Events** (SSE) | One-directional server→client push. Railway supports long-lived HTTP connections |
| Real-time (BE) | **CLOB WebSocket** | Public, no-auth persistent connection for live trade events |
| Ingestion | **Python** (asyncio) | Per design spec. Async WebSocket listener + REST polling |
| Package Manager | **pnpm** | Fast, disk-efficient |
| Deployment | **Railway** | Multi-service support (Next.js + Python + Postgres), managed infra, automatic deploys |
| Local DB | **Docker Compose** | `docker compose up` for local Postgres |

---

## 3. Data Sources — Polymarket API Map

### Three REST APIs + WebSocket

| API | Base URL | Endpoints We Use | Auth |
|---|---|---|---|
| **Gamma API** | `gamma-api.polymarket.com` | `GET /markets` — metadata, titles, outcome prices, search | None |
| **CLOB API** | `clob.polymarket.com` | `GET /price?token_id=X` — current price/odds | None |
| **Data API** | `data-api.polymarket.com` | `GET /trades?asset=TOKEN_ID` — trade history by market | None |
| | | `GET /trades?user=PROXY_WALLET` — wallet trade history | None |
| **CLOB WebSocket** | `wss://ws-subscriptions-clob.polymarket.com/ws/market` | Real-time `last_trade_price` events | None |

### WebSocket Subscription

```python
# Subscribe to low-odds markets for real-time trade events
await ws.send(json.dumps({
    "type": "market",
    "assets_ids": ["TOKEN_ID_1", "TOKEN_ID_2", ...]  # low-odds outcome token IDs
}))

# Incoming event:
{
    "event_type": "last_trade_price",
    "asset_id": "61918066498...",
    "price": "0.12",
    "side": "buy",
    "size": "250000",   # shares
    "timestamp": "1750473600"
}
```

### Field Mapping (Polymarket → Our Schema)

| Our Field | API Source | API Field | Notes |
|---|---|---|---|
| `wallet_address` | Data API | `proxyWallet` | Proxy wallet (Gnosis Safe), NOT EOA |
| `market_id` | Gamma API | `conditionId` | Hex market identifier |
| `market_title` | Gamma API | `question` | Human-readable market name |
| `side` (YES/NO) | Gamma API | `outcomes` + `clobTokenIds` | Map token ID → outcome index |
| `size_usd` | Data/WS | `size × price` | Shares × execution price |
| `odds` | CLOB/Gamma | `price` or `outcomePrices` | 0–1 probability |
| `bet_at` | Data/WS | `timestamp` | UNIX timestamp |
| `tx_hash` | ❌ Not available via REST | — | Would need on-chain indexing; skip for MVP |

### Rate Limits

All APIs enforce rate limits (429 responses). Strategy:
- Exponential backoff with jitter on 429s
- Cache market metadata (5-min TTL)
- Batch wallet history lookups
- WebSocket has no rate limit (persistent connection)

---

## 4. Database Schema

### Entity-Relationship Diagram

```
┌──────────────────┐       ┌──────────────────────────────────────────┐
│ wallets           │       │ flagged_bets                             │
│──────────────────│       │──────────────────────────────────────────│
│ address      PK  │◄──┐   │ id               PK  UUID               │
│ first_trade_at   │   ├───│ wallet_address    FK  → wallets          │
│ lifetime_trades  │   │   │ market_id         FK  → markets          │
│ created_at       │   │   │ tier              SHARK|WHALE|MEGA_WHALE │
│ updated_at       │   │   │ size_usd          FLOAT                  │
└──────────────────┘   │   │ odds              FLOAT                  │
                       │   │ side              YES|NO                 │
┌──────────────────┐   │   │ alert_score       INTEGER [40–99]        │
│ markets           │   │   │ result            OPEN|WON|LOST          │
│──────────────────│   │   │ pnl               FLOAT (nullable)       │
│ id           PK  │◄──┤   │ tx_hash           TEXT (nullable)         │
│ title            │   │   │ cluster_id        FK  → clusters          │
│ slug             │   │   │ bet_at            TIMESTAMPTZ             │
│ current_odds_yes │   │   │ flagged_at        TIMESTAMPTZ             │
│ current_odds_no  │   │   │ created_at        TIMESTAMPTZ             │
│ status           │   │   └──────────────────────────────────────────┘
│ created_at       │   │
│ updated_at       │   │   ┌──────────────────────────────────────────┐
└──────────────────┘   │   │ clusters                                  │
                       │   │──────────────────────────────────────────│
                       │   │ id               PK  UUID               │
                       ├───│ market_id         FK  → markets          │
                       │   │ side              YES|NO                 │
                       │   │ odds_at_flag      FLOAT                  │
                       │   │ aggregate_size    FLOAT                  │
                       │   │ member_count      INTEGER                │
                       │   │ window_minutes    INTEGER                │
                       │   │ detected_at       TIMESTAMPTZ             │
                       │   │ created_at        TIMESTAMPTZ             │
                       │   └──────────────────────────────────────────┘
                       │
                       │   ┌──────────────────────────────────────────┐
                       │   │ cluster_members                           │
                       │   │──────────────────────────────────────────│
                       │   │ id               PK  UUID               │
                       ├───│ cluster_id        FK  → clusters         │
                       ├───│ wallet_address    FK  → wallets          │
                       │   │ flagged_bet_id    FK  → flagged_bets     │
                       │   │ size_usd          FLOAT                  │
                       │   │ bet_at            TIMESTAMPTZ             │
                       │   │ note              TEXT                    │
                       │   └──────────────────────────────────────────┘
```

### SQL Migration

```sql
-- wallets
CREATE TABLE wallets (
  address         TEXT PRIMARY KEY,
  first_trade_at  TIMESTAMPTZ,
  lifetime_trades INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- markets
CREATE TABLE markets (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  slug             TEXT,
  current_odds_yes FLOAT,
  current_odds_no  FLOAT,
  status           TEXT DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- clusters (created before flagged_bets due to FK dependency)
CREATE TABLE clusters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id       TEXT NOT NULL REFERENCES markets(id),
  side            TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
  odds_at_flag    FLOAT NOT NULL,
  aggregate_size  FLOAT NOT NULL,
  member_count    INTEGER NOT NULL,
  window_minutes  INTEGER NOT NULL,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- flagged_bets
CREATE TABLE flagged_bets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address  TEXT NOT NULL REFERENCES wallets(address),
  market_id       TEXT NOT NULL REFERENCES markets(id),
  tier            TEXT NOT NULL CHECK (tier IN ('SHARK', 'WHALE', 'MEGA_WHALE')),
  size_usd        FLOAT NOT NULL,
  odds            FLOAT NOT NULL,
  side            TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
  alert_score     INTEGER NOT NULL,
  result          TEXT NOT NULL DEFAULT 'OPEN' CHECK (result IN ('OPEN', 'WON', 'LOST')),
  pnl             FLOAT,
  tx_hash         TEXT,
  cluster_id      UUID REFERENCES clusters(id),
  bet_at          TIMESTAMPTZ NOT NULL,
  flagged_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_flagged_bets_bet_at  ON flagged_bets(bet_at DESC);
CREATE INDEX idx_flagged_bets_wallet  ON flagged_bets(wallet_address);
CREATE INDEX idx_flagged_bets_tier    ON flagged_bets(tier);
CREATE INDEX idx_flagged_bets_cluster ON flagged_bets(cluster_id);

-- cluster_members
CREATE TABLE cluster_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id      UUID NOT NULL REFERENCES clusters(id),
  wallet_address  TEXT NOT NULL REFERENCES wallets(address),
  flagged_bet_id  UUID NOT NULL REFERENCES flagged_bets(id),
  size_usd        FLOAT NOT NULL,
  bet_at          TIMESTAMPTZ NOT NULL,
  note            TEXT
);
```

---

## 5. Data Pipeline (Python Ingestion Service)

### Pipeline Flow

```
                    ┌──────────────────────────────┐
                    │  Market Discovery (every 5m)  │
                    │                                │
                    │  1. GET /markets from Gamma    │
                    │  2. Filter: any outcome < 30%  │
                    │  3. Extract clobTokenIds       │
                    │  4. Update WS subscriptions    │
                    └──────────────┬─────────────────┘
                                   │
                    ┌──────────────▼─────────────────┐
                    │  Real-Time Trade Detection      │
                    │                                  │
                    │  CLOB WebSocket → trade event    │
                    │         │                        │
                    │         ▼                        │
                    │  size ≥ $25K? ──No──→ skip       │
                    │         │ Yes                    │
                    │         ▼                        │
                    │  Data API: wallet history        │
                    │         │                        │
                    │         ▼                        │
                    │  lifetime trades < 5? ──No──→ skip│
                    │         │ Yes                    │
                    │         ▼                        │
                    │  Classify tier (SHARK/WHALE/MEGA)│
                    │         │                        │
                    │         ▼                        │
                    │  Compute alert score [40–99]     │
                    │         │                        │
                    │         ▼                        │
                    │  Write to flagged_bets           │
                    │         │                        │
                    │         ▼                        │
                    │  Run cluster detection           │
                    └──────────────┬─────────────────┘
                                   │
                    ┌──────────────▼─────────────────┐
                    │  Cluster Detection              │
                    │                                  │
                    │  3+ fresh wallets, same market   │
                    │  + same side, within 60 min?     │
                    │         │                        │
                    │    Yes: create cluster record     │
                    │    No:  done                      │
                    └──────────────────────────────────┘
```

### Tier Definitions

| Tier | Min Bet Size | Max Odds | Color | Weight (for scoring) |
|---|---|---|---|---|
| SHARK | $25,000 | 30% | `#f5b942` (amber) | 20 |
| WHALE | $100,000 | 25% | `#ff8f3f` (orange) | 30 |
| MEGA WHALE | $500,000 | 20% | `#ff4d4d` (red) | 40 |

### Tier Classification

```python
def classify_tier(size_usd: float, odds: float) -> str | None:
    """Returns tier or None if bet doesn't qualify."""
    if size_usd >= 500_000 and odds < 0.20:
        return "MEGA_WHALE"
    if size_usd >= 100_000 and odds < 0.25:
        return "WHALE"
    if size_usd >= 25_000 and odds < 0.30:
        return "SHARK"
    return None
```

### Alert Score Formula

```python
def compute_alert_score(tier: str, size_usd: float, odds: float, lifetime_trades: int) -> int:
    tier_weight = {"MEGA_WHALE": 40, "WHALE": 30, "SHARK": 20}[tier]
    rarity_bonus = int((0.30 - odds) / 0.30 * 30)        # lower odds → higher score
    freshness_bonus = (5 - lifetime_trades) / 5 * 18       # fewer trades → higher score
    size_bonus = min(12, math.log10(size_usd) / 6 * 12)   # larger bet → higher score
    return max(40, min(99, round(tier_weight + rarity_bonus + freshness_bonus + size_bonus)))
```

Score color thresholds: ≥85 = `#ff4d4d` (red), ≥70 = `#ff8f3f` (orange), else `#f5b942` (amber)

### Suspicion Score Formula (Wallet Detail)

```python
def compute_suspicion(trades: int, odds: float, in_cluster: bool) -> int:
    score = 50
    score += (5 - trades) * 7                              # fewer trades → more suspicious
    score += int((0.30 - odds) / 0.30 * 22)               # lower odds → more suspicious
    score += 16 if in_cluster else 0                       # cluster membership adds suspicion
    score += random.randint(0, 8)                          # noise factor
    return min(98, score)
```

Suspicion label: ≥80 = `HIGHLY SUSPICIOUS`, ≥60 = `ELEVATED`, else `MODERATE`

### Cluster Detection Criteria

```python
def detect_clusters(recent_bets: list[FlaggedBet]) -> list[Cluster]:
    """
    Criteria for cluster detection:
    - 3+ wallets, each with < 5 total lifetime trades
    - All bet the same market
    - All bet the same side (YES or NO)
    - All bets within a 60-minute window
    """
    # 1. Group by (market_id, side)
    # 2. Filter to wallets with < 5 lifetime trades
    # 3. Sort by timestamp, sliding 60-min window
    # 4. If window contains 3+ unique wallets → flag as cluster
```

---

## 6. API Routes (Next.js)

### `GET /api/feed`

Returns the live feed data for the homepage.

```typescript
// Query params: ?tier=all|SHARK|WHALE|MEGA_WHALE&hours=3
// Response:
{
  bets: FlaggedBet[],           // sorted desc by bet_at, last 3h
  metrics: {
    volume24h: number,          // sum of size_usd in last 24h
    volumeDelta: string,        // % change vs prior 24h
    newWalletsToday: number,    // wallets with < 5 trades seen today
    hottestMarket: { title: string, betCount: number },
    biggestBetAllTime: number,
  },
  activeCluster: Cluster | null, // most recent unresolved cluster
  tierCounts: { all: number, SHARK: number, WHALE: number, MEGA_WHALE: number }
}
```

### `GET /api/wallet/[address]`

Returns full wallet detail for the drill-down view.

```typescript
// Response:
{
  address: string,
  firstTradeAt: string,         // ISO date
  lifetimeTrades: number,
  bets: WalletBet[],            // all bets, most recent first
  hitRate: number,              // wins / resolved bets
  realizedPnl: number,
  suspicionScore: number,       // 0–98
  inCluster: boolean,
  clusterId?: string,
  cumulativePnlSeries: number[], // for chart rendering
}
```

### `GET /api/cluster/[id]`

Returns cluster detail for the investigation view.

```typescript
// Response:
{
  id: string,
  market: { id: string, title: string },
  side: "YES" | "NO",
  oddsAtFlag: number,
  aggregateSize: number,
  memberCount: number,
  windowMinutes: number,
  members: {
    walletAddress: string,
    size: number,
    betAt: string,             // ISO date
    note: string,              // "first mover · opened position" or "mirror entry · same side"
  }[],
}
```

### `GET /api/stream` (Server-Sent Events)

Persistent SSE connection for real-time frontend updates.

```typescript
// Emits events:
// event: new_bet    — data: FlaggedBet   (new whale bet flagged)
// event: cluster    — data: Cluster      (new cluster detected)
// event: metrics    — data: Metrics      (periodic metrics refresh)
```

Client consumption:
```typescript
const es = new EventSource('/api/stream');
es.addEventListener('new_bet', (e) => {
  const bet = JSON.parse(e.data);
  // prepend to feed, trigger row entrance animation
});
```

---

## 7. Frontend Component Architecture

### Component Tree

```
RootLayout
├── TopBar                          (sticky, 52px)
│   ├── Logo (◑ glyph + WHALE WATCH wordmark)
│   ├── LiveBadge (blinking green dot)
│   ├── SearchInput
│   └── UtcClock (updates every 1s)
├── TickerStrip                     (30px, infinite scroll)
├── ClusterBanner                   (conditional, dismissable)
│
├── [/] FeedPage
│   ├── MetricsRow
│   │   └── MetricCard × 4
│   ├── FilterBar
│   │   ├── TierChip × 4 (ALL / SHARK / WHALE / MEGA)
│   │   └── StreamToggle
│   └── FeedTable
│       └── FeedRow × n
│           ├── TierBadge
│           ├── SideBadge
│           ├── ScoreBar
│           └── TimeAgo
│
├── [/wallet/[address]] WalletPage
│   ├── Breadcrumb (← LIVE FEED)
│   ├── WalletHeader
│   │   ├── StatGrid × 4 (Age, Trades, Hit Rate, P/L)
│   │   └── ClusterMemberBadge (conditional)
│   ├── SuspicionGauge (custom SVG semicircle)
│   ├── PnlChart (Recharts AreaChart)
│   └── BetsTable
│       └── BetRow × n
│
└── [/cluster/[id]] ClusterPage
    ├── Breadcrumb (← LIVE FEED)
    ├── PageTitle (pulsing red dot + COORDINATED ACTIVITY + CRITICAL badge)
    ├── ClusterMetrics × 4
    ├── TargetMarketCard
    └── CoordinationTimeline
        └── TimelineEntry × n
```

### Key Components

| Component | Description | Key Behaviors |
|---|---|---|
| `TopBar` | Sticky header with logo, LIVE badge, search, UTC clock | Clock updates every 1s via `useClock()` hook |
| `TickerStrip` | Infinite-scroll marquee of recent flagged bets | CSS `translateX(0 → -50%)`, 38s linear loop |
| `ClusterBanner` | Red gradient alert bar | Dismissable per session; INVESTIGATE → `/cluster/[id]` |
| `MetricCard` | Stats card with label + value + optional delta | Shared between Feed and Cluster views |
| `TierChip` | Filter button with count badge | Active = colored border + text matching tier |
| `FeedTable` | 8-column grid with animated row entrance | `translateY(-6px → 0)` + green flash, 1.1s ease-out |
| `SuspicionGauge` | SVG semicircle arc gauge, 120×64 viewBox | Custom `<path>` arc, colored by score threshold |
| `PnlChart` | Cumulative P/L line with area fill | Recharts `<AreaChart>`, zero baseline dashed, must use `"use client"` + `ssr: false` |
| `SideBadge` | YES (green) / NO (red) pill | `font-size: 10px`, `font-weight: 700`, `border-radius: 2px` |
| `ScoreBar` | Mini progress bar (34×4px) + numeric score | Bar fill color by score threshold |
| `TimeAgo` | Relative timestamp ("just now", "3m ago") | Updates every 2-3s via `useEffect` interval |
| `CoordinationTimeline` | Vertical timeline with red dots | Left-border `2px` line, wallet links navigate to `/wallet/[addr]` |

### Client-Side State

```typescript
// Global state via React Context + useReducer
interface FeedState {
  tierFilter: 'all' | 'SHARK' | 'WHALE' | 'MEGA_WHALE';
  streamPaused: boolean;
  clusterBannerDismissed: boolean;
  now: number;  // updated every 2-3s for relative timestamps
}

// Data fetching via SWR hooks
useFeed(tierFilter, hours)     // → GET /api/feed
useWallet(address)             // → GET /api/wallet/[address]
useCluster(id)                 // → GET /api/cluster/[id]

// Real-time via SSE
useEventStream()               // → GET /api/stream, mutates SWR cache on new events
```

### Interactions

| Interaction | Behavior |
|---|---|
| Click feed row | Navigate to `/wallet/[address]` |
| Click `INVESTIGATE →` in banner | Navigate to `/cluster/[id]` |
| Click `×` on banner | Dismiss banner for session |
| Click `⬡ CLUSTER MEMBER` badge | Navigate to `/cluster/[id]` |
| Click wallet in cluster timeline | Navigate to `/wallet/[address]` |
| Click `← LIVE FEED` | Return to feed |
| Click tier filter chip | Filter feed table to that tier |
| Click `STREAMING` / `STREAM PAUSED` | Toggle live data polling on/off |
| Click logo | Return to feed |

### Animations

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

## 8. Design Tokens

### Colors

| Token | Value | Usage |
|---|---|---|
| `bg-app` | `#06080c` | App background |
| `bg-surface` | `#0a0f16` | Cards, table background |
| `bg-bar` | `#080b10` | Top bar, ticker |
| `bg-header-row` | `#0c1219` | Table header rows |
| `bg-input` | `#0c1118` | Search input |
| `border-default` | `#1a2230` | Card borders |
| `border-subtle` | `#141b26` | Row dividers |
| `border-faint` | `#121925` | Inner row dividers |
| `text-primary` | `#e6edf3` | Main text, values |
| `text-secondary` | `#c7d2de` | Market names |
| `text-muted` | `#9aa7b6` | Wallet addresses |
| `text-dim` | `#6b7888` | Labels, timestamps |
| `text-faint` | `#4a5666` | Subtitles, hints |
| `text-ghost` | `#3a4452` | Footer text |
| `accent-green` | `#00e5a0` | LIVE indicator, YES side, positive P/L |
| `tier-shark` | `#f5b942` | Shark tier (amber) |
| `tier-whale` | `#ff8f3f` | Whale tier (orange) |
| `tier-mega` | `#ff4d4d` | Mega Whale tier (red) |
| `side-yes` | `#00e5a0` | YES side badge |
| `side-no` | `#ff5c7a` | NO side badge |
| `cluster-red` | `#ff4d4d` | Cluster alerts |

### Typography

All UI uses **JetBrains Mono** (monospace).

| Use | Size | Weight | Letter-spacing |
|---|---|---|---|
| Body / UI text | 13px | 400 | — |
| Wordmark (`WHALE WATCH`) | 13px | 700 | 1.5px |
| Table headers | 10px | 400 | 1px |
| Metric values | 24px | 700 | — |
| Wallet detail stats | 17px | 600 | — |
| Tier badges | 11px | 600 | 0.5px |
| Side badges | 10px | 700 | — |
| Scores | 12px | 700 | — |
| Timestamps | 11px | 400 | — |

### Spacing

- Content padding: `18px`
- Card padding: `14px 16px` (metric cards) / `18px 20px` (wallet detail cards)
- Grid gap: `12px` (metric cards) / `14px` (wallet detail)
- Row height: `46px` comfortable / `38px` compact (feed), `44px` (bet rows), `34px` (headers)

### Borders & Radius

- Cards: `border-radius: 4px`
- Buttons: `border-radius: 3px`
- Side badges: `border-radius: 2px`
- Tier tick bar: `3×14px`, `border-radius: 1px`

---

## 9. Tailwind Configuration

```typescript
// tailwind.config.ts
{
  theme: {
    extend: {
      colors: {
        ww: {
          'bg-app':        '#06080c',
          'bg-surface':    '#0a0f16',
          'bg-bar':        '#080b10',
          'bg-header-row': '#0c1219',
          'bg-input':      '#0c1118',
          'border':        '#1a2230',
          'border-subtle': '#141b26',
          'border-faint':  '#121925',
          'text-primary':  '#e6edf3',
          'text-secondary':'#c7d2de',
          'text-muted':    '#9aa7b6',
          'text-dim':      '#6b7888',
          'text-faint':    '#4a5666',
          'text-ghost':    '#3a4452',
          'accent-green':  '#00e5a0',
          'tier-shark':    '#f5b942',
          'tier-whale':    '#ff8f3f',
          'tier-mega':     '#ff4d4d',
          'side-yes':      '#00e5a0',
          'side-no':       '#ff5c7a',
          'cluster-red':   '#ff4d4d',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        wwIn:    { '0%': { background: 'rgba(0,229,160,.16)', transform: 'translateY(-6px)', opacity: '0' },
                   '60%': { opacity: '1', transform: 'translateY(0)' },
                   '100%': { background: 'transparent' } },
        wwBlink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.25' } },
        wwTick:  { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        wwPulse: { '0%': { boxShadow: '0 0 0 0 rgba(255,77,77,.45)' },
                   '70%': { boxShadow: '0 0 0 7px rgba(255,77,77,0)' },
                   '100%': { boxShadow: '0 0 0 0 rgba(255,77,77,0)' } },
      },
      animation: {
        'ww-in':    'wwIn 1.1s ease-out',
        'ww-blink': 'wwBlink 1.6s infinite',
        'ww-tick':  'wwTick 38s linear infinite',
        'ww-pulse': 'wwPulse 1.8s infinite',
      },
    }
  }
}
```

---

## 10. Project Structure

```
whale-watcher/
├── design/                          # Design handoff (existing)
│   ├── README.md
│   └── Whale Watch.dc.html
├── tdd.md                           # This document
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout: TopBar, Ticker, Banner, font imports
│   │   ├── page.tsx                 # Feed page (/)
│   │   ├── wallet/
│   │   │   └── [address]/
│   │   │       └── page.tsx         # Wallet detail
│   │   ├── cluster/
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Cluster alert
│   │   ├── api/
│   │   │   ├── feed/
│   │   │   │   └── route.ts         # GET /api/feed
│   │   │   ├── wallet/
│   │   │   │   └── [address]/
│   │   │   │       └── route.ts     # GET /api/wallet/[address]
│   │   │   ├── cluster/
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts     # GET /api/cluster/[id]
│   │   │   └── stream/
│   │   │       └── route.ts         # GET /api/stream (SSE)
│   │   └── globals.css              # Tailwind base + custom animations
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.tsx
│   │   │   ├── TickerStrip.tsx
│   │   │   └── ClusterBanner.tsx
│   │   ├── feed/
│   │   │   ├── MetricsRow.tsx
│   │   │   ├── MetricCard.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── TierChip.tsx
│   │   │   ├── StreamToggle.tsx
│   │   │   ├── FeedTable.tsx
│   │   │   └── FeedRow.tsx
│   │   ├── wallet/
│   │   │   ├── WalletHeader.tsx
│   │   │   ├── SuspicionGauge.tsx
│   │   │   ├── PnlChart.tsx
│   │   │   └── BetsTable.tsx
│   │   ├── cluster/
│   │   │   ├── ClusterMetrics.tsx
│   │   │   ├── TargetMarketCard.tsx
│   │   │   └── CoordinationTimeline.tsx
│   │   └── shared/
│   │       ├── SideBadge.tsx
│   │       ├── TierBadge.tsx
│   │       ├── ScoreBar.tsx
│   │       └── TimeAgo.tsx
│   ├── hooks/
│   │   ├── useFeed.ts
│   │   ├── useWallet.ts
│   │   ├── useCluster.ts
│   │   ├── useEventStream.ts
│   │   └── useClock.ts
│   ├── lib/
│   │   ├── db.ts                    # Drizzle client + connection
│   │   ├── schema.ts               # Drizzle table definitions
│   │   ├── seed.ts                  # Mock data seeder
│   │   ├── scoring.ts              # Tier classification + alert score + suspicion
│   │   ├── formatting.ts           # Currency formatting, time ago helpers
│   │   └── constants.ts            # Design tokens, tier definitions
│   └── types/
│       └── index.ts                 # Shared TypeScript types
├── ingestion/                       # Python service (Phase 2)
│   ├── main.py                      # Entry point, async event loop
│   ├── poller.py                    # REST market discovery (every 5 min)
│   ├── ws_listener.py               # WebSocket trade listener
│   ├── classifier.py                # Tier classification + scoring
│   ├── cluster_detector.py          # Cluster detection algorithm
│   └── requirements.txt
├── drizzle/
│   └── migrations/                  # SQL migration files
├── tailwind.config.ts
├── next.config.js
├── package.json
├── drizzle.config.ts
├── .env.local                       # Local dev: DATABASE_URL, etc.
├── .env.example                     # Template for env vars
├── docker-compose.yml               # Postgres for local dev
├── railway.json                     # Railway root config — defines services
├── Dockerfile                       # Next.js production build (for Railway)
└── ingestion/
    └── Dockerfile                   # Python ingestion service (for Railway)
```

---

## 11. Mock Data Seed Strategy

For Phase 1, the seed script generates realistic demo data matching the prototype:

- **22 flagged bets** across 10 markets, distributed across tiers
- **1 active cluster** — 4 fresh wallets betting NO on "Trump pardons crypto founder before Aug 1", 16% odds, within 52-minute window, aggregate $875K
- **Wallet histories** — each wallet gets 1–5 resolved bets with computed P/L
- **Simulated streaming** — SSE endpoint emits a new synthetic bet every ~11 seconds

Markets used for demo:
1. Fed cuts rates by 50bps in July
2. Trump pardons crypto founder before Aug 1
3. Bitcoin above $150K by Sept 30
4. OpenAI announces GPT-6 before July 15
5. Israel-Iran ceasefire holds through Q3
6. Nvidia splits stock again in 2026
7. SpaceX Starship reaches orbit by July 31
8. US government shutdown before Oct
9. Ethereum ETF staking approved by Aug
10. Major bank discloses BTC reserve in Q3

Seed command: `npx tsx src/lib/seed.ts`

---

## 12. Build Phases

### Phase 1: Frontend with Mock Data (MVP)

| Step | Task | Dependencies |
|---|---|---|
| 1 | Initialize Next.js 14 + Tailwind + JetBrains Mono | — |
| 2 | Set up Postgres (Docker) + Drizzle schema + seed script | — |
| 3 | Build API routes (`/api/feed`, `/api/wallet/[addr]`, `/api/cluster/[id]`) | Step 2 |
| 4 | Build shared components (SideBadge, TierBadge, ScoreBar, TimeAgo) | Step 1 |
| 5 | Build layout (TopBar, TickerStrip, ClusterBanner) | Step 4 |
| 6 | Build Feed page (MetricsRow, FilterBar, FeedTable) | Steps 3–5 |
| 7 | Build Wallet Detail page (WalletHeader, SuspicionGauge, PnlChart, BetsTable) | Steps 3–4 |
| 8 | Build Cluster Alert page (ClusterMetrics, TargetMarketCard, CoordinationTimeline) | Steps 3–4 |
| 9 | Implement SSE + `useEventStream` for simulated new bets | Steps 3, 6 |
| 10 | Polish: animations, hover states, responsive behavior | Steps 6–8 |

### Phase 2: Live Data Integration

1. Build Python ingestion service with async WebSocket listener
2. Connect to Gamma API for market discovery (low-odds outcome filtering)
3. Subscribe to CLOB WebSocket for real-time trade events
4. Integrate Data API for wallet history lookups (freshness detection)
5. Wire SSE to emit real-time events from the ingestion pipeline
6. Add rate-limit handling with exponential backoff

### Phase 3: Enhancements (V2)

1. `/market/[id]` — Market Detail page
2. `/leaderboard` — Top wallets by win rate, profit
3. `/settings` — User-configurable thresholds
4. Notifications (email/webhook on cluster detection)
5. On-chain indexing via Polygon RPC `eth_getLogs` for transaction hashes

---

## 13. Verification Plan

### Automated
- `npm run build` — Clean Next.js production build
- `npm run lint` — ESLint + TypeScript type checks
- `npx drizzle-kit push` — Verify schema against database

### Manual
- Open each route (`/`, `/wallet/[address]`, `/cluster/[id]`) and compare pixel-for-pixel against `Whale Watch.dc.html` prototype
- Verify all 9 interactions from design spec (row clicks, filters, stream toggle, banner, navigation)
- Verify 4 animations (row entrance, LIVE blink, ticker scroll, cluster pulse)
- Verify live behaviors: TimeAgo updates every 2-3s, UTC clock every 1s, new rows animate in

---

## 14. Railway Deployment

### Service Topology

Railway runs this as a **multi-service project** from a single monorepo:

```
Railway Project: whale-watcher
├── Service: web           (Next.js 14 — frontend + API routes)
├── Service: ingestion     (Python — WebSocket listener + poller)
└── Service: postgres      (Railway managed PostgreSQL)
```

All three services share the same Railway-provisioned Postgres instance via the internal network (private `DATABASE_URL`).

### `railway.json` (Root Config)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Note: With a monorepo, Railway auto-detects the Next.js service at the root. The Python `ingestion/` service is added as a separate service in the Railway dashboard, with its root directory set to `ingestion/`.

### Next.js Dockerfile

```dockerfile
# Dockerfile (root — Next.js web service)
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

Requires `next.config.js` to enable standalone output:

```javascript
// next.config.js
module.exports = {
  output: 'standalone',
}
```

### Python Ingestion Dockerfile

```dockerfile
# ingestion/Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
```

### Environment Variables

Railway auto-injects database credentials. Configure these in the Railway dashboard:

| Variable | Source | Used By |
|---|---|---|
| `DATABASE_URL` | Railway Postgres plugin (auto-injected via reference variable `${{Postgres.DATABASE_URL}}`) | web, ingestion |
| `DATABASE_PRIVATE_URL` | Railway internal network (use for service-to-service) | web, ingestion |
| `PORT` | Railway auto-sets (typically 3000) | web |
| `NODE_ENV` | Set to `production` | web |
| `NEXT_PUBLIC_APP_URL` | Custom domain or Railway-generated URL | web |

Local `.env.local` example:
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whalewatch
```

Railway `.env.example`:
```bash
# Railway auto-injects these — no manual config needed:
# DATABASE_URL=${{Postgres.DATABASE_URL}}
# DATABASE_PRIVATE_URL=${{Postgres.DATABASE_PRIVATE_URL}}

# Optional:
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
```

### SSE Compatibility on Railway

Railway supports long-lived HTTP connections, so SSE works out of the box. Key configuration:

```typescript
// src/app/api/stream/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // NOT 'edge' — edge has timeout limits

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // ... push events
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering if proxied
    },
  });
}
```

### Health Check

Add a health check endpoint for Railway's monitoring:

```typescript
// src/app/api/health/route.ts
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return Response.json({ status: 'error' }, { status: 503 });
  }
}
```

Configure in Railway dashboard: Health Check Path → `/api/health`

### Database Migrations on Deploy

Run Drizzle migrations automatically on deploy via a custom build command or release command:

```json
// package.json
{
  "scripts": {
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/lib/seed.ts",
    "postbuild": "pnpm db:migrate"
  }
}
```

Alternatively, use Railway's deploy hook to run migrations before the service starts.

### Railway Setup Steps

1. **Create project** on Railway dashboard
2. **Add PostgreSQL** — Click "+ New" → "Database" → "PostgreSQL"
3. **Add web service** — Connect GitHub repo, root directory = `/` (auto-detects Next.js)
4. **Add ingestion service** — Click "+ New" → "Service" → same repo, set root directory = `ingestion/`
5. **Link Postgres** — Add `DATABASE_URL` reference variable (`${{Postgres.DATABASE_URL}}`) to both web and ingestion services
6. **Set health check** — web service → Settings → Health Check Path = `/api/health`
7. **Configure domain** — web service → Settings → Generate Domain or add custom domain
8. **Deploy** — Push to main branch triggers automatic deploy of all services

### Railway Pricing Consideration

| Service | Expected Resource Usage |
|---|---|
| **web** (Next.js) | ~256MB RAM, minimal CPU. Standard tier sufficient |
| **ingestion** (Python) | ~128MB RAM, low CPU (mostly idle, wakes on WS events). Worker-tier pricing |
| **postgres** | Starter plan (~1GB storage) sufficient for MVP; grows with trade history |

Railway's Hobby plan ($5/mo + usage) should cover MVP. Scale to Pro for production traffic.

### Local Development vs. Railway

| Concern | Local | Railway |
|---|---|---|
| Database | `docker compose up` (Postgres in Docker) | Railway-managed Postgres |
| Next.js | `pnpm dev` (port 3000) | Nixpacks build → standalone Node server |
| Ingestion | `python ingestion/main.py` | Separate service, Dockerfile |
| Env vars | `.env.local` | Railway dashboard / reference variables |
| SSE | Works natively | Works natively (long-lived HTTP supported) |
| Migrations | `pnpm db:migrate` manually | Auto-runs via `postbuild` script |
