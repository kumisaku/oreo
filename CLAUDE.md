# Oreo — Personal Finance Tracker

> Read this file fully before touching any code. It encodes hard-won decisions that aren't obvious from the source.

## What this is

A personal multi-profile finance tracker PWA. Currently a **single-file React prototype** (`oreo-prototype.jsx`, ~4 800 lines). The goal is to turn this prototype into a real, shippable app — ideally with a proper project structure, backend/sync, and mobile-first PWA shell.

---

## Stack (current prototype)

| Concern | Choice |
|---|---|
| Framework | React 18 (hooks) |
| State | `useState` + `localStorage` (key: `oreo:state:v9`) |
| Styling | Inline styles everywhere — no Tailwind, no CSS modules |
| Charts | Custom SVG (GrowthChart, CashFlowChart, Donut, Sparkline) |
| Icons | `lucide-react` |
| Fonts | Bricolage Grotesque (display), JetBrains Mono (numbers), Spline Sans (body) — all from Google Fonts |
| Investments API | CoinGecko (live crypto prices) |
| AI | Anthropic claude-sonnet-4-20250514 via `/v1/messages` |
| Export | SheetJS (`xlsx`) |

## Stack (target app)

Recommended direction:
- **Vite + React** (not Next.js — no SSR needed, pure client app)
- **Tailwind CSS v4** — replace all inline styles
- Same fonts, same icon library
- **Supabase** for auth + sync (user owns their data, profiles stored per-user)
- Keep the Anthropic AI integration
- PWA via `vite-plugin-pwa`

---

## Architecture of the prototype

### Single-file structure

```
oreo-prototype.jsx
├── Module-level constants (lines 1–100)
│   ├── seed()          — demo data factory
│   ├── lightTheme / darkTheme
│   ├── catColor(cat)   — deterministic category → hex color (MUST stay at module level)
│   └── Helper fns: fmtIDR, fmtUSD, fmtCompact, todayISO, daysAgo, etc.
│
├── Module-level components (lines 100–700)
│   ├── CcyToggle, Card, Label, Empty, ShowMoreBar
│   ├── Sparkline, GrowthChart, CashFlowChart, Donut, Legend
│   ├── MobileSection, ChartRangeBar, Chip, FilterBar, FilterSheet
│   ├── AccountManager, CategoryManager, CSVImport, AddModal
│   └── Header, TxnRow
│
└── export default function Oreo()  (lines 697–3 400)
    ├── ALL useState/useEffect/useRef hooks  ← MUST be before early return
    ├── Early return at line ~820 when !state (loading screen)
    ├── Computed values (accountBalances → totals → insights → nodes)
    ├── dashDesktop / dashMobile / activityContent / subsContent / investContent
    └── Final JSX render (sidebar + top bar + content)
```

### Critical rules

1. **Never define React components inside `Oreo()`** — causes hooks-in-loops violations. All components must be at module level.
2. **All hooks before the `if (!state)` early return** — this is around line 820. Any `useState/useEffect/useRef` after it will throw.
3. **`catColor` is module-level** — used everywhere for consistent category → color mapping. Do not redefine inside components.
4. **`let T`, `let DISPLAY`, `let PRIVATE`, `let USD_IDR`** — module-level `let`s reassigned each render inside Oreo. Components that use `T` get it from the module scope.

---

## Data model

### State shape (localStorage `oreo:state:v9`)

```ts
{
  active: string,           // active profile id
  firstRun: boolean,
  profiles: Profile[],
}

Profile {
  id: string
  name: string
  type: "personal" | "business"
  data: ProfileData
}

ProfileData {
  accounts: Account[]
  transactions: Transaction[]
  subscriptions: Subscription[]
  holdings: Holding[]
  investmentTransactions: InvestmentTransaction[]
  goals: Goal[]
  budgets: Budget[]
  categories: Category[]
  history: MonthHistory[]
}
```

### Key types

```ts
Account       { id, name, provider, kind: "asset"|"liability", opening: number }
Transaction   { id, type: "income"|"expense"|"transfer", amount, cat, acct, note, date, recurring?, toAcct? }
Subscription  { id, merchant, amount, cycle: "weekly"|"monthly"|"yearly", acct, next }
Holding       { id, ticker, platform, type: "stock"|"crypto"|"etf"|"fund", qty, avg, price, ccy: "IDR"|"USD" }
InvTxn        { id, holdingId, type: "buy"|"sell"|"dividend", qty, price, fees, date, note, realized? }
Goal          { id, name, target, current, deadline, kind: "save"|"debt", linkedAccounts: string[] }
Budget        { id, cat, monthly }
Category      { name, type: "expense"|"income" }
MonthHistory  { m: "YYYY-MM", date, income, expense }
```

---

## Theme system

Two theme objects (`lightTheme`, `darkTheme`) assigned to module-level `let T` on each render. Key tokens:

```js
T.bg           // page background
T.panelSolid   // card background
T.panel2       // inner panel / input background
T.line         // border color
T.ink          // primary text
T.sub          // secondary text
T.faint        // tertiary / hint text
T.gold         // brand blue (#2f6bff light / #5b8cff dark)
T.gold2        // lighter brand blue
T.goldDeep     // darker brand blue
T.greenDeep    // income / positive
T.red          // expense / negative / danger
T.shadow       // box-shadow for cards
T.shadowMd     // medium shadow
T.shadowLg     // large shadow (modals)
// Sidebar (always dark regardless of theme):
T.sidebar      // sidebar bg
T.sidebarText  // sidebar text muted
T.sidebarTextActive // sidebar text active
T.sidebarLine  // sidebar dividers
// Typography:
T.display      // 'Bricolage Grotesque'
T.mono         // 'JetBrains Mono'
T.body         // 'Spline Sans'
```

---

## Key computed values (order matters in Oreo)

```
accountBalances (includes holdingsVal per platform account)
→ assetAccounts, liabAccounts
→ totalAssets = assetAccounts.reduce(bal + holdingsVal)   ← includes holdings
→ totalCash   = assetAccounts.reduce(bal only)            ← for netWorth calc
→ totalLiab, invValue, invCost, totalRealized
→ netWorth = totalCash + invValue - totalLiab             ← no double-count
→ rangeBounds  (dashboard date range: chartRange/chartFrom/chartTo)
→ invRangeBounds (investments date range: invRange/invFrom/invTo — INDEPENDENT)
→ statTx, revenue, expense, profit
→ budgetProgress (range-aware)
→ goals (with onTrack, monthlyShortfall, daysToDeadline)
→ insights[], notifications[], upcoming, renewalsList
→ portfolioSeries (uses invRangeBounds)
```

---

## Features implemented

| Feature | Status |
|---|---|
| Dashboard — hero strip (net worth + stats + sparkline) | ✅ |
| Dashboard — growth chart + cash flow chart + breakdown | ✅ |
| Dashboard — right panel (Insights, Accounts, Goals, Budgets, Upcoming) | ✅ |
| Dashboard — AI Explore (real Anthropic API, conversation history) | ✅ |
| Activity — date-grouped transactions, category chips, summary strip | ✅ |
| Activity — bulk categorization (select mode + category bar) | ✅ |
| Activity — recurring management (edit series, pause) | ✅ |
| Subscriptions — cards with renewal countdown bars, summary header | ✅ |
| Investments — portfolio chart, allocation donut, holdings grid | ✅ |
| Investments — trade log (buy/sell/dividend), realized P&L | ✅ |
| Investments — live prices via CoinGecko | ✅ |
| Investments — empty state with asset-type guidance | ✅ |
| AddModal — txn (big amount, color chips), sub, goal, budget, hold, trade | ✅ |
| Account management (add/edit/delete) | ✅ |
| Category management | ✅ |
| CSV import (auto-detect delimiter/BOM, column mapping, preview) | ✅ |
| Profile switching (Personal / Business) | ✅ |
| Dark mode | ✅ |
| Privacy mode (blur amounts) | ✅ |
| Export to Excel | ✅ |
| PWA / offline | ❌ needs vite-plugin-pwa |
| Backend sync | ❌ all data in localStorage only |
| Auth | ❌ no login |
| Push notifications | ❌ |
| Receipt scan (camera → AI) | ❌ |
| Budget forecasting | ❌ |
| Multi-currency auto-conversion | partial — USD_IDR rate fetched but manual |

---

## CSS class names (used throughout)

| Class | Purpose |
|---|---|
| `.lg-btn` | Any button — handles hover/active transitions |
| `.lg-row` | Clickable list rows — hover background |
| `.lg-nav` | Sidebar nav items |
| `.lg-card-btn` | Cards that lift on hover |
| `.lg-rise` | `animation: rise` entrance |
| `.lg-pop` | `animation: pop` entrance |
| `.lg-modal` | `animation: modalIn` entrance |
| `.lg-sheet` | `animation: sheetIn` entrance (bottom sheet) |
| `.lg-toast` | `animation: toastIn` entrance |
| `.lg-tab-content` | Tab switch fade |
| `.lg-chip` | Pill/badge elements |

All animations defined in the `<style>` tag injected by the `Oreo` component.

---

## Validation commands

Run these after every significant edit:

```bash
# 1. Bracket balance (must all be 0 0 0)
node -e "const s=require('fs').readFileSync('oreo-prototype.jsx','utf8');let b=0,p=0,r=0;for(const c of s){if(c=='{')b++;if(c=='}')b--;if(c=='(')p++;if(c==')')p--;if(c=='[')r++;if(c==']')r--;}console.log('balance',b,p,r)"

# 2. No hooks after early return
python3 -c "
import re
with open('oreo-prototype.jsx') as f: lines = f.readlines()
oreo_s = next(i for i,l in enumerate(lines) if 'export default function Oreo' in l)
er = next(i for i,l in enumerate(lines[oreo_s:], oreo_s) if 'if (!state) {' in l)
next_fn = next(i for i,l in enumerate(lines[oreo_s+10:], oreo_s+10) if re.match(r'^(function |const [A-Z])', l))
bad = [(i+1,l.strip()[:60]) for i,l in enumerate(lines[er:next_fn],er) if re.search(r'\buseState\b|\buseEffect\b|\buseRef\b',l) and not l.strip().startswith('//') and 'function ' not in l[:20]]
print(f'Bad hooks: {len(bad)}')
"

# 3. TypeScript check
cp oreo-prototype.jsx /tmp/check.tsx && \
npx tsc --noEmit --jsx react-jsx --allowJs --skipLibCheck --target esnext --module esnext --moduleResolution node /tmp/check.tsx 2>&1 | grep -E "error TS1" | head -5; echo "TSC clean"
```

---

## Migration plan (prototype → real app)

### Step 1 — Scaffold

```bash
npm create vite@latest oreo-app -- --template react
cd oreo-app
npm install
npm install lucide-react xlsx
npm install -D tailwindcss @tailwindcss/vite
```

### Step 2 — Copy prototype

Copy `oreo-prototype.jsx` → `src/App.jsx`. Run the app. Fix any Vite-specific issues (mostly import paths).

### Step 3 — Extract components

Break the monolith into files. Suggested structure:

```
src/
├── main.jsx
├── App.jsx              (root, state, routing)
├── theme.js             (lightTheme, darkTheme, catColor)
├── seed.js              (demo data)
├── utils/
│   ├── format.js        (fmtIDR, fmtCompact, etc.)
│   ├── dates.js         (todayISO, daysAgo, etc.)
│   └── compute.js       (accountBalances, netWorth, insights, etc.)
├── components/
│   ├── ui/              (Card, Label, Empty, Chip, ChartRangeBar, etc.)
│   ├── charts/          (GrowthChart, CashFlowChart, Donut, Sparkline)
│   ├── modals/          (AddModal, AccountManager, CategoryManager, FilterSheet, CSVImport)
│   └── layout/          (Sidebar, TopBar, MobileNav)
├── views/
│   ├── Dashboard.jsx    (dashDesktop + dashMobile)
│   ├── Activity.jsx     (activityContent)
│   ├── Subscriptions.jsx
│   └── Investments.jsx
└── hooks/
    ├── useOreoState.js  (localStorage read/write, profile switching)
    └── useAI.js         (Anthropic API, conversation history)
```

### Step 4 — Replace inline styles with Tailwind

The design tokens map cleanly to Tailwind custom properties. Add to `tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      brand: { DEFAULT: '#2f6bff', light: '#6ea0ff', deep: '#1c4fd6' },
      income: '#15a34a',
      expense: '#f43f6e',
    },
    fontFamily: {
      display: ['Bricolage Grotesque', 'Georgia', 'serif'],
      mono: ['JetBrains Mono', 'monospace'],
      body: ['Spline Sans', 'system-ui', 'sans-serif'],
    }
  }
}
```

### Step 5 — Add Supabase

```bash
npm install @supabase/supabase-js
```

Schema:
```sql
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  type text default 'personal',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "users own their profiles" on profiles
  for all using (auth.uid() = user_id);
```

Replace `useOreoState` localStorage logic with Supabase realtime sync.

### Step 6 — PWA

```bash
npm install -D vite-plugin-pwa
```

Add to `vite.config.js`:
```js
import { VitePWA } from 'vite-plugin-pwa'
export default {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Oreo Finance',
        short_name: 'Oreo',
        theme_color: '#2f6bff',
        background_color: '#0d0f14',
        display: 'standalone',
      }
    })
  ]
}
```

---

## Things NOT to change

- The `catColor()` hash function — changing it would make all existing color associations inconsistent with stored user data.
- The `oreo:state:v9` localStorage key — bumping the version wipes everyone's data. If the schema changes, write a migration function.
- The `netWorth = totalCash + invValue - totalLiab` formula — `totalCash` deliberately excludes holdingsVal to avoid double-counting with `invValue`.
- The independent date ranges: `chartRange` for dashboard, `invRange` for investments.

---

## Known rough edges to fix

- No backend — everything in localStorage, no sync across devices
- The `pdata.transactions.filter(...)` pattern is O(n) called many times per render — needs memoization (`useMemo`) as data grows
- `seed()` generates fresh IDs with `Math.random()` — not deterministic for testing
- The AI conversation is cleared on profile switch and on panel dismiss — intentional
- Subscription renewal auto-advance is in a `useEffect` that fires on every `state?.active` change — could advance multiple times on hot reload

---

*Last updated: after comprehensive polish pass — budget form, account manager, holding detail redesign, investment empty state, bulk categorize, sidebar profile polish, dark mode contrast.*
