import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  LayoutDashboard, ArrowLeftRight, RefreshCw, TrendingUp, Plus,
  ChevronDown, Wallet, Building2, X, ArrowUpRight, ArrowDownRight,
  Calendar, Bell, Check, Sparkles, Search, SlidersHorizontal, Download,
  Sun, Moon, Eye, EyeOff, Target, Tag, Settings,
  AlertTriangle, Clock, Zap, Info, Inbox, TrendingDown, ShieldAlert, BarChart3, Trash2
} from "lucide-react";
import { lightTheme, darkTheme, catColor, PALETTE, PROVIDER_COLORS, providerColor } from './theme.js';
import { seed, todayISO, daysFromNow, daysAgo } from './seed.js';
import { T, USD_IDR, DISPLAY, PRIVATE, applyGlobals } from './globals.js';
import { fmtIDR, fmtUSD, fmtDisp, fmtDispBare, fmtCompact } from './utils/format.js';
import { KEY, loadState, saveState } from './utils/storage.js';
import { auth, hasFirebase } from './lib/firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Login from './components/Login.jsx';
import { Money, CcyToggle, Card, Label, Empty, ShowMoreBar, MobileSection } from './components/ui.jsx';
import { Sparkline, GrowthChart, CashFlowChart, Donut, Legend } from './components/charts.jsx';
import { ChartRangeBar, Chip } from './components/ChartRangeBar.jsx';
import FilterBar from './components/FilterBar.jsx';
import { Header, TxnRow } from './components/TxnRow.jsx';
import CSVImport from './components/modals/CSVImport.jsx';
import AccountManager from './components/modals/AccountManager.jsx';
import CategoryManager from './components/modals/CategoryManager.jsx';
import FilterSheet from './components/modals/FilterSheet.jsx';
import AddModal from './components/modals/AddModal.jsx';
import ExportModal from './components/modals/ExportModal.jsx';

export default function Oreo() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("dash");
  const [profMenu, setProfMenu] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAcctMgr, setShowAcctMgr] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingProfileName, setEditingProfileName] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [usdIdr, setUsdIdr] = useState(16250);
  const [rateTs, setRateTs] = useState(0);
  const [aiHistory, setAiHistory] = useState([]);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null); // { kind: "txn"|"sub", item }
  const [q, setQ] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [bulkSel, setBulkSel] = useState(new Set()); // selected txn ids for bulk categorize
  const [bulkCat, setBulkCat] = useState("");
  const [toast, setToast] = useState("");
  const [toastTimer, setToastTimer] = useState(null);
  const showToast = (msg, duration = 2500) => {
    setToast(msg);
    if (toastTimer) clearTimeout(toastTimer);
    const t = setTimeout(() => setToast(""), duration);
    setToastTimer(t);
  };
  const _prefs = (() => { try { return JSON.parse(localStorage.getItem("oreo:prefs") || "{}"); } catch { return {}; } })();
  const [disp, setDisp] = useState(_prefs.disp || "IDR");
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" && window.innerWidth >= 900);
  const [chartView, setChartView] = useState("growth");
  const [chartViewOpen, setChartViewOpen] = useState(false);
  const [ai, setAi] = useState("");
  const [aiResult, setAiResult] = useState(null); // { query, summary, total, matching, breakdown, suggestions }
  const [theme, setTheme] = useState(_prefs.theme || "light");
  const [chartRange, setChartRange] = useState("month");
  const [chartFrom, setChartFrom] = useState("");
  const [chartTo, setChartTo] = useState("");
  const [invRange, setInvRange] = useState("1y");
  const [invFrom, setInvFrom] = useState("");
  const [invTo, setInvTo] = useState("");
  const [invView, setInvView] = useState("timeline");
  const [invViewOpen, setInvViewOpen] = useState(false);
  const [privacy, setPrivacy] = useState(_prefs.privacy || false);
  const [undoStack, setUndoStack] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [dashCollapsed, setDashCollapsed] = useState({ insights: false, accounts: false, goals: false, budgets: false, upcoming: true, recurring: false });
  const [showAllSections, setShowAllSections] = useState({});
  const toggleShowAll = (k) => setShowAllSections((s) => ({ ...s, [k]: !s[k] }));
  const toggleSection = (k) => setDashCollapsed((s) => ({ ...s, [k]: !s[k] }));
  const aiInputRef = useRef(null);
  const [pullDist, setPullDist] = useState(0);
  const pullStartY = useRef(0);
  const [f, setF] = useState({ type: "all", cats: [], accts: [], range: "all", from: "", to: "", min: "", max: "", platform: "all", asset: "all", pl: "all", sort: "newest" });
  const resetFilters = () => { setF({ type: "all", cats: [], accts: [], range: "all", from: "", to: "", min: "", max: "", platform: "all", asset: "all", pl: "all", sort: "newest" }); setQ(""); };

  // Auth listener — runs once, keeps user in sync
  useEffect(() => {
    if (!hasFirebase) { setUser(null); return; }
    const unsub = onAuthStateChanged(auth, (fbUser) => setUser(fbUser ?? null));
    return unsub;
  }, []);

  // Load state once we know auth status
  useEffect(() => {
    if (user === undefined) return; // still loading auth
    loadState(user?.uid).then(setState);
  }, [user?.uid]);

  useEffect(() => { if (state) saveState(state, user?.uid); }, [state]);
  useEffect(() => { localStorage.setItem("oreo:prefs", JSON.stringify({ theme, privacy, disp })); }, [theme, privacy, disp]);

  // Migration: add ShopeePay wallet to all profiles that don't have it yet
  useEffect(() => {
    if (!state) return;
    let changed = false;
    const newData = { ...state.data };
    for (const profId of Object.keys(newData)) {
      const prof = newData[profId];
      const accounts = prof.accounts || [];
      if (!accounts.some((a) => a.name === "ShopeePay" && a.kind === "asset")) {
        newData[profId] = { ...prof, accounts: [...accounts, { id: `sp_${profId}`, name: "ShopeePay", provider: "Shopee", kind: "asset", opening: 0 }] };
        changed = true;
      }
    }
    if (changed) setState((s) => ({ ...s, data: newData }));
  }, [state?.active]);

  // Real-time USD/IDR rate — refreshes every hour
  useEffect(() => {
    const CACHE_KEY = "oreo:usdIdr:v2"; // v2 busts old stale caches
    const HOUR = 60 * 60 * 1000;
    const fetchRate = async () => {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
        if (cached && cached.rate > 10000 && cached.rate !== 16250 && Date.now() - cached.ts < HOUR) {
          setUsdIdr(cached.rate);
          setRateTs(cached.ts);
          return;
        }
        const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=IDR");
        const data = await res.json();
        const rate = Math.round(data.rates.IDR);
        if (rate > 10000) {
          const ts = Date.now();
          setUsdIdr(rate);
          setRateTs(ts);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, ts }));
        }
      } catch (_) {}
    };
    fetchRate();
    const interval = setInterval(fetchRate, HOUR);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Desktop keyboard shortcuts: ⌘+N add, / focus Explore, ⌘+1-4 switch tabs
  useEffect(() => {
    const onKey = (e) => {
      const inField = ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName) || e.target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        const k = tab === "sub" ? "sub" : tab === "inv" ? "hold" : "txn";
        setModal(k); setEditing(null);
        return;
      }
      if (!inField && e.key === "/") {
        e.preventDefault();
        setAiExpanded(true);
        setTimeout(() => document.getElementById("oreo-ai-input")?.querySelector("input,textarea")?.focus(), 60);
        return;
      }
      if (mod && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        setTab(["dash", "txn", "sub", "inv"][parseInt(e.key) - 1]);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab]);

  // Recurring auto-creation — only next missed instance within 7-day window (no retroactive flood)
  useEffect(() => {
    if (!state) return;
    const p = state.data[state.active];
    if (!p) return;
    const today = todayISO();
    const cutoff = daysAgo(7);
    const sig = (x) => `${x.type}|${x.cat}|${x.amount}|${x.note}|${x.acct}`;
    const newTxns = [];
    const seen = new Set();
    p.transactions.forEach((t) => {
      if (!t.recurring) return;
      const s = sig(t); if (seen.has(s)) return; seen.add(s);
      const cycleDays = t.recurring === "weekly" ? 7 : 30;
      let lastDate = t.date;
      p.transactions.forEach((x) => { if (sig(x) === s && x.date > lastDate) lastDate = x.date; });
      const nextDate = new Date(new Date(lastDate + "T00:00:00").getTime() + cycleDays * 864e5).toISOString().slice(0, 10);
      if (nextDate >= cutoff && nextDate <= today) {
        const already = p.transactions.some((x) => sig(x) === s && x.date === nextDate);
        if (!already) newTxns.push({ ...t, id: "t" + Date.now() + Math.random().toString(36).slice(2, 6), date: nextDate });
      }
    });
    if (newTxns.length > 0) {
      setState((s) => ({ ...s, data: { ...s.data, [s.active]: { ...s.data[s.active], transactions: [...newTxns, ...s.data[s.active].transactions] } } }));
      showToast(`↻ Created ${newTxns.length} recurring entr${newTxns.length === 1 ? "y" : "ies"}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.active]);

  // Auto-advance subscription renewal dates that have passed
  useEffect(() => {
    if (!state) return;
    const p = state.data[state.active];
    if (!p?.subscriptions?.length) return;
    const today = todayISO();
    const updated = p.subscriptions.map((s) => {
      if (!s.next || s.next > today) return s;
      const cycleDays = s.cycle === "yearly" ? 365 : s.cycle === "weekly" ? 7 : 30;
      let next = s.next;
      let guard = 0;
      while (next <= today && guard++ < 60) {
        const d = new Date(next + "T00:00:00");
        d.setDate(d.getDate() + cycleDays);
        next = d.toISOString().slice(0, 10);
      }
      return next !== s.next ? { ...s, next } : s;
    });
    if (updated.some((s, i) => s.next !== p.subscriptions[i].next)) {
      setState((prev) => ({ ...prev, data: { ...prev.data, [prev.active]: { ...prev.data[prev.active], subscriptions: updated } } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.active]);

  // Clear AI context when switching profiles
  useEffect(() => {
    setAiHistory([]);
    setAiResult(null);
    setAi("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.active]);

  // Auto-refresh prices once on load when holdings exist
  const didAutoRefresh = useRef(false);
  useEffect(() => {
    if (didAutoRefresh.current) return;
    if (!state) return;
    const holdings = state.profiles?.find((p) => p.id === state.active)?.data?.holdings || [];
    if (holdings.length === 0) return;
    didAutoRefresh.current = true;
    // Small delay so UI renders first
    const t = setTimeout(() => refreshPrices(), 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Apply theme before auth/loading gates so Login and loading screen get correct colors
  applyGlobals(theme === "dark" ? darkTheme : lightTheme, usdIdr, disp, privacy);

  // Firebase auth loading (undefined = still resolving)
  if (user === undefined) {
    return <div style={{ background: T.bg, color: T.sub, minHeight: '100dvh', display: "grid", placeItems: "center", fontFamily: T.body }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={16} color={T.gold} /> Loading…</div>
    </div>;
  }

  // Not signed in — show Google sign-in
  if (user === null) {
    return <Login theme={T} />;
  }

  if (!state) {
    return <div style={{ background: T.bg, color: T.sub, minHeight: "100dvh", display: "grid", placeItems: "center", fontFamily: T.body }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={16} color={T.gold} /> Loading Oreo…</div>
    </div>;
  }

  const pdata = state.data[state.active];
  const profile = state.profiles.find((p) => p.id === state.active);
  const setPData = (patch) => setState((s) => ({ ...s, data: { ...s.data, [s.active]: { ...s.data[s.active], ...patch } } }));

  const monthTx = pdata.transactions;

  // Compute monthly history live from transactions so the cashflow/growth charts
  // always reflect what the user actually added, not the static stored array.
  const liveHistory = (() => {
    const map = {};
    (pdata.transactions || []).forEach((t) => {
      if (!t.date || t.type === "transfer") return;
      const m = t.date.slice(0, 7);
      if (!map[m]) map[m] = { m, date: `${m}-01`, income: 0, expense: 0 };
      if (t.type === "income") map[m].income += t.amount;
      else if (t.type === "expense") map[m].expense += t.amount;
    });
    // Include stored history months that have no transactions (historical seed data)
    (pdata.history || []).forEach((h) => { if (!map[h.m]) map[h.m] = h; });
    return Object.values(map).sort((a, b) => a.m.localeCompare(b.m));
  })();

  // Unified range bounds — chartRange drives BOTH stats and charts
  const rangeBounds = (() => {
    const today = new Date();
    const localISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (chartRange === "month") { const s = new Date(today.getFullYear(), today.getMonth(), 1); return { from: localISO(s), to: todayISO(), label: "This month" }; }
    if (chartRange === "lastmo") { const s = new Date(today.getFullYear(), today.getMonth() - 1, 1); const e = new Date(today.getFullYear(), today.getMonth(), 0); return { from: localISO(s), to: localISO(e), label: "Last month" }; }
    if (chartRange === "3m") return { from: daysAgo(89), to: todayISO(), label: "Last 3 months" };
    if (chartRange === "6m") return { from: daysAgo(179), to: todayISO(), label: "Last 6 months" };
    if (chartRange === "1y") return { from: daysAgo(364), to: todayISO(), label: "Last year" };
    if (chartRange === "custom" && chartFrom && chartTo) return { from: chartFrom, to: chartTo, label: "Custom" };
    const dates = pdata.transactions.map((t) => t.date).sort();
    return { from: dates[0] || todayISO(), to: todayISO(), label: "All time" };
  })();

  // Independent range for Investments tab
  const invRangeBounds = (() => {
    const today = new Date();
    const localISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (invRange === "month") { const s = new Date(today.getFullYear(), today.getMonth(), 1); return { from: localISO(s), to: todayISO(), label: "This month" }; }
    if (invRange === "lastmo") { const s = new Date(today.getFullYear(), today.getMonth() - 1, 1); const e = new Date(today.getFullYear(), today.getMonth(), 0); return { from: localISO(s), to: localISO(e), label: "Last month" }; }
    if (invRange === "3m") return { from: daysAgo(89), to: todayISO(), label: "3 months" };
    if (invRange === "6m") return { from: daysAgo(179), to: todayISO(), label: "6 months" };
    if (invRange === "1y") return { from: daysAgo(364), to: todayISO(), label: "1 year" };
    if (invRange === "custom" && invFrom && invTo) return { from: invFrom, to: invTo, label: "Custom" };
    const buys = (pdata.investmentTransactions || []).filter((it) => it.type === "buy").map((it) => it.date).sort();
    return { from: buys[0] || daysAgo(364), to: todayISO(), label: "All time" };
  })();
  const statTx = pdata.transactions.filter((t) => t.date >= rangeBounds.from && t.date <= rangeBounds.to);
  const fmtRangeLabel = (iso) => {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleString("en", { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "2-digit" });
  };
  const rangeText = `${fmtRangeLabel(rangeBounds.from)} – ${fmtRangeLabel(rangeBounds.to)}`;

  const revenue = statTx.filter((t) => t.type === "income").reduce((a, b) => a + b.amount, 0);
  const expense = statTx.filter((t) => t.type === "expense").reduce((a, b) => a + b.amount, 0);
  const profit = revenue - expense;
  const subTotal = pdata.subscriptions.reduce((a, b) => a + (b.cycle === "yearly" ? b.amount / 12 : b.amount), 0);
  const invValue = pdata.holdings.reduce((a, h) => a + h.qty * h.price * (h.ccy === "USD" ? USD_IDR : 1), 0);
  const invCost = pdata.holdings.reduce((a, h) => a + h.qty * h.avg * (h.ccy === "USD" ? USD_IDR : 1), 0);

  // Realized P&L per holding (sum of sell gains + dividends, normalized to IDR)
  const invTxns = pdata.investmentTransactions || [];
  const realizedByHolding = {};
  invTxns.forEach((it) => {
    if (!it.realized) return;
    const h = pdata.holdings.find((x) => x.id === it.holdingId);
    const rate = h && h.ccy === "USD" ? USD_IDR : 1;
    realizedByHolding[it.holdingId] = (realizedByHolding[it.holdingId] || 0) + it.realized * rate;
  });
  const totalRealized = Object.values(realizedByHolding).reduce((a, b) => a + b, 0);

  // ── Account balances: opening + (incoming - outgoing + transfers in - transfers out)
  const accountBalances = (pdata.accounts || []).map((a) => {
    let bal = a.opening || 0;
    pdata.transactions.forEach((t) => {
      if (t.type === "income" && t.acct === a.name) bal += t.amount;
      else if (t.type === "expense" && t.acct === a.name) bal -= t.amount;
      else if (t.type === "transfer") {
        if (t.acct === a.name) bal -= t.amount;
        if (t.toAcct === a.name) bal += t.amount;
      }
    });
    // Add holdings value for investment platform accounts
    const holdingsVal = pdata.holdings
      .filter((h) => h.platform === a.name)
      .reduce((s, h) => s + h.qty * h.price * (h.ccy === "USD" ? USD_IDR : 1), 0);
    return { ...a, kind: a.kind || "asset", balance: bal, holdingsVal: Math.round(holdingsVal) };
  });
  const assetAccounts = accountBalances.filter((a) => a.kind !== "liability");
  const liabAccounts = accountBalances.filter((a) => a.kind === "liability");
  const totalAssets = assetAccounts.reduce((s, a) => s + a.balance + (a.holdingsVal || 0), 0);
  const totalLiab = liabAccounts.reduce((s, a) => s + a.balance, 0);
  // Cash-only (no holdings) for netWorth — invValue covers the holdings part
  const totalCash = assetAccounts.reduce((s, a) => s + a.balance, 0);            // for backward compat with chart labels
  const netWorth = totalAssets + invValue - totalLiab;
  const upcoming = [...pdata.subscriptions].sort((a, b) => a.next.localeCompare(b.next));

  // ── Budgets — progress against selected date range (spend scaled by months in range)
  const rangeBudgetSpend = {};
  statTx.filter((t) => t.type === "expense")
    .forEach((t) => { rangeBudgetSpend[t.cat] = (rangeBudgetSpend[t.cat] || 0) + t.amount; });
  const rangeMonths = Math.max(1, Math.round(
    (new Date(rangeBounds.to + "T00:00:00") - new Date(rangeBounds.from + "T00:00:00")) / (30 * 864e5)
  ));
  const budgetProgress = (pdata.budgets || []).map((b) => {
    const spent = rangeBudgetSpend[b.cat] || 0;
    const cap = (b.monthly || 0) * rangeMonths;
    return { ...b, spent, pct: cap > 0 ? spent / cap : 0, remaining: cap - spent, cap, rangeMonths };
  });

  // ── Insights: this-month vs last-month deltas (top 3 surprises)
  const prevMonthDate = new Date(); prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const lastMonth = prevMonthDate.toISOString().slice(0, 7);
  const aggBy = (predicate) => {
    const o = { income: 0, expense: 0, byCat: {} };
    pdata.transactions.filter(predicate).forEach((t) => {
      if (t.type === "income") o.income += t.amount;
      else if (t.type === "expense") { o.expense += t.amount; o.byCat[t.cat] = (o.byCat[t.cat] || 0) + t.amount; }
    });
    return o;
  };
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMo = aggBy((t) => t.date.startsWith(thisMonth));
  const lastMo = aggBy((t) => t.date.startsWith(lastMonth));

  // ── Goals progress (auto-computed from linked accounts & holdings)
  // Average monthly savings from last 3 months of history (for goal prediction)
  const recentHistory = liveHistory.slice(-3);
  const avgMonthlySavings = recentHistory.length > 0
    ? recentHistory.reduce((s, h) => s + (h.income - h.expense), 0) / recentHistory.length : 0;

  const goals = (pdata.goals || []).map((g) => {
    let cur = 0;
    const linkedNames = g.linkedAccounts || [];
    if (g.kind === "debt") {
      const linkedLiab = accountBalances.filter((a) => linkedNames.includes(a.name));
      const stillOwe = linkedLiab.reduce((s, a) => s + a.balance, 0);
      cur = Math.max(0, g.target - stillOwe);
    } else if (linkedNames.length > 0) {
      cur += accountBalances.filter((a) => linkedNames.includes(a.name)).reduce((s, a) => s + a.balance, 0);
      cur += pdata.holdings
        .filter((h) => linkedNames.includes(h.platform))
        .reduce((s, h) => s + h.qty * h.price * (h.ccy === "USD" ? USD_IDR : 1), 0);
    } else if (typeof g.current === "number") {
      cur = g.current;
    }
    const pct = g.target > 0 ? Math.min(Math.max(0, cur) / g.target, 1) : 0;
    const daysLeft = g.deadline ? Math.round((new Date(g.deadline) - new Date()) / 864e5) : null;
    const gap = g.target - Math.max(0, cur);
    const daysToDeadline = g.deadline ? Math.max(0, (new Date(g.deadline + "T00:00:00") - new Date()) / 864e5) : 0;
    const monthsNeeded = avgMonthlySavings > 0 && gap > 0 ? gap / avgMonthlySavings : null;
    const projectedMs = monthsNeeded ? Date.now() + monthsNeeded * 30 * 864e5 : null;
    const onTrack = projectedMs && g.deadline && daysToDeadline > 0 ? projectedMs <= new Date(g.deadline + "T00:00:00").getTime() : null;
    const monthlyNeeded = g.deadline && gap > 0 && daysToDeadline > 0 ? gap / Math.max(1, daysToDeadline / 30) : null;
    const monthlyShortfall = monthlyNeeded && avgMonthlySavings >= 0 ? monthlyNeeded - avgMonthlySavings : null;
    return { ...g, computed: Math.max(0, cur), pct, daysLeft, sources: linkedNames, onTrack, monthlyShortfall, monthlyNeeded };
  });

  const insights = [];
  if (lastMo.income > 0) {
    const delta = (thisMo.income - lastMo.income) / lastMo.income;
    if (Math.abs(delta) >= 0.1) insights.push({ kind: delta > 0 ? "up" : "down", text: `Income ${delta > 0 ? "up" : "down"} ${(Math.abs(delta) * 100).toFixed(0)}% vs last month`, value: thisMo.income - lastMo.income });
  }
  if (lastMo.expense > 0) {
    const delta = (thisMo.expense - lastMo.expense) / lastMo.expense;
    if (Math.abs(delta) >= 0.1) insights.push({ kind: delta > 0 ? "warn" : "good", text: `Spending ${delta > 0 ? "up" : "down"} ${(Math.abs(delta) * 100).toFixed(0)}% vs last month`, value: thisMo.expense - lastMo.expense });
  }
  // Biggest category jump
  const catJumps = Object.keys({ ...thisMo.byCat, ...lastMo.byCat }).map((c) => {
    const cur = thisMo.byCat[c] || 0, prev = lastMo.byCat[c] || 0;
    return { cat: c, delta: cur - prev, ratio: prev ? (cur - prev) / prev : (cur > 0 ? 1 : 0) };
  }).filter((c) => Math.abs(c.delta) >= 100000 && Math.abs(c.ratio) >= 0.2).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  if (catJumps[0]) {
    const c = catJumps[0];
    insights.push({ kind: c.delta > 0 ? "warn" : "good", text: `${c.cat} ${c.delta > 0 ? "spending up" : "spending down"} ${(Math.abs(c.ratio) * 100).toFixed(0)}% vs last month`, value: c.delta });
  }
  // Over-budget warnings
  budgetProgress.filter((b) => b.pct >= 0.9).slice(0, 1).forEach((b) => {
    insights.push({ kind: b.pct >= 1 ? "warn" : "info", text: `${b.cat}: ${(b.pct * 100).toFixed(0)}% of monthly budget used`, value: b.spent });
  });

  // Subscription renewals in next 7 days
  pdata.subscriptions.forEach((s) => {
    const days = Math.round((new Date(s.next + "T00:00:00") - new Date()) / 864e5);
    if (days >= 0 && days <= 7) {
      insights.push({ kind: "info", text: `${s.merchant} renews ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`, value: s.amount });
    }
  });

  // Largest expense in last 7 days
  const week = daysAgo(7);
  const recentExp = pdata.transactions.filter((t) => t.type === "expense" && t.date >= week).sort((a, b) => b.amount - a.amount)[0];
  if (recentExp && recentExp.amount >= 500000) {
    insights.push({ kind: "info", text: `Largest expense this week: ${recentExp.cat} — ${recentExp.note}`, value: recentExp.amount });
  }

  // Idle log gap
  const sortedTx = [...pdata.transactions].sort((a, b) => b.date.localeCompare(a.date));
  if (sortedTx[0]) {
    const lastDays = Math.round((new Date() - new Date(sortedTx[0].date + "T00:00:00")) / 864e5);
    if (lastDays >= 3) insights.push({ kind: "warn", text: `No transactions logged in ${lastDays} days`, value: 0 });
  }

  // Goal nearing deadline
  goals.filter((g) => g.daysLeft !== null && g.daysLeft > 0 && g.daysLeft <= 30 && g.pct < 0.85).slice(0, 1).forEach((g) => {
    insights.push({ kind: "warn", text: `Goal "${g.name}" at ${(g.pct * 100).toFixed(0)}% with ${g.daysLeft} days left`, value: g.target - g.computed });
  });

  insights.length = Math.min(insights.length, 6); // cap displayed

  // totalCumNet: total net cash flow across all recorded history
  const totalCumNet = liveHistory.reduce((a, b) => a + (b.income - b.expense), 0);
  // nwTrend: anchor backwards from current netWorth using cumulative net per month
  const nwTrend = liveHistory.map((h, i, arr) => {
    const cumUpToI = arr.slice(0, i + 1).reduce((a, b) => a + (b.income - b.expense), 0);
    return netWorth - (totalCumNet - cumUpToI);
  });
  const growthData = liveHistory.map((h, i) => ({ label: h.m, value: nwTrend[i] }));
  const growthPct = nwTrend.length > 1 ? ((nwTrend[nwTrend.length - 1] - nwTrend[0]) / (Math.abs(nwTrend[0]) || 1)) * 100 : 0;

  const catMap = {};
  monthTx.filter((t) => t.type === "expense").forEach((t) => { catMap[t.cat] = (catMap[t.cat] || 0) + t.amount; });
  const catSegments = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }));

  const totalInvIDR = pdata.holdings.reduce((a, h) => a + h.qty * h.price * (h.ccy === "USD" ? USD_IDR : 1), 0) || 1;
  const allocSegments = pdata.holdings
    .map((h, i) => ({ label: h.ticker, platform: h.platform, value: h.qty * h.price * (h.ccy === "USD" ? USD_IDR : 1), color: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value);

  const stagger = (i) => ({ animationDelay: `${i * 70}ms` });

  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const now = new Date();
      const stamp = now.toISOString().slice(0, 10);
      const genStamp = now.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
      const rnd = (n) => Math.round(n);
      const usd = (n) => +n.toFixed(2);
      const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
      const monthLabel = (iso) => iso ? new Date(iso + "T00:00:00").toLocaleString("en", { month: "short", year: "numeric" }) : "";
      const dParts = (iso) => {
        const d = new Date(iso + "T00:00:00");
        return {
          weekday: d.toLocaleString("en", { weekday: "long" }),
          month: d.toLocaleString("en", { month: "long" }),
          quarter: "Q" + (Math.floor(d.getMonth() / 3) + 1),
          year: d.getFullYear(),
        };
      };
      const applyFmt = (ws, col, r1, r2, z) => {
        for (let r = r1; r <= r2; r++) {
          const addr = XLSX.utils.encode_cell({ r, c: col });
          if (ws[addr]) ws[addr].z = z;
        }
      };
      const af = (ws, nCols, nRows) => { ws["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(nCols - 1)}${nRows}` }; };

      const allDates = pdata.transactions.map((t) => t.date).sort();
      const periodStart = allDates[0] || stamp;
      const periodEnd = allDates[allDates.length - 1] || stamp;
      const totalInc = pdata.transactions.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
      const totalExp = pdata.transactions.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
      const invPL = invValue - invCost;

      /* ── 1. COVER / REPORT INFO ──────────────────── */
      const cover = [
        ["OREO — FINANCIAL REPORT", ""],
        ["", ""],
        ["Profile", profile.name],
        ["Account type", profile.type === "business" ? "Business" : "Personal"],
        ["Generated", genStamp],
        ["Reporting period", `${periodStart}  to  ${periodEnd}`],
        ["Base currency", "IDR (Rupiah)"],
        ["Exchange rate applied", `1 USD = Rp ${USD_IDR.toLocaleString("id-ID")}`],
        ["", ""],
        ["INCOME & EXPENSES (all-time, recorded)", ""],
        ["Total income (Rp)", rnd(totalInc)],
        ["Total expenses (Rp)", rnd(totalExp)],
        ["Net profit (Rp)", rnd(totalInc - totalExp)],
        ["Number of transactions", pdata.transactions.length],
        ["", ""],
        ["RECURRING SUBSCRIPTIONS", ""],
        ["Active subscriptions", pdata.subscriptions.length],
        ["Monthly burn (Rp)", rnd(subTotal)],
        ["Annual burn (Rp)", rnd(subTotal * 12)],
        ["", ""],
        ["INVESTMENTS", ""],
        ["Holdings", pdata.holdings.length],
        ["Market value (Rp)", rnd(invValue)],
        ["Cost basis (Rp)", rnd(invCost)],
        ["Unrealised P&L (Rp)", rnd(invPL)],
        ["Unrealised return", invCost ? invPL / invCost : 0],
        ["Market value (USD)", usd(invValue / USD_IDR)],
        ["", ""],
        ["NET WORTH (Rp)", rnd(netWorth)],
        ["", ""],
        ["Sheets in this workbook", ""],
        ["1. Cover", "This page"],
        ["2. Transactions", "Full ledger with running balance"],
        ["3. Category Breakdown", "Spending & income grouped by category"],
        ["4. Monthly P&L", "Income, expense & net by month"],
        ["5. Subscriptions", "Recurring charges & renewals"],
        ["6. Investments", "Holdings, cost basis & P&L"],
        ["", ""],
        ["Note", "Figures are as recorded in Oreo. Verify against bank/statement records before filing."],
      ];
      const wsCover = XLSX.utils.aoa_to_sheet(cover);
      wsCover["!cols"] = [{ wch: 34 }, { wch: 42 }];
      [10, 11, 12, 17, 18, 22, 23, 24, 29].forEach((r) => applyFmt(wsCover, 1, r, r, "#,##0"));
      applyFmt(wsCover, 1, 25, 25, "0.00%");
      applyFmt(wsCover, 1, 26, 26, "$#,##0.00");
      XLSX.utils.book_append_sheet(wb, wsCover, "Cover");

      /* ── 2. TRANSACTIONS (LEDGER, chronological + running balance) ── */
      const txAsc = [...pdata.transactions].sort((a, b) => a.date.localeCompare(b.date) || (a.id || "").localeCompare(b.id || ""));
      let bal = 0;
      const txData = txAsc.map((t, i) => {
        const inAmt = t.type === "income" ? t.amount : 0;
        const outAmt = t.type === "expense" ? t.amount : 0;
        bal += inAmt - outAmt;
        const p = dParts(t.date);
        return {
          "No.": i + 1,
          Date: t.date,
          Day: p.weekday,
          Month: p.month,
          Quarter: p.quarter,
          Year: p.year,
          "Txn ID": t.id || "",
          Type: cap(t.type),
          Category: t.cat,
          Description: t.note || "",
          "Account / Method": t.acct,
          "Money In (Rp)": inAmt ? rnd(inAmt) : "",
          "Money Out (Rp)": outAmt ? rnd(outAmt) : "",
          "Net (Rp)": rnd(inAmt - outAmt),
          "Amount (USD)": usd((inAmt - outAmt) / USD_IDR),
          "Running Balance (Rp)": rnd(bal),
        };
      });
      const blankTx = Object.fromEntries(Object.keys(txData[0] || { "No.": "" }).map((k) => [k, ""]));
      txData.push(
        { ...blankTx },
        { ...blankTx, Date: "TOTALS", "Money In (Rp)": rnd(totalInc), "Money Out (Rp)": rnd(totalExp), "Net (Rp)": rnd(totalInc - totalExp), "Amount (USD)": usd((totalInc - totalExp) / USD_IDR), "Running Balance (Rp)": rnd(bal) },
      );
      const wsTx = XLSX.utils.json_to_sheet(txData);
      wsTx["!cols"] = [{ wch: 5 }, { wch: 12 }, { wch: 11 }, { wch: 10 }, { wch: 8 }, { wch: 7 }, { wch: 14 }, { wch: 9 }, { wch: 16 }, { wch: 34 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 13 }, { wch: 18 }];
      wsTx["!freeze"] = { xSplit: 0, ySplit: 1 };
      af(wsTx, 16, txData.length);
      [11, 12, 13, 15].forEach((c) => applyFmt(wsTx, c, 1, txData.length, "#,##0"));
      applyFmt(wsTx, 14, 1, txData.length, "$#,##0.00");
      XLSX.utils.book_append_sheet(wb, wsTx, "Transactions");

      /* ── 3. CATEGORY BREAKDOWN ───────────────────── */
      const catMap = {};
      pdata.transactions.forEach((t) => {
        const key = t.type + "|" + t.cat;
        if (!catMap[key]) catMap[key] = { cat: t.cat, type: t.type, count: 0, total: 0 };
        catMap[key].count++; catMap[key].total += t.amount;
      });
      const catRows = Object.values(catMap)
        .sort((a, b) => (a.type === b.type ? b.total - a.total : a.type === "income" ? -1 : 1))
        .map((c) => ({
          Category: c.cat,
          Type: cap(c.type),
          "Transactions": c.count,
          "Total (Rp)": rnd(c.total),
          "% of Type": (c.type === "income" ? (totalInc ? c.total / totalInc : 0) : (totalExp ? c.total / totalExp : 0)),
          "Avg / Txn (Rp)": rnd(c.total / c.count),
          "Total (USD)": usd(c.total / USD_IDR),
        }));
      const blankCat = { Category: "", Type: "", "Transactions": "", "Total (Rp)": "", "% of Type": "", "Avg / Txn (Rp)": "", "Total (USD)": "" };
      catRows.push(
        { ...blankCat },
        { ...blankCat, Category: "Total income", "Total (Rp)": rnd(totalInc), "Total (USD)": usd(totalInc / USD_IDR) },
        { ...blankCat, Category: "Total expenses", "Total (Rp)": rnd(totalExp), "Total (USD)": usd(totalExp / USD_IDR) },
      );
      const wsCat = XLSX.utils.json_to_sheet(catRows);
      wsCat["!cols"] = [{ wch: 18 }, { wch: 10 }, { wch: 13 }, { wch: 16 }, { wch: 11 }, { wch: 16 }, { wch: 14 }];
      wsCat["!freeze"] = { xSplit: 0, ySplit: 1 };
      af(wsCat, 7, catRows.length);
      [3, 5].forEach((c) => applyFmt(wsCat, c, 1, catRows.length, "#,##0"));
      applyFmt(wsCat, 4, 1, catRows.length, "0.0%");
      applyFmt(wsCat, 6, 1, catRows.length, "$#,##0.00");
      XLSX.utils.book_append_sheet(wb, wsCat, "Category Breakdown");

      /* ── 4. MONTHLY P&L ──────────────────────────── */
      const moRows = liveHistory.map((h) => {
        const net = h.income - h.expense;
        return {
          Month: monthLabel(h.date),
          "Income (Rp)": rnd(h.income),
          "Expenses (Rp)": rnd(h.expense),
          "Net (Rp)": rnd(net),
          "Savings Rate": h.income ? net / h.income : 0,
          "Income (USD)": usd(h.income / USD_IDR),
          "Expenses (USD)": usd(h.expense / USD_IDR),
        };
      });
      const sumInc = liveHistory.reduce((a, h) => a + h.income, 0);
      const sumExp = liveHistory.reduce((a, h) => a + h.expense, 0);
      const blankMo = { Month: "", "Income (Rp)": "", "Expenses (Rp)": "", "Net (Rp)": "", "Savings Rate": "", "Income (USD)": "", "Expenses (USD)": "" };
      moRows.push(
        { ...blankMo },
        { ...blankMo, Month: "TOTAL", "Income (Rp)": rnd(sumInc), "Expenses (Rp)": rnd(sumExp), "Net (Rp)": rnd(sumInc - sumExp), "Savings Rate": sumInc ? (sumInc - sumExp) / sumInc : 0, "Income (USD)": usd(sumInc / USD_IDR), "Expenses (USD)": usd(sumExp / USD_IDR) },
        { ...blankMo, Month: "MONTHLY AVG", "Income (Rp)": rnd(sumInc / (liveHistory.length || 1)), "Expenses (Rp)": rnd(sumExp / (liveHistory.length || 1)), "Net (Rp)": rnd((sumInc - sumExp) / (liveHistory.length || 1)) },
      );
      const wsMo = XLSX.utils.json_to_sheet(moRows);
      wsMo["!cols"] = [{ wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
      wsMo["!freeze"] = { xSplit: 0, ySplit: 1 };
      af(wsMo, 7, moRows.length);
      [1, 2, 3].forEach((c) => applyFmt(wsMo, c, 1, moRows.length, "#,##0"));
      applyFmt(wsMo, 4, 1, moRows.length, "0.0%");
      [5, 6].forEach((c) => applyFmt(wsMo, c, 1, moRows.length, "$#,##0.00"));
      XLSX.utils.book_append_sheet(wb, wsMo, "Monthly P&L");

      /* ── 5. SUBSCRIPTIONS ────────────────────────── */
      const subSorted = [...pdata.subscriptions].sort((a, b) => a.next.localeCompare(b.next));
      const subData = subSorted.map((s) => {
        const mo = s.cycle === "yearly" ? s.amount / 12 : s.amount;
        const yr = s.cycle === "monthly" ? s.amount * 12 : s.amount;
        const daysUntil = Math.round((new Date(s.next + "T00:00:00") - now) / 864e5);
        return {
          Merchant: s.merchant,
          "Billing Cycle": cap(s.cycle),
          "Amount / Cycle (Rp)": rnd(s.amount),
          "Next Renewal": s.next,
          "Days Until": daysUntil,
          "Monthly (Rp)": rnd(mo),
          "Yearly (Rp)": rnd(yr),
          "Monthly (USD)": usd(mo / USD_IDR),
          "Yearly (USD)": usd(yr / USD_IDR),
          Account: s.acct,
        };
      });
      const moBurn = subData.reduce((a, r) => a + r["Monthly (Rp)"], 0);
      const blankSub = { Merchant: "", "Billing Cycle": "", "Amount / Cycle (Rp)": "", "Next Renewal": "", "Days Until": "", "Monthly (Rp)": "", "Yearly (Rp)": "", "Monthly (USD)": "", "Yearly (USD)": "", Account: "" };
      subData.push(
        { ...blankSub },
        { ...blankSub, Merchant: "TOTAL", "Monthly (Rp)": rnd(moBurn), "Yearly (Rp)": rnd(moBurn * 12), "Monthly (USD)": usd(moBurn / USD_IDR), "Yearly (USD)": usd(moBurn * 12 / USD_IDR) },
      );
      const wsSub = XLSX.utils.json_to_sheet(subData);
      wsSub["!cols"] = [{ wch: 20 }, { wch: 13 }, { wch: 18 }, { wch: 13 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
      wsSub["!freeze"] = { xSplit: 0, ySplit: 1 };
      af(wsSub, 10, subData.length);
      [2, 5, 6].forEach((c) => applyFmt(wsSub, c, 1, subData.length, "#,##0"));
      [7, 8].forEach((c) => applyFmt(wsSub, c, 1, subData.length, "$#,##0.00"));
      XLSX.utils.book_append_sheet(wb, wsSub, "Subscriptions");

      /* ── 6. INVESTMENTS ──────────────────────────── */
      const holdSorted = [...pdata.holdings].sort((a, b) => {
        const va = a.qty * a.price * (a.ccy === "USD" ? USD_IDR : 1);
        const vb = b.qty * b.price * (b.ccy === "USD" ? USD_IDR : 1);
        return vb - va;
      });
      const invData = holdSorted.map((h) => {
        const valIDR = h.qty * h.price * (h.ccy === "USD" ? USD_IDR : 1);
        const costIDR = h.qty * h.avg * (h.ccy === "USD" ? USD_IDR : 1);
        const pl = valIDR - costIDR;
        return {
          Platform: h.platform,
          Ticker: h.ticker,
          Type: h.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          Quantity: h.qty,
          "Avg Cost": h.avg,
          "Current Price": h.price,
          Currency: h.ccy,
          "Market Value (Rp)": rnd(valIDR),
          "Cost Basis (Rp)": rnd(costIDR),
          "Unrealised P&L (Rp)": rnd(pl),
          "Return %": costIDR ? pl / costIDR : 0,
          "% of Portfolio": invValue ? valIDR / invValue : 0,
          "Market Value (USD)": usd(valIDR / USD_IDR),
        };
      });
      const blankInv = Object.fromEntries(Object.keys(invData[0] || { Platform: "" }).map((k) => [k, ""]));
      invData.push(
        { ...blankInv },
        { ...blankInv, Platform: "TOTAL", "Market Value (Rp)": rnd(invValue), "Cost Basis (Rp)": rnd(invCost), "Unrealised P&L (Rp)": rnd(invPL), "Return %": invCost ? invPL / invCost : 0, "% of Portfolio": 1, "Market Value (USD)": usd(invValue / USD_IDR) },
      );
      const wsInv = XLSX.utils.json_to_sheet(invData);
      wsInv["!cols"] = [{ wch: 10 }, { wch: 8 }, { wch: 13 }, { wch: 10 }, { wch: 12 }, { wch: 13 }, { wch: 9 }, { wch: 17 }, { wch: 16 }, { wch: 18 }, { wch: 10 }, { wch: 13 }, { wch: 17 }];
      wsInv["!freeze"] = { xSplit: 0, ySplit: 1 };
      af(wsInv, 13, invData.length);
      [4, 5].forEach((c) => applyFmt(wsInv, c, 1, invData.length, "#,##0.##"));
      [7, 8, 9].forEach((c) => applyFmt(wsInv, c, 1, invData.length, "#,##0"));
      applyFmt(wsInv, 10, 1, invData.length, "0.00%");
      applyFmt(wsInv, 11, 1, invData.length, "0.0%");
      applyFmt(wsInv, 12, 1, invData.length, "$#,##0.00");
      XLSX.utils.book_append_sheet(wb, wsInv, "Investments");

      /* ── DOWNLOAD ─────────────────────────────────── */
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Oreo_${profile.name.replace(/\s+/g, "_")}_${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Exported detailed report ✓");
    } catch (e) {
      showToast("Export blocked here — works in the real app");
    }
    
  };

  const exportView = () => {
    try {
      const wb = XLSX.utils.book_new();
      const stamp = new Date().toISOString().slice(0, 10);
      let rows = [], name = "Data";
      if (tab === "txn") { name = "Transactions"; rows = filteredTx.map((t) => ({ Date: t.date, Type: t.type, Amount: t.amount, Category: t.cat, Account: t.acct, Note: t.note })); }
      if (tab === "sub") { name = "Subscriptions"; rows = filteredSubs.map((s) => ({ Merchant: s.merchant, Amount: s.amount, Cycle: s.cycle, "Next Renewal": s.next, Account: s.acct })); }
      if (tab === "inv") { name = "Investments"; rows = filteredHoldings.map((h) => { const val = h.qty * h.price, cost = h.qty * h.avg, pl = val - cost; return { Platform: h.platform, Ticker: h.ticker, Type: h.type, Quantity: h.qty, "Avg Cost": h.avg, "Current Price": h.price, Currency: h.ccy, Value: +val.toFixed(2), "P&L": +pl.toFixed(2), "P&L %": +((pl / cost) * 100).toFixed(2) }; }); }
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No rows match current filters" }]);
      XLSX.utils.book_append_sheet(wb, ws, name);
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Oreo_${name}_filtered_${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} ✓`);
    } catch (e) {
      showToast("Export blocked here — works in the real app");
    }
    
  };

  /* ---------- universal filtering ---------- */
  const allCats = [...new Set(monthTx.map((t) => t.cat))];
  const allAccts = pdata.accounts.map((a) => a.name);
  const cutoff = (() => {
    const d = new Date();
    if (f.range === "today") return new Date(d.toISOString().slice(0, 10));
    if (f.range === "7d") { d.setDate(d.getDate() - 7); return d; }
    if (f.range === "30d") { d.setDate(d.getDate() - 30); return d; }
    if (f.range === "month") return new Date(d.getFullYear(), d.getMonth(), 1);
    return null;
  })();
  const inRange = (dateStr) => {
    const d = new Date(dateStr);
    if (f.range === "custom") {
      if (f.from && d < new Date(f.from)) return false;
      if (f.to && d > new Date(f.to + "T23:59:59")) return false;
      return true;
    }
    return cutoff ? d >= cutoff : true;
  };
  const ql = q.trim().toLowerCase();

  const filteredTx = (() => {
    let r = monthTx.filter((t) => {
      if (ql && !`${t.note} ${t.cat} ${t.acct}`.toLowerCase().includes(ql) && !String(t.amount).includes(ql.replace(/\D/g, ""))) return false;
      if (f.type !== "all" && t.type !== f.type) return false;
      if (f.cats.length && !f.cats.includes(t.cat)) return false;
      if (f.accts.length && !f.accts.includes(t.acct)) return false;
      if (!inRange(t.date)) return false;
      if (f.min && t.amount < +f.min) return false;
      if (f.max && t.amount > +f.max) return false;
      return true;
    });
    if (f.sort === "newest") r = r.sort((a, b) => b.date.localeCompare(a.date));
    if (f.sort === "oldest") r = r.sort((a, b) => a.date.localeCompare(b.date));
    if (f.sort === "high") r = r.sort((a, b) => b.amount - a.amount);
    if (f.sort === "low") r = r.sort((a, b) => a.amount - b.amount);
    return r;
  })();

  const filteredSubs = (() => {
    let r = pdata.subscriptions.filter((s) => {
      if (ql && !`${s.merchant} ${s.acct}`.toLowerCase().includes(ql)) return false;
      if (f.type === "monthly" && s.cycle !== "monthly") return false;
      if (f.type === "yearly" && s.cycle !== "yearly") return false;
      if (f.accts.length && !f.accts.includes(s.acct)) return false;
      return true;
    });
    if (f.sort === "high") r = r.sort((a, b) => b.amount - a.amount);
    if (f.sort === "low") r = r.sort((a, b) => a.amount - b.amount);
    else r = r.sort((a, b) => a.next.localeCompare(b.next));
    return r;
  })();

  const filteredHoldings = pdata.holdings.filter((h) => {
    if (ql && !h.ticker.toLowerCase().includes(ql)) return false;
    if (f.platform !== "all" && h.platform !== f.platform) return false;
    if (f.asset !== "all" && h.type !== f.asset) return false;
    const pl = h.qty * h.price - h.qty * h.avg;
    if (f.pl === "gain" && pl < 0) return false;
    if (f.pl === "loss" && pl >= 0) return false;
    return true;
  });

  const activeChips = [];
  if (ql) activeChips.push({ k: "q", label: `"${q}"`, clear: () => setQ("") });
  if (tab === "txn") {
    if (f.type !== "all") activeChips.push({ k: "type", label: f.type, clear: () => setF({ ...f, type: "all" }) });
    f.cats.forEach((c) => activeChips.push({ k: "c" + c, label: c, clear: () => setF({ ...f, cats: f.cats.filter((x) => x !== c) }) }));
    f.accts.forEach((a) => activeChips.push({ k: "a" + a, label: a, clear: () => setF({ ...f, accts: f.accts.filter((x) => x !== a) }) }));
    if (f.range !== "all") {
      const label = f.range === "custom"
        ? `${f.from || "…"} → ${f.to || "…"}`
        : { today: "Today", "7d": "Last 7d", "30d": "Last 30d", month: "This month" }[f.range];
      activeChips.push({ k: "range", label, clear: () => setF({ ...f, range: "all", from: "", to: "" }) });
    }
    if (f.min) activeChips.push({ k: "min", label: `≥ ${fmtIDR(+f.min)}`, clear: () => setF({ ...f, min: "" }) });
    if (f.max) activeChips.push({ k: "max", label: `≤ ${fmtIDR(+f.max)}`, clear: () => setF({ ...f, max: "" }) });
    if (f.sort !== "newest") activeChips.push({ k: "sort", label: { oldest: "Oldest", high: "Highest", low: "Lowest" }[f.sort], clear: () => setF({ ...f, sort: "newest" }) });
  }
  if (tab === "sub") {
    if (f.type === "monthly" || f.type === "yearly") activeChips.push({ k: "cyc", label: f.type, clear: () => setF({ ...f, type: "all" }) });
    f.accts.forEach((a) => activeChips.push({ k: "a" + a, label: a, clear: () => setF({ ...f, accts: f.accts.filter((x) => x !== a) }) }));
  }
  if (tab === "inv") {
    if (f.platform !== "all") activeChips.push({ k: "plat", label: f.platform, clear: () => setF({ ...f, platform: "all" }) });
    if (f.asset !== "all") activeChips.push({ k: "asset", label: f.asset, clear: () => setF({ ...f, asset: "all" }) });
    if (f.pl !== "all") activeChips.push({ k: "pl", label: f.pl === "gain" ? "Gainers" : "Losers", clear: () => setF({ ...f, pl: "all" }) });
  }

  /* ---------- chart range filtering ---------- */
  const chartMonthLabel = (h) => {
    if (!h.date) return h.m;
    const d = new Date(h.date + "T00:00:00");
    const mon = d.toLocaleString("en", { month: "short" });
    return `${mon} '${d.getFullYear().toString().slice(2)}`;
  };

  // Absolute net worth for every month in full history (true values, not reset-cumulative)
  const fullNwTrend = liveHistory.map((_, i, arr) => {
    const cumUpToI = arr.slice(0, i + 1).reduce((a, b) => a + (b.income - b.expense), 0);
    return netWorth - (totalCumNet - cumUpToI);
  });

  // Slice-based history filter so range labels always show sensible point counts
  const filteredHistory = (() => {
    const hist = liveHistory;
    if (chartRange === "custom") {
      const r = hist.filter((h) => {
        if (chartFrom && h.date < chartFrom) return false;
        if (chartTo && h.date > chartTo) return false;
        return true;
      });
      return (r.length ? r : hist).map((h) => ({ ...h, label: chartMonthLabel(h) }));
    }
    const n = { "month": 1, "lastmo": 1, "3m": 3, "6m": 6, "1y": 12, "all": hist.length }[chartRange] ?? hist.length;
    return hist.slice(-n).map((h) => ({ ...h, label: chartMonthLabel(h) }));
  })();

  // Growth line — adaptive point interval (~30 points per range, YouTube-Studio style)
  const dayLabel = (ms) => new Date(ms).toLocaleString("en", { month: "short", day: "numeric" });
  const nowMs = Date.now();
  const firstHistMs = liveHistory.length ? new Date(liveHistory[0].date + "T00:00:00").getTime() : nowMs - 864e5 * 30;
  // Map range to (rangeDays, endMs) using unified bounds
  const rangeBoundsStart = new Date(rangeBounds.from + "T00:00:00").getTime();
  const rangeBoundsEnd = new Date(rangeBounds.to + "T00:00:00").getTime();
  const rangeDays = Math.max(2, Math.round((rangeBoundsEnd - rangeBoundsStart) / 864e5));
  const ptInterval = Math.max(1, Math.round(rangeDays / 30));   // ~1,3,6,12 days
  // Axis labels: day-level for short ranges, month+year for long ranges (so yearly views show the year)
  const axisLabel = (ms) => {
    const d = new Date(ms);
    if (rangeDays <= 95) return d.toLocaleString("en", { month: "short", day: "numeric" });
    return d.toLocaleString("en", { month: "short" }) + " '" + d.getFullYear().toString().slice(2);
  };
  const fullDate = (ms) => new Date(ms).toLocaleString("en", { month: "short", day: "numeric", year: "numeric" });

  // Interpolate net worth along the real monthly trend (+ today anchor) for any date
  const nwAnchors = liveHistory.map((h, i) => ({ t: new Date(h.date + "T00:00:00").getTime(), v: fullNwTrend[i] }));
  nwAnchors.push({ t: nowMs, v: netWorth });
  const interpNW = (ms) => {
    if (ms <= nwAnchors[0].t) return nwAnchors[0].v;
    if (ms >= nwAnchors[nwAnchors.length - 1].t) return nwAnchors[nwAnchors.length - 1].v;
    for (let i = 1; i < nwAnchors.length; i++) {
      if (ms <= nwAnchors[i].t) {
        const a = nwAnchors[i - 1], b = nwAnchors[i];
        return a.v + (b.v - a.v) * ((ms - a.t) / (b.t - a.t));
      }
    }
    return nwAnchors[nwAnchors.length - 1].v;
  };

  const growthSeries = (() => {
    const endMs = rangeBoundsEnd;
    const nPts = Math.floor(rangeDays / ptInterval) + 1;
    const out = [];
    for (let k = nPts - 1; k >= 0; k--) {
      const ms = endMs - k * ptInterval * 864e5;
      const base = interpNW(ms);
      out.push({ ms, label: axisLabel(ms), full: fullDate(ms), value: Math.max(0, Math.round(base)) });
    }
    return out;
  })();
  const filteredGrowthData = growthSeries;
  const filteredGrowthPct = growthSeries.length > 1
    ? ((growthSeries[growthSeries.length - 1].value - growthSeries[0].value) / (Math.abs(growthSeries[0].value) || 1)) * 100 : 0;
  const growthRangeLabel = growthSeries.length > 0
    ? growthSeries[0].label + (growthSeries.length > 1 ? " – " + growthSeries[growthSeries.length - 1].label : "")
    : "";

  // Invested series — cumulative cost basis from buy transactions over time
  const investedSeries = (() => {
    if (!invTxns.length) return [];
    const buys = invTxns.filter((it) => it.type === "buy").sort((a, b) => a.date.localeCompare(b.date));
    if (!buys.length) return [];
    return growthSeries.map((pt) => {
      const ptIso = new Date(pt.ms).toISOString().slice(0, 10);
      const v = buys.filter((it) => it.date <= ptIso).reduce((s, it) => {
        const h = pdata.holdings.find((x) => x.id === it.holdingId);
        const rate = h && h.ccy === "USD" ? USD_IDR : 1;
        return s + (it.qty * it.price + (it.fees || 0)) * rate;
      }, 0);
      return { ms: pt.ms, label: pt.label, full: pt.full, value: v };
    });
  })();

  // Cash flow — adaptive buckets: weekly for 1M, monthly for longer ranges, + period totals
  // Realized P&L events in IDR — used in cash flow buckets
  const realizedEvents = invTxns
    .filter((it) => it.realized != null && it.date)
    .map((it) => {
      const h = pdata.holdings.find((x) => x.id === it.holdingId);
      const rate = h?.ccy === "USD" ? USD_IDR : 1;
      return { date: it.date, amount: +(it.realized * rate) };
    });

  const cashSeries = (() => {
    // Helper: iterate date strings without UTC conversion (avoids timezone off-by-one)
    const nextDay = (iso) => { const [y, m, d] = iso.split('-').map(Number); const x = new Date(y, m-1, d+1); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
    const fmtDay = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m-1, d).toLocaleString("en", { month: "short", day: "numeric" }); };
    const sumRealized = (from, to) => realizedEvents.filter((r) => r.date >= from && r.date <= to).reduce((a, r) => a + r.amount, 0);
    // ≤31 days: one bar per day, iterating date strings directly
    if (rangeDays <= 31) {
      const buckets = [];
      let cur = rangeBounds.from;
      while (cur <= rangeBounds.to) {
        let income = 0, expense = 0;
        pdata.transactions.forEach((t) => {
          if (t.date === cur) {
            if (t.type === "income") income += t.amount;
            else if (t.type === "expense") expense += t.amount;
          }
        });
        buckets.push({ label: fmtDay(cur), income, expense, realized: sumRealized(cur, cur) });
        cur = nextDay(cur);
      }
      return buckets;
    }
    // 32–90 days: weekly buckets, also using date strings
    if (rangeDays <= 90) {
      const nWeeks = Math.ceil(rangeDays / 7);
      const buckets = [];
      for (let w = nWeeks - 1; w >= 0; w--) {
        const [ey, em, ed] = rangeBounds.to.split('-').map(Number);
        const endDt = new Date(ey, em-1, ed - w * 7);
        const startDt = new Date(endDt.getFullYear(), endDt.getMonth(), endDt.getDate() - 6);
        const endIso = `${endDt.getFullYear()}-${String(endDt.getMonth()+1).padStart(2,'0')}-${String(endDt.getDate()).padStart(2,'0')}`;
        const startIso = `${startDt.getFullYear()}-${String(startDt.getMonth()+1).padStart(2,'0')}-${String(startDt.getDate()).padStart(2,'0')}`;
        let income = 0, expense = 0;
        pdata.transactions.forEach((t) => {
          if (t.date >= startIso && t.date <= endIso) {
            if (t.type === "income") income += t.amount;
            else if (t.type === "expense") expense += t.amount;
          }
        });
        buckets.push({ label: fmtDay(endIso), income, expense, realized: sumRealized(startIso, endIso) });
      }
      return buckets;
    }
    // >90 days: monthly slices from liveHistory
    const months = Math.max(2, Math.round(rangeDays / 30));
    const slice = chartRange === "custom"
      ? liveHistory.filter((h) => (!chartFrom || h.date >= chartFrom) && (!chartTo || h.date <= chartTo))
      : liveHistory.slice(-months);
    return (slice.length ? slice : liveHistory).map((h) => {
      const realized = sumRealized(h.date.slice(0, 7) + "-01", h.date.slice(0, 7) + "-31");
      return { label: chartMonthLabel(h), income: h.income, expense: h.expense, realized };
    });
  })();
  const cashTotals = cashSeries.reduce((a, b) => ({ income: a.income + b.income, expense: a.expense + b.expense, realized: (a.realized || 0) + (b.realized || 0) }), { income: 0, expense: 0, realized: 0 });

  // Transactions in current range — uses unified rangeBounds
  const chartRangedTx = monthTx.filter((t) => t.date >= rangeBounds.from && t.date <= rangeBounds.to);
  const chartCatMap = {};
  chartRangedTx.filter((t) => t.type === "expense").forEach((t) => { chartCatMap[t.cat] = (chartCatMap[t.cat] || 0) + t.amount; });
  const chartCatSegments = Object.entries(chartCatMap).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }));
  const chartExpense = chartRangedTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
  const chartBreakdownTotal = chartCatSegments.reduce((a, b) => a + b.value, 0) || 1;

  const chartRangeLabel = filteredHistory.length > 0
    ? filteredHistory[0].label + (filteredHistory.length > 1 ? " – " + filteredHistory[filteredHistory.length - 1].label : "")
    : "";

  const RANGE_OPTS = [
    { k: "month", l: "This month" }, { k: "lastmo", l: "Last month" },
    { k: "3m", l: "3M" }, { k: "6m", l: "6M" }, { k: "1y", l: "1Y" },
    { k: "all", l: "All time" }, { k: "custom", l: "Custom" },
  ];

  /* ---------- shared building blocks ---------- */
  const navItems = [
    { k: "dash", l: "Overview", icon: LayoutDashboard },
    { k: "txn", l: "Activity", icon: ArrowLeftRight },
    { k: "sub", l: "Subscriptions", icon: RefreshCw },
    { k: "inv", l: "Investments", icon: TrendingUp },
  ];

  const runAI = async (queryOverride) => {
    const queryText = (queryOverride ?? ai).trim();
    if (!queryText) return;
    setAiLoading(true); setAiResult(null);
    const q = queryText.toLowerCase();
    const now2 = new Date(); const thisMo2 = now2.toISOString().slice(0, 7);
    const lastMoD = new Date(now2); lastMoD.setMonth(lastMoD.getMonth() - 1); const lastMo2 = lastMoD.toISOString().slice(0, 7);
    let tFilter = () => true;
    if (q.includes("last month")) tFilter = (t) => t.date.startsWith(lastMo2);
    else if (q.includes("this month") || q.includes("this mo")) tFilter = (t) => t.date.startsWith(thisMo2);
    else if (q.includes("today")) { const td = todayISO(); tFilter = (t) => t.date === td; }
    const allCatsLow = [...new Set(pdata.transactions.map((t) => t.cat.toLowerCase()))];
    const mCat = allCatsLow.find((c) => q.includes(c));
    let tType = (t) => true;
    if (/income|earn|revenue/.test(q)) tType = (t) => t.type === "income";
    else if (/spent|spend|expense|cost/.test(q)) tType = (t) => t.type === "expense";
    const matching = pdata.transactions.filter((t) => tFilter(t) && tType(t) && (!mCat || t.cat.toLowerCase() === mCat));
    const txSample = pdata.transactions.slice(0, 60).map((t) => `${t.date} ${t.type.toUpperCase()} ${t.amount} IDR ${t.cat} "${t.note}" (${t.acct})`).join("\n");
    const sysPrompt = `You are a sharp personal finance assistant for an Indonesian user. Answer concisely in the context of this ongoing conversation.

SNAPSHOT (${rangeBounds.label}): Net worth ${netWorth} IDR | Assets ${totalAssets} IDR | Liabilities ${totalLiab} IDR | Investments ${invValue} IDR | Revenue ${revenue} IDR | Expenses ${expense} IDR | Profit ${profit} IDR
ACCOUNTS: ${accountBalances.map((a) => `${a.name} ${a.balance} IDR`).join(", ")}
RECENT TRANSACTIONS:\n${txSample}

Respond ONLY with valid JSON: {"summary":"answer","total":0,"breakdown":[{"cat":"","amount":0}],"insights":[""],"suggestions":["","",""]}`;
    // Build messages with history (max last 3 exchanges = 6 messages)
    const historySlice = aiHistory.slice(-6);
    const messages = [...historySlice, { role: "user", content: queryText }];
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 800, system: sysPrompt, messages }),
      });
      const data = await resp.json();
      const raw = data.content?.[0]?.text || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setAiHistory([...messages, { role: "assistant", content: raw }]);
      setAiResult({ query: queryText, fromAI: true, summary: parsed.summary || "Here's what I found.", total: parsed.total || 0, matching: matching.slice(0, 20), breakdown: (parsed.breakdown || []).map((b) => [b.cat, b.amount]), insights: parsed.insights || [], suggestions: parsed.suggestions || [], timeLabel: rangeBounds.label });
    } catch {
      const noun = mCat || (q.includes("income") ? "income" : "expenses");
      const total2 = matching.reduce((a, t) => a + t.amount, 0);
      setAiResult({ query: queryText, fromAI: false, summary: `${fmtCompact(total2)} across ${matching.length} ${noun} txns`, total: total2, matching: matching.slice(0, 20), breakdown: [], insights: [], suggestions: [`${noun} last month`, "biggest expense this month", "show transactions"] });
    }
    setAiLoading(false);
  };

  const aiResultPanel = aiResult && (
    <Card style={{ padding: 16, marginTop: 10, animation: "fadeIn .2s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: T.faint, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700 }}>"{aiResult.query}"</div>
            {aiResult.fromAI && <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: `${T.gold}18`, color: T.goldDeep, letterSpacing: 0.3 }}>AI</span>}
          </div>
          <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: -0.6 }}>{aiResult.total > 0 ? fmtCompact(aiResult.total) : ""}</div>
          <div style={{ fontSize: 12, color: T.sub, marginTop: 3 }}>{aiResult.summary}</div>
        </div>
        <button onClick={() => { setAiResult(null); setAi(""); setAiHistory([]); setAiExpanded(false); }} className="lg-btn" style={{ background: T.panel2, border: "none", borderRadius: 9, padding: 7, cursor: "pointer", color: T.sub }}><X size={15} /></button>
      </div>
      {aiResult.insights && aiResult.insights.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
          {aiResult.insights.map((ins, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: T.panel2, borderRadius: 9, fontSize: 12.5, color: T.ink }}>
              <Sparkles size={12} color={T.gold} style={{ flexShrink: 0 }} />{ins}
            </div>
          ))}
        </div>
      )}
      {aiResult.breakdown && aiResult.breakdown.length > 0 && (
        <div style={{ marginTop: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>By category</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {(() => {
              const maxAmt = Math.max(...aiResult.breakdown.map(([, a]) => a), 1);
              return aiResult.breakdown.map(([cat, amt], i) => {
                const col = catColor(cat);
                const pct = (amt / maxAmt) * 100;
                return (
                  <div key={cat}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: col, boxShadow: `0 0 5px ${col}55` }} />
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: T.ink }}>{cat}</span>
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.sub }}>{fmtCompact(amt)}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: T.panel2, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: col, animation: `growBarX .6s ease ${i * 0.07}s both`, boxShadow: `0 0 8px ${col}44` }} />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
      {aiResult.matching.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10.5, color: T.faint, letterSpacing: 0.3, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>{aiResult.matching.length <= 4 ? "Transactions" : "Top transactions"}</div>
          {[...aiResult.matching].sort((a, b) => b.amount - a.amount).slice(0, 4).map((t) => (
            <TxnRow key={t.id} t={t} full onClick={() => setEditing({ kind: "txn", item: t })} />
          ))}
          {aiResult.matching.length > 4 && (
            <button onClick={() => { setQ(aiResult.query); setTab("txn"); }} className="lg-btn" style={{ background: "transparent", border: "none", color: T.goldDeep, fontWeight: 600, fontSize: 12, padding: "6px 0", cursor: "pointer", fontFamily: T.body }}>
              View all {aiResult.matching.length} →
            </button>
          )}
        </div>
      )}
      {aiResult.suggestions.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.line}`, display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontSize: 11, color: T.faint, fontWeight: 600, alignSelf: "center", marginRight: 4 }}>Try:</span>
          {aiResult.suggestions.slice(0, 4).map((s) => (
            <button key={s} onClick={() => { setAi(s); runAI(s); }} className="lg-btn" style={{ background: T.panel2, border: `1px solid ${T.line}`, color: T.sub, padding: "4px 9px", borderRadius: 7, fontSize: 11.5, cursor: "pointer", fontFamily: T.body, fontWeight: 500 }}>{s}</button>
          ))}
        </div>
      )}
    </Card>
  );

  const logo = (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(145deg, ${T.orange}, #ec6a2e)`, display: "grid", placeItems: "center", boxShadow: `0 4px 12px ${T.orange}55` }}>
        <span style={{ fontFamily: T.display, fontWeight: 800, color: "#fff", fontSize: 17, lineHeight: 1 }}>O</span>
      </div>
      <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 21, letterSpacing: -0.5, color: T.ink }}>Oreo</span>
    </div>
  );

  const profileSwitcher = (
    <div style={{ position: "relative" }}>
      <button onClick={() => setProfMenu((v) => !v)} className="lg-btn"
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: T.panelSolid, border: `1px solid ${T.line}`, borderRadius: 13, padding: "9px 12px", cursor: "pointer" }}>
        {user?.photoURL && profile.type !== "business" ? (
          <img src={user.photoURL} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover", flexShrink: 0, boxShadow: `0 2px 8px rgba(0,0,0,0.25)` }} />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: 10, background: profile.type === "business" ? "linear-gradient(135deg, #22c55e, #15a34a)" : `linear-gradient(135deg, ${T.goldDeep}, ${T.orange})`, display: "grid", placeItems: "center", color: "#fff", flexShrink: 0, boxShadow: `0 4px 12px ${T.gold}40` }}>
            {profile.type === "business" ? <Building2 size={16} /> : <Wallet size={16} />}
          </div>
        )}
        <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, letterSpacing: -0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.name}</div>
          <div style={{ fontSize: 10, color: T.faint, textTransform: "capitalize", marginTop: 1 }}>{profile.type} account</div>
        </div>
        <ChevronDown size={13} color={T.faint} style={{ flexShrink: 0 }} />
      </button>
      {profMenu && (
        <div className="lg-pop" style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, background: T.panelSolid, border: `1px solid ${T.line}`, borderRadius: 16, padding: 6, zIndex: 20, boxShadow: T.shadowLg }}>
          {state.profiles.map((p) => {
            const active = p.id === state.active;
            return (
              <button key={p.id} className="lg-nav lg-btn" onClick={() => { setState((s) => ({ ...s, active: p.id })); setProfMenu(false); setTab("dash"); showToast(`Switched to ${p.name}`, 1600); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: active ? `${T.accent}14` : "none", border: "none", borderRadius: 10, padding: "9px 10px", cursor: "pointer", color: active ? T.accent : T.sub, textAlign: "left" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center",
                  background: p.type === "business" ? "linear-gradient(135deg, #22c55e, #15a34a)" : active ? T.accent : `${T.accent}22`,
                  color: active ? "#fff" : T.accent }}>
                  {p.type === "business" ? <Building2 size={13} color="#fff" /> : <Wallet size={13} />}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500, flex: 1 }}>{p.name}</span>
                {active && <div style={{ width: 7, height: 7, borderRadius: 99, background: T.accent, boxShadow: `0 0 6px ${T.accent}` }} />}
              </button>
            );
          })}
          <div style={{ borderTop: `1px solid ${T.line}`, margin: "4px 6px 0" }} />
          <div style={{ padding: "8px 10px", fontSize: 11.5, color: T.faint, display: "flex", alignItems: "center", gap: 7 }}><Plus size={12} /> New profile coming soon</div>
        </div>
      )}
    </div>
  );

  const aiBar = (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: isDesktop ? T.panelSolid + "f2" : T.panelSolid,
      border: `1px solid ${T.line}`,
      borderRadius: isDesktop ? 18 : 16,
      padding: isDesktop ? "10px 10px 10px 20px" : "7px 7px 7px 16px",
      backdropFilter: isDesktop ? "blur(8px)" : undefined,
      WebkitBackdropFilter: isDesktop ? "blur(8px)" : undefined,
      boxShadow: "0 1px 2px rgba(17,24,39,0.04), 0 14px 30px -20px rgba(17,24,39,0.16)"
    }}>
      <Sparkles size={isDesktop ? 20 : 18} color={T.accent} />
      <input ref={aiInputRef} value={ai} onChange={(e) => setAi(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runAI()}
        placeholder={isDesktop ? "Ask anything about your money — e.g. “food spending this month”, “income last month”…" : "Ask about your money — e.g. “food spending this month”"}
        style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: isDesktop ? 15 : 14.5, fontFamily: T.body, color: T.ink, minWidth: 0 }} />
      <button onClick={runAI} disabled={aiLoading} className="lg-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: aiLoading ? T.panel2 : T.accent, border: aiLoading ? `1px solid ${T.line}` : "none", borderRadius: 12, padding: isDesktop ? "10px 18px" : "9px 15px", cursor: aiLoading ? "not-allowed" : "pointer", color: aiLoading ? T.faint : "#fff", fontWeight: 600, fontSize: isDesktop ? 14 : 13.5, fontFamily: T.body, transition: "all .2s ease", boxShadow: aiLoading ? "none" : `0 4px 16px ${T.accent}50` }}>
        {aiLoading ? <><RefreshCw size={14} style={{ animation: "spin .8s linear infinite" }} /> Thinking…</> : "Explore"}
      </button>
    </div>
  );

  const heroCard = (
    <Card style={{ padding: 22, height: "100%" }} className="lg-rise">
      <div className="lg-rise" style={{ ...stagger(0) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label>Net Worth</Label>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 10, gap: 12 }}>
          <div style={{ fontFamily: T.display, fontSize: isDesktop ? 46 : 36, fontWeight: 800, letterSpacing: -1.5, lineHeight: 0.95, color: T.ink }}>
            {fmtDisp(netWorth)}
          </div>
          <div style={{ paddingBottom: 4 }}>{nwTrend.length >= 3 && <Sparkline points={nwTrend} color={T.gold} w={isDesktop ? 130 : 92} />}</div>
        </div>
        {disp === "USD" && <div style={{ fontSize: 10.5, color: T.faint, marginTop: 6, fontFamily: T.mono }}>1 USD = Rp {USD_IDR.toLocaleString("id-ID")}</div>}
        <div style={{ display: "flex", gap: 22, marginTop: 18 }}>
          <div>
            <div style={{ fontSize: 10.5, color: T.faint, letterSpacing: 0.5 }}>Cash flow (mo)</div>
            <div style={{ marginTop: 3 }}><Money v={profit} sign color={profit >= 0 ? T.greenDeep : T.red} /></div>
          </div>
          <div style={{ width: 1, background: T.line }} />
          <div>
            <div style={{ fontSize: 10.5, color: T.faint, letterSpacing: 0.5 }}>Investments</div>
            <div style={{ marginTop: 3 }}><Money v={invValue} /></div>
          </div>
        </div>
      </div>
    </Card>
  );

  const statCardEls = [
    { l: "Revenue", v: revenue, c: T.greenDeep, icon: <ArrowUpRight size={13} /> },
    { l: "Expenses", v: expense, c: T.red, icon: <ArrowDownRight size={13} /> },
    { l: "Profit", v: profit, c: T.gold, icon: <TrendingUp size={13} /> },
  ].map((x, i) => (
    <Card key={x.l} style={{ padding: 14, height: "100%" }} className="lg-rise">
      <div className="lg-rise" style={stagger(i + 1)}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: x.c, marginBottom: 9 }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: `${x.c}16`, display: "grid", placeItems: "center" }}>{x.icon}</div>
        </div>
        <Label style={{ fontSize: 9.5 }}>{x.l}</Label>
        <div style={{ fontFamily: T.display, fontSize: 19, fontWeight: 800, letterSpacing: -0.5, color: x.l === "Profit" ? x.c : T.ink, marginTop: 4 }}>{fmtCompact(x.v)}</div>
      </div>
    </Card>
  ));
  const statGrid = (cols) => <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10 }}>{statCardEls}</div>;

  const breakdownData = chartCatSegments.slice(0, 4);
  const breakdownNode = (
    <>
      <Label>Spending by category</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {breakdownData.length === 0 && <div style={{ color: T.faint, fontSize: 13 }}>No expenses in this range.</div>}
        {breakdownData.map((s, i) => {
          const pct = (s.value / chartBreakdownTotal) * 100;
          return (
            <div key={s.label} className="lg-row" onClick={() => { setF((prev) => ({ ...prev, cats: [s.label] })); setTab("txn"); showToast(`Filtered: ${s.label}`, 1800); }}
              style={{ cursor: "pointer", padding: "2px", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}66` }} />
                  <span style={{ fontSize: 13, color: T.ink, fontWeight: 500 }}>{s.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10.5, color: T.faint, fontFamily: T.mono }}>{pct.toFixed(0)}%</span>
                  <span style={{ fontFamily: T.mono, fontSize: 12.5, color: T.sub, fontWeight: 600 }}>{fmtCompact(s.value)}</span>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: T.panel2, overflow: "hidden" }}>
                <div style={{ width: `${Math.max(2, pct)}%`, height: "100%", borderRadius: 99, background: s.color,
                  transformOrigin: "left", animation: `growBarX .65s cubic-bezier(.2,.8,.3,1) ${i * 0.08}s both`,
                  boxShadow: `0 0 8px ${s.color}55` }} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const PANEL_LIMIT = 3; // rows shown per section before "+N more" (sections have fixed flex height)
  const goalsNode = goals.length > 0 ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {goals.map((g) => {
        const col = g.kind === "debt" ? T.red : (g.pct >= 1 ? T.greenDeep : T.gold);
        return (
          <div key={g.id} onClick={() => setEditing({ kind: "goal", item: g })} className="lg-row" style={{ cursor: "pointer", padding: "2px", borderRadius: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12, marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{g.name}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10.5 }}>
                <span style={{ color: col, fontWeight: 600 }}>{fmtCompact(g.computed)}</span>
                <span style={{ color: T.faint }}> / {fmtCompact(g.target)}</span>
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 3, background: T.line, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(g.pct, 1) * 100}%`, height: "100%", background: col, borderRadius: 3, transition: "width .4s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.faint, marginTop: 3, fontFamily: T.mono }}>
              <span>{g.pct >= 1 ? <span style={{ color: T.greenDeep, fontWeight: 600 }}>✓</span> : g.onTrack === true ? <span style={{ color: T.greenDeep }}>✓ on track</span> : g.kind === "debt" && g.monthlyNeeded ? <span>{fmtCompact(g.monthlyNeeded)}/mo</span> : g.onTrack === false && g.monthlyShortfall > 0 ? <span style={{ color: T.red }}>+{fmtCompact(g.monthlyShortfall)}/mo</span> : `${(g.pct * 100).toFixed(0)}%`}</span>
              {g.daysLeft !== null && g.pct < 1 && <span>{g.daysLeft > 0 ? `${g.daysLeft}d` : "due"}</span>}
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div style={{ fontSize: 11, color: T.faint, textAlign: "center", padding: "8px 0" }}>No goals yet.</div>
  );

  const accountRow = (a, isLiab) => {
    const col = providerColor(a.provider);
    const totalDisplay = a.balance + (a.holdingsVal || 0);
    return (
      <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 9px", background: T.panel2, borderRadius: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ width: 25, height: 25, borderRadius: 7, background: `${col}18`, border: `1px solid ${col}28`, display: "grid", placeItems: "center", color: col, fontFamily: T.display, fontWeight: 800, fontSize: 10.5, flexShrink: 0 }}>{(a.provider || a.name)[0]}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>{a.name}</div>
            {a.holdingsVal > 0 && <div style={{ fontSize: 9.5, color: T.greenDeep, marginTop: 1 }}>+{fmtCompact(a.holdingsVal)} holdings</div>}
          </div>
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: isLiab ? T.red : (totalDisplay < 0 ? T.red : T.ink), flexShrink: 0, marginLeft: 6 }}>
          {isLiab ? "−" : ""}{fmtCompact(Math.abs(totalDisplay))}
        </div>
      </div>
    );
  };
  const accountsNode = (
    <>
      {assetAccounts.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
            Assets · <span style={{ color: T.greenDeep }}>{fmtCompact(totalAssets)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: liabAccounts.length > 0 ? 8 : 0 }}>
            {assetAccounts.map((a) => accountRow(a, false))}
          </div>
        </>
      )}
      {liabAccounts.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
            Liabilities · <span style={{ color: T.red }}>{fmtCompact(totalLiab)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {liabAccounts.map((a) => accountRow(a, true))}
          </div>
        </>
      )}
    </>
  );

  const budgetsNode = budgetProgress.length > 0 ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {budgetProgress.map((b) => {
        const pct = Math.min(b.pct, 1.5);
        const barCol = b.pct >= 1 ? T.red : b.pct >= 0.85 ? T.gold : T.greenDeep;
        return (
          <div key={b.id}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 3 }}>
              <span style={{ fontWeight: 600 }}>{b.cat}</span>
              <span style={{ fontFamily: T.mono, fontSize: 10.5 }}>
                <span style={{ color: barCol, fontWeight: 600 }}>{fmtCompact(b.spent)}</span>
                <span style={{ color: T.faint }}> / {fmtCompact(b.cap || b.monthly)}{b.rangeMonths > 1 ? <span style={{ fontSize: 9 }}> ×{b.rangeMonths}</span> : ""}</span>
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 3, background: T.line, overflow: "hidden", position: "relative" }}>
              <div style={{ width: `${Math.min(pct, 1) * 100}%`, height: "100%", background: barCol, borderRadius: 3, transition: "width .4s ease" }} />
              {b.pct > 1 && <div style={{ position: "absolute", right: 0, top: 0, width: `${Math.min(pct - 1, 0.5) * 100}%`, height: "100%", background: T.red, opacity: 0.4 }} />}
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  const insightIcon = (ins) => {
    if (ins.kind === "warn") {
      if (ins.text.includes("budget")) return <ShieldAlert size={14} />;
      if (ins.text.includes("logged")) return <Zap size={14} />;
      if (ins.text.includes("Goal")) return <Target size={14} />;
      return <AlertTriangle size={14} />;
    }
    if (ins.kind === "good" || ins.kind === "up") return <TrendingUp size={14} />;
    if (ins.kind === "down") return <TrendingDown size={14} />;
    if (ins.text.includes("renew")) return <Clock size={14} />;
    if (ins.text.includes("Largest")) return <BarChart3 size={14} />;
    return <Info size={14} />;
  };

  const insightsNode = insights.length > 0 ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {insights.map((ins, i) => {
        const col = ins.kind === "warn" ? T.red : ins.kind === "good" || ins.kind === "up" ? T.greenDeep : ins.kind === "down" ? T.red : T.goldDeep;
        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "7px 9px", background: T.panel2, borderRadius: 9 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: `${col}16`, display: "grid", placeItems: "center", color: col, flexShrink: 0 }}>{insightIcon(ins)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, lineHeight: 1.4, color: T.ink }}>{ins.text}</div>
              {ins.value > 0 && <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: col, marginTop: 1 }}>{fmtCompact(Math.abs(ins.value))}</div>}
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  const spendNode = chartCatSegments.length > 0 ? (
    <>
      <div style={{ marginBottom: 4 }}>
        <Label>Where it went</Label>
        {chartRangeLabel && <div style={{ fontSize: 11, color: T.faint, marginTop: 3, fontFamily: T.mono }}>{chartRangeLabel}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", alignItems: "center", gap: isDesktop ? 18 : 12, marginTop: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <Donut segments={chartCatSegments} centerTop={fmtCompact(chartExpense)} centerBot="spent"
            onSegmentClick={(cat) => { setF((prev) => ({ ...prev, cats: [cat] })); setTab("txn"); showToast(`Filtered: ${cat}`, 1800); }} />
          <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.2, display: "flex", alignItems: "center", gap: 3 }}>
            <span>tap slice →</span><span style={{ color: T.goldDeep, fontWeight: 600 }}>filter Activity</span>
          </div>
        </div>
        <Legend segments={chartCatSegments} />
      </div>
    </>
  ) : <div style={{ color: T.faint, fontSize: 14, padding: "24px 0", textAlign: "center" }}>No expenses in this range</div>;

  const growthNode = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <Label>Net worth growth</Label>
          {growthRangeLabel && <div style={{ fontSize: 11, color: T.faint, marginTop: 3, fontFamily: T.mono }}>{growthRangeLabel}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: filteredGrowthPct >= 0 ? T.greenDeep : T.red, fontFamily: T.mono, fontSize: 12.5, fontWeight: 600, background: `${filteredGrowthPct >= 0 ? T.green : T.red}1c`, padding: "3px 8px", borderRadius: 8, flexShrink: 0 }}>
          {filteredGrowthPct >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{Math.abs(filteredGrowthPct).toFixed(1)}%
        </div>
      </div>
      <GrowthChart data={filteredGrowthData} invested={investedSeries} />
    </>
  );
  const cashNet = cashTotals.income - cashTotals.expense;
  const cashNode = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <Label>Cash flow</Label>
          {chartRangeLabel && <div style={{ fontSize: 11, color: T.faint, marginTop: 3, fontFamily: T.mono }}>{chartRangeLabel}</div>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { l: "In", v: cashTotals.income, c: T.greenDeep, sign: "+" },
          { l: "Out", v: cashTotals.expense, c: T.red, sign: "−" },
          { l: "Net", v: Math.abs(cashNet), c: cashNet >= 0 ? T.greenDeep : T.red, sign: cashNet >= 0 ? "+" : "−" },
          ...(cashTotals.realized !== 0 ? [{ l: "P&L", v: Math.abs(cashTotals.realized), c: cashTotals.realized >= 0 ? T.goldDeep : T.red, sign: cashTotals.realized >= 0 ? "+" : "−" }] : []),
        ].map((s) => (
          <div key={s.l} style={{ flex: 1, background: T.panel2, borderRadius: 11, padding: "9px 11px" }}>
            <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.4, textTransform: "uppercase" }}>{s.l}</div>
            <div style={{ fontFamily: T.mono, fontSize: 13.5, fontWeight: 600, color: s.c, marginTop: 3 }}>{s.sign}{fmtCompact(s.v)}</div>
          </div>
        ))}
      </div>
      <CashFlowChart data={cashSeries} />
    </>
  );

  const chartTabs = [
    { k: "growth", label: "Growth", node: growthNode },
    { k: "cash", label: "Cash flow", node: cashNode },
    { k: "spend", label: "Where it went", node: spendNode },
  ];

  const renewalsList = upcoming.length > 0 ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {upcoming.map((s) => {
        const days = Math.ceil((new Date(s.next + "T00:00:00") - new Date()) / 864e5);
        const soon = days <= 3;
        return (
          <div key={s.id} className="lg-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 3px", borderRadius: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: soon ? `${T.gold}16` : T.panel2, display: "grid", placeItems: "center", color: soon ? T.gold : T.faint, flexShrink: 0 }}>
                <Calendar size={11} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.2 }}>{s.merchant}</div>
                <div style={{ fontSize: 9.5, color: soon ? T.gold : T.faint }}>{days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days}d`}</div>
              </div>
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.sub }}>{fmtCompact(s.amount)}</span>
          </div>
        );
      })}
    </div>
  ) : (
    <div style={{ fontSize: 11, color: T.faint, textAlign: "center", padding: "6px 0" }}>No upcoming renewals</div>
  );

  const recentList = (
    <div>{monthTx.slice(0, isDesktop ? 7 : 5).map((t) => <TxnRow key={t.id} t={t} full onClick={() => setEditing({ kind: "txn", item: t })} />)}</div>
  );

  const dashMobile = (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 14, paddingTop: 4 }} className="lg-rise">
        <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 800, color: T.ink, letterSpacing: -0.4 }}>
          Hello, {profile?.name?.split(" ")[0] || "there"} 👋
        </div>
      </div>
      {/* Sticky frosted-glass bar — range selector only */}
      <div style={{
        position: "sticky", top: -8, zIndex: 10,
        margin: "0 -18px 14px",
        padding: "10px 18px",
        background: `${T.bg}b8`,
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${T.line}50`,
      }} className="lg-rise">
        <ChartRangeBar range={chartRange} setRange={setChartRange} from={chartFrom} setFrom={setChartFrom} to={chartTo} setTo={setChartTo} opts={RANGE_OPTS} isDesktop={false} />
        <div style={{ fontSize: 10.5, color: T.faint, fontFamily: T.mono, marginTop: 6 }}>
          <span style={{ color: T.sub, fontWeight: 600 }}>{rangeBounds.label}</span> · {statTx.filter((t) => t.type !== "transfer").length} txns
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>{aiBar}{aiResultPanel}</div>
      <div style={{ marginBottom: 14 }}>{heroCard}</div>
      <div style={{ marginBottom: 14 }}>{statGrid("1fr 1fr 1fr")}</div>
      {/* Chart card with tabs inside */}
      <Card style={{ padding: 14, marginBottom: 14 }} className="lg-rise">
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {chartTabs.map((c) => {
            const on = chartView === c.k;
            return (
              <button key={c.k} onClick={() => setChartView(c.k)} className="lg-btn"
                style={{ flex: 1, padding: "7px 4px", borderRadius: 10, border: `1px solid ${on ? T.accent + "50" : T.line}`,
                  background: on ? `${T.accent}14` : T.panel2, color: on ? T.accent : T.sub,
                  cursor: "pointer", fontWeight: on ? 700 : 500, fontSize: 11.5, fontFamily: T.body,
                  whiteSpace: "nowrap", textAlign: "center" }}>
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="lg-pop" key={chartView + chartRange}>
          {chartTabs.find((c) => c.k === chartView).node}
        </div>
      </Card>
      {insightsNode && <MobileSection sectionKey="insights" label="Insights" icon={<Sparkles size={12} color={T.gold} />} collapsed={dashCollapsed.insights} onToggle={toggleSection}>{insightsNode}</MobileSection>}
      <MobileSection sectionKey="goals" label="Goals" icon={<Target size={12} color={T.faint} />} alwaysShow collapsed={dashCollapsed.goals} onToggle={toggleSection}>{goalsNode}</MobileSection>
      {budgetsNode && <MobileSection sectionKey="budgets" label="Budgets" icon={<BarChart3 size={12} color={T.faint} />} collapsed={dashCollapsed.budgets} onToggle={toggleSection}>{budgetsNode}</MobileSection>}
      <MobileSection sectionKey="accounts" label="Accounts" icon={<Wallet size={12} color={T.faint} />} alwaysShow collapsed={dashCollapsed.accounts} onToggle={toggleSection}>{accountsNode}</MobileSection>
      <MobileSection sectionKey="upcoming" label="Upcoming renewals" icon={<Clock size={12} color={T.faint} />} collapsed={dashCollapsed.upcoming} onToggle={toggleSection}>{renewalsList}</MobileSection>
    </div>
  );

  const dashDesktop = (
    <div>
      {/* Greeting — full width above the grid */}
      <div style={{ marginBottom: 18 }} className="lg-rise">
        <div style={{ fontFamily: T.display, fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: -0.5 }}>
          Hello, {profile?.name?.split(" ")[0] || "there"} 👋
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 296px", gap: 16, alignItems: "start" }}>

      {/* ─── LEFT: primary analysis ─── */}
      <div>

        {/* Compact hero strip — net worth + 3 stats in one row */}
        <Card style={{ padding: "14px 20px", marginBottom: 10 }} className="lg-rise">
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 0, alignItems: "center" }}>
            {/* Net worth */}
            <div style={{ paddingRight: 24, borderRight: `1px solid ${T.line}` }}>
              <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Net worth · {rangeBounds.label}</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
                <div style={{ fontFamily: T.display, fontSize: 38, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1, color: T.ink }}>{fmtDisp(netWorth)}</div>
                <div style={{ paddingBottom: 2 }}>{nwTrend.length >= 3 && <Sparkline points={nwTrend} color={T.gold} w={90} />}</div>
              </div>
            </div>
            {/* Revenue / Expenses / Profit inline */}
            {[
              { l: "Revenue", v: revenue, c: T.greenDeep, icon: <ArrowUpRight size={12} /> },
              { l: "Expenses", v: expense, c: T.red, icon: <ArrowDownRight size={12} /> },
              { l: "Cash flow", v: profit, c: profit >= 0 ? T.greenDeep : T.red, icon: <TrendingUp size={12} /> },
            ].map((x, i) => (
              <div key={x.l} style={{ paddingLeft: 20, paddingRight: i < 2 ? 20 : 0, borderRight: i < 2 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 5 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: `${x.c}18`, display: "grid", placeItems: "center", color: x.c }}>{x.icon}</div>
                  <span style={{ fontSize: 10, color: T.faint, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700 }}>{x.l}</span>
                </div>
                <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 800, letterSpacing: -0.4, color: x.l === "Cash flow" ? x.c : T.ink }}>{fmtCompact(x.v)}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* AI Explore — collapsed to a single prompt row by default */}
        <div style={{ marginBottom: 10 }}>
          {!aiExpanded && !aiResult ? (
            <button onClick={() => { setAiExpanded(true); setTimeout(() => document.getElementById("oreo-ai-input")?.focus(), 50); }} className="lg-btn"
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                background: `linear-gradient(135deg, ${T.accent}12, ${T.accent2}07, ${T.accent}09)`,
                border: `1px solid ${T.accent}28`, borderRadius: 14, cursor: "pointer", fontFamily: T.body,
                boxShadow: `0 2px 16px ${T.accent}0e, inset 0 1px 0 rgba(255,255,255,0.05)` }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(145deg, ${T.accent2}, ${T.accent})`, display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 3px 10px ${T.accent}38` }}>
                <Sparkles size={13} color="#fff" />
              </div>
              <span style={{ flex: 1, color: T.sub, fontSize: 13.5 }}>Ask anything about your finances…</span>
              <span style={{ fontSize: 10.5, color: T.faint, fontFamily: T.mono, background: T.panel2, padding: "3px 8px", borderRadius: 7, border: `1px solid ${T.line}` }}>/ or ⌘K</span>
            </button>
          ) : (
            <div style={{ position: "sticky", top: 0, zIndex: 5, background: T.bg + "dd", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: 16, padding: "2px 0" }}>
              <div id="oreo-ai-input">{aiBar}</div>
              {aiResultPanel && <div style={{ marginTop: -4 }}>{aiResultPanel}</div>}
            </div>
          )}
          {aiResult && !aiExpanded && (
            <div style={{ marginTop: -4 }}>{aiResultPanel}</div>
          )}
        </div>

        {/* Charts — growth full-width, then cash+spend side by side */}
        <Card style={{ padding: "12px 16px 14px", marginBottom: 10 }} className="lg-rise">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Label>Net worth over time</Label>
            <span style={{ fontSize: 11, color: filteredGrowthPct >= 0 ? T.greenDeep : T.red, fontFamily: T.mono, fontWeight: 600 }}>
              {filteredGrowthPct >= 0 ? "▲" : "▼"} {Math.abs(filteredGrowthPct).toFixed(1)}%
            </span>
          </div>
          <GrowthChart data={filteredGrowthData} invested={investedSeries} chartId="main" />
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <Card style={{ padding: "12px 16px 14px" }} className="lg-rise">{cashNode}</Card>
          <Card style={{ padding: "12px 16px 14px" }} className="lg-rise">{spendNode}</Card>
        </div>

        <Card style={{ padding: "12px 16px 14px" }} className="lg-rise">{breakdownNode}</Card>
      </div>

      {/* ─── RIGHT: fully fixed, shows everything at once ─── */}
      <div style={{ position: "sticky", top: 0 }}>

        {/* Section helper */}
        {((sections) => sections.filter(Boolean).map(({ key, icon, label, aside, content }, idx, arr) => (
          <div key={key} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: idx < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              {icon}
              <span style={{ flex: 1, fontSize: 9.5, letterSpacing: 0.9, textTransform: "uppercase", fontWeight: 700, color: T.faint, fontFamily: T.body }}>{label}</span>
              {aside && <span style={{ fontSize: 10, color: T.faint }}>{aside}</span>}
            </div>
            {content}
          </div>
        )))([
          /* INSIGHTS */
          insights.length > 0 && {
            key: "ins", icon: <Sparkles size={10} color={T.gold} />, label: "Insights",
            content: (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {insights.map((ins, i) => {
                  const col = ins.kind === "warn" ? T.red : ins.kind === "good" || ins.kind === "up" ? T.greenDeep : ins.kind === "down" ? T.red : T.goldDeep;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                      <div style={{ width: 3, height: 3, borderRadius: 2, background: col, marginTop: 6, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: T.sub, lineHeight: 1.4 }}>{ins.text}</span>
                    </div>
                  );
                })}
              </div>
            ),
          },
          /* ACCOUNTS */
          {
            key: "acc", icon: <Wallet size={10} color={T.faint} />, label: "Accounts",
            aside: <span style={{ fontFamily: T.mono, fontSize: 10, color: T.faint }}>Net {fmtCompact(totalAssets - totalLiab)}</span>,
            content: (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {assetAccounts.length > 0 && (
                  <div style={{ fontSize: 8.5, color: T.faint, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>
                    Assets · <span style={{ color: T.greenDeep }}>{fmtCompact(totalAssets)}</span>
                  </div>
                )}
                {assetAccounts.map((a) => {
                  const col = providerColor(a.provider); const val = a.balance + (a.holdingsVal || 0);
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.line}4a` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <div style={{ width: 5, height: 16, borderRadius: 2, background: col, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                        {a.holdingsVal > 0 && <span style={{ fontSize: 9, color: T.greenDeep }}>↑</span>}
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{fmtCompact(val)}</span>
                    </div>
                  );
                })}
                {liabAccounts.length > 0 && (
                  <div style={{ fontSize: 8.5, color: T.faint, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, margin: "7px 0 4px" }}>
                    Liabilities · <span style={{ color: T.red }}>{fmtCompact(totalLiab)}</span>
                  </div>
                )}
                {liabAccounts.map((a) => {
                  const col = providerColor(a.provider);
                  return (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.line}4a` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <div style={{ width: 5, height: 16, borderRadius: 2, background: col, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 600, color: T.red, flexShrink: 0, marginLeft: 6 }}>−{fmtCompact(a.balance)}</span>
                    </div>
                  );
                })}
              </div>
            ),
          },
          /* GOALS */
          {
            key: "gls", icon: <Target size={10} color={T.faint} />, label: "Goals",
            aside: <button onClick={(e) => { e.stopPropagation(); setModal("goal"); }} className="lg-btn" style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, display: "flex", alignItems: "center", gap: 2, fontSize: 10, fontFamily: T.body, padding: 0 }}><Plus size={10} /> Add</button>,
            content: goals.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {goals.map((g) => {
                  const col = g.kind === "debt" ? T.red : g.pct >= 1 ? T.greenDeep : T.gold;
                  return (
                    <div key={g.id} onClick={() => setEditing({ kind: "goal", item: g })} className="lg-row" style={{ cursor: "pointer", borderRadius: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
                        </div>
                        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.faint, flexShrink: 0 }}>
                          <span style={{ color: col, fontWeight: 600 }}>{(g.pct * 100).toFixed(0)}</span>%
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <div style={{ flex: 1, height: 3, borderRadius: 2, background: T.line, overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(g.pct, 1) * 100}%`, height: "100%", background: col, borderRadius: 2, transition: "width .4s ease" }} />
                        </div>
                        <span style={{ fontFamily: T.mono, fontSize: 9.5, color: T.faint, flexShrink: 0 }}>
                          {g.pct >= 1 ? <span style={{ color: T.greenDeep }}>✓</span> : g.onTrack === true ? <span style={{ color: T.greenDeep }}>↑</span> : g.onTrack === false ? <span style={{ color: T.red }}>↓</span> : ""}
                          {fmtCompact(g.computed)} / {fmtCompact(g.target)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div style={{ fontSize: 11, color: T.faint }}>No goals yet.</div>,
          },
          /* BUDGETS */
          budgetProgress.length > 0 && {
            key: "bud", icon: <BarChart3 size={10} color={T.faint} />, label: `Budgets · ${rangeMonths > 1 ? `${rangeMonths}mo` : "this month"}`,
            aside: <button onClick={(e) => { e.stopPropagation(); setModal("budget"); }} className="lg-btn" style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, display: "flex", alignItems: "center", gap: 2, fontSize: 10, fontFamily: T.body, padding: 0 }}><Plus size={10} /> Add</button>,
            content: (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {budgetProgress.map((b) => {
                  const barCol = b.pct >= 1 ? T.red : b.pct >= 0.85 ? T.gold : T.greenDeep;
                  return (
                    <div key={b.id}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{b.cat}</span>
                        <span style={{ fontFamily: T.mono, fontSize: 10.5 }}>
                          <span style={{ color: barCol, fontWeight: 600 }}>{fmtCompact(b.spent)}</span>
                          <span style={{ color: T.faint }}> / {fmtCompact(b.cap || b.monthly)}</span>
                        </span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: T.line, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(b.pct, 1) * 100}%`, height: "100%", background: barCol, borderRadius: 2, transition: "width .4s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          },
          /* UPCOMING */
          {
            key: "upc", icon: <Clock size={10} color={T.faint} />, label: "Upcoming",
            content: upcoming.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {upcoming.map((s) => {
                  const days = Math.ceil((new Date(s.next + "T00:00:00") - new Date()) / 864e5);
                  const soon = days <= 3;
                  return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${T.line}4a` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 10, fontFamily: T.mono, color: soon ? T.gold : T.faint, width: 28, flexShrink: 0 }}>{days <= 0 ? "today" : `${days}d`}</span>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{s.merchant}</span>
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.sub }}>{fmtCompact(s.amount)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <div style={{ fontSize: 11, color: T.faint }}>No upcoming renewals</div>,
          },
        ])}
      </div>
    </div>
    </div>
  );

  // Recurring templates — only show series active within last 90 days
  const recurringItems = (() => {
    const cutoff = daysAgo(90);
    const seen = new Map();
    [...pdata.transactions].sort((a, b) => b.date.localeCompare(a.date)).forEach((t) => {
      if (!t.recurring) return;
      if (t.date < cutoff) return; // skip stale series
      const key = `${t.type}|${t.cat}|${t.amount}|${t.acct}`;
      if (!seen.has(key)) seen.set(key, { ...t, count: pdata.transactions.filter((x) => x.type === t.type && x.cat === t.cat && x.amount === t.amount && x.acct === t.acct).length });
    });
    return [...seen.values()];
  })();

  // Activity helpers
  const dateLabel = (iso) => {
    const today = todayISO(); const yest = daysAgo(1);
    if (iso === today) return "Today";
    if (iso === yest) return "Yesterday";
    const d = new Date(iso + "T00:00:00");
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", ...(sameYear ? {} : { year: "2-digit" }) });
  };
  const txGroups = (() => {
    const map = {};
    filteredTx.forEach((t) => { (map[t.date] = map[t.date] || []).push(t); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  const activityContent = (
    <div className="lg-pop">
      {!isDesktop && <Header title="Activity" sub={`${filteredTx.length} transactions`} />}

      {/* Recurring section */}
      {recurringItems.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden", marginBottom: 14 }} className="lg-rise">
          <button onClick={() => toggleSection("recurring")} className="lg-btn"
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: dashCollapsed.recurring ? "none" : `1px solid ${T.line}`, textAlign: "left" }}>
            <RefreshCw size={12} color={T.gold} />
            <span style={{ flex: 1, fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700, color: T.faint, fontFamily: T.body }}>Recurring · {recurringItems.length}</span>
            <ChevronDown size={13} color={T.faint} style={{ transform: dashCollapsed.recurring ? "rotate(-90deg)" : "none", transition: "transform .2s ease" }} />
          </button>
          {!dashCollapsed.recurring && (
            <div style={{ padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: 6, animation: "pop .18s ease" }}>
              {recurringItems.map((t) => {
                const cd = t.recurring === "weekly" ? 7 : 30;
                const lastDate = pdata.transactions.filter((x) => x.type === t.type && x.cat === t.cat && x.amount === t.amount && x.acct === t.acct).sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
                const nextDate = lastDate ? new Date(new Date(lastDate + "T00:00:00").getTime() + cd * 864e5).toISOString().slice(0, 10) : null;
                const daysUntil = nextDate ? Math.round((new Date(nextDate + "T00:00:00") - new Date()) / 864e5) : null;
                const col = catColor(t.cat);
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: T.panel2, borderRadius: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${col}1a`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                      <RefreshCw size={13} color={col} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.note || t.cat}</div>
                      <div style={{ fontSize: 10.5, color: T.faint, marginTop: 1 }}>{t.recurring} · {t.acct}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: t.type === "income" ? T.greenDeep : T.ink }}>{t.type === "income" ? "+" : "−"}{fmtCompact(t.amount)}</div>
                      {daysUntil !== null && <div style={{ fontSize: 9.5, color: daysUntil <= 3 ? T.gold : T.faint, fontFamily: T.mono, marginTop: 1 }}>next {daysUntil <= 0 ? "today" : `${daysUntil}d`}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => setEditing({ kind: "txn", item: t, editSeries: true })} className="lg-btn" style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: T.faint, fontSize: 10.5, fontFamily: T.body }}>Edit</button>
                      <button onClick={() => {
                        const tid = [...pdata.transactions].filter((x) => x.type === t.type && x.cat === t.cat && x.amount === t.amount && x.acct === t.acct && x.recurring).sort((a, b) => b.date.localeCompare(a.date))[0]?.id;
                        if (tid) setPData({ transactions: pdata.transactions.map((x) => x.id === tid ? { ...x, recurring: undefined } : x) });
                        showToast("Paused ✓", 1800);
                      }} className="lg-btn" style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 7, padding: "4px 9px", cursor: "pointer", color: T.faint, fontSize: 10.5, fontFamily: T.body }}>Pause</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Sticky filter + summary */}
      <div style={{ position: "sticky", top: 0, zIndex: 4, background: T.bg + "ee", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", paddingBottom: 8, marginBottom: 4 }}>
        <FilterBar q={q} setQ={setQ} f={f} setF={setF} onFilter={() => setShowFilter(true)} count={activeChips.length} chips={activeChips} onClearAll={resetFilters} onExport={exportView} placeholder="Search notes, categories, amounts…" />
        {filteredTx.length > 0 && (
          <div style={{ display: "flex", gap: 0, marginTop: 8, background: T.panel2, borderRadius: 12, overflow: "hidden" }}>
            {[
              { l: "Income", v: filteredTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), c: T.greenDeep },
              { l: "Spent", v: filteredTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), c: T.red },
              { l: "Net", v: filteredTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0) - filteredTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), c: null },
              { l: "Transactions", v: null, count: filteredTx.length, c: T.sub },
            ].map(({ l, v, count, c }, i) => {
              const netPos = v !== null && v >= 0;
              return (
                <div key={l} style={{ flex: 1, padding: "8px 12px", borderLeft: i > 0 ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ fontSize: 9, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 3 }}>{l}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 13.5, fontWeight: 700, color: count !== undefined ? T.sub : (l === "Net" ? (netPos ? T.greenDeep : T.red) : c) }}>
                    {count !== undefined ? count : fmtCompact(Math.abs(v))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Bulk categorize trigger — shown when uncategorized txns exist */}
        {filteredTx.some((t) => !t.cat || t.cat === "Uncategorized") && bulkSel.size === 0 && (
          <button onClick={() => { const ids = new Set(filteredTx.filter((t) => !t.cat || t.cat === "Uncategorized").map((t) => t.id)); setBulkSel(ids); }} className="lg-btn"
            style={{ marginTop: 8, width: "100%", padding: "8px 14px", borderRadius: 10, background: `${T.accent}12`, border: `1px solid ${T.accent}28`, color: T.accent, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: T.body, display: "flex", alignItems: "center", gap: 7 }}>
            <Tag size={13} /> Bulk categorize {filteredTx.filter((t) => !t.cat || t.cat === "Uncategorized").length} uncategorized transactions
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {bulkSel.size > 0 && (
        <div style={{ position: "sticky", bottom: isDesktop ? 16 : 80, zIndex: 8, animation: "pop .2s ease" }}>
          <div style={{ background: T.ink, borderRadius: 14, padding: "12px 16px", boxShadow: T.shadowLg, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 600, color: T.bg }}>{bulkSel.size} selected</span>
            <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Food","Transport","Bills","Shopping","Subscriptions","Health","Entertainment","Other"].map((c) => {
                const col = catColor(c);
                return (
                  <button key={c} onClick={() => {
                    setPData({ transactions: pdata.transactions.map((t) => bulkSel.has(t.id) ? { ...t, cat: c } : t) });
                    setBulkSel(new Set()); setBulkCat(""); showToast(`✓ ${bulkSel.size} → ${c}`, 2000);
                  }} className="lg-btn" style={{ padding: "4px 10px", borderRadius: 99, background: `${col}cc`, color: "#fff", border: "none", fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: T.body }}>
                    {c}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setBulkSel(new Set())} className="lg-btn" style={{ background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8, padding: "5px 10px", color: T.bg, cursor: "pointer", fontSize: 12, fontFamily: T.body }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Transaction list grouped by date */}
      {filteredTx.length === 0 ? (
        q || activeChips.length > 0
          ? <Empty message="No matches" sub="Try different search terms or clear filters" />
          : <Empty message="No transactions yet" sub={<span>Tap <strong style={{ color: T.gold }}>+</strong> to log your first transaction — income, expense, or transfer</span>} />
      ) : (
        <div style={isDesktop ? { maxHeight: "calc(100vh - 260px)", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: `${T.line} transparent`, paddingRight: 4 } : {}}>
          {txGroups.map(([date, txns]) => (
            <div key={date} style={{ marginBottom: 8 }}>
              {/* Date header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", position: "sticky", top: isDesktop ? 0 : undefined, zIndex: 2, background: T.bg + "f8", backdropFilter: "blur(6px)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.sub }}>{dateLabel(date)}</span>
                <div style={{ flex: 1, height: 1, background: T.line }} />
                <span style={{ fontSize: 10.5, fontFamily: T.mono, color: T.faint }}>
                  {(() => { const d = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0); const i = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0); return d > 0 && i > 0 ? `+${fmtCompact(i)} −${fmtCompact(d)}` : i > 0 ? `+${fmtCompact(i)}` : d > 0 ? `−${fmtCompact(d)}` : ""; })()}
                </span>
              </div>
              {/* Transactions */}
              <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${T.line}` }}>
                {txns.map((t, idx) => {
                  const isTransfer = t.type === "transfer";
                  const inc = t.type === "income";
                  const col = isTransfer ? T.goldDeep : catColor(t.cat);
                  return (
                    <div key={t.id} onClick={() => bulkSel.size > 0 ? setBulkSel((s) => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; }) : setEditing({ kind: "txn", item: t })} className="lg-row"
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", cursor: "pointer", borderBottom: idx < txns.length - 1 ? `1px solid ${T.line}` : "none", background: bulkSel.has(t.id) ? `${T.accent}0c` : "transparent" }}>
                      {bulkSel.size > 0 && (
                        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${bulkSel.has(t.id) ? T.accent : T.line}`, background: bulkSel.has(t.id) ? T.accent : "transparent", display: "grid", placeItems: "center", flexShrink: 0, transition: "all .14s ease" }}>
                          {bulkSel.has(t.id) && <span style={{ fontSize: 11, color: "#fff", fontWeight: 800 }}>✓</span>}
                        </div>
                      )}
                      {/* Category color chip */}
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${col}18`, border: `1px solid ${col}28`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                        {isTransfer ? <ArrowLeftRight size={15} color={col} /> : <span style={{ fontSize: 11, fontWeight: 800, color: col, fontFamily: T.mono }}>{(t.cat || "?")[0]}</span>}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: T.ink }}>{t.note || t.cat}</span>
                          {t.recurring && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: `${T.gold}1c`, color: T.goldDeep, flexShrink: 0 }}>↻</span>}
                        </div>
                        <div style={{ fontSize: 11, color: T.faint, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          {isTransfer ? (
                            <><span style={{ padding: "1px 6px", borderRadius: 4, background: T.panel2, fontSize: 10, fontWeight: 600 }}>{t.acct}</span><span style={{ color: T.faint }}>→</span><span style={{ padding: "1px 6px", borderRadius: 4, background: T.panel2, fontSize: 10, fontWeight: 600 }}>{t.toAcct}</span></>
                          ) : (
                            <><span style={{ padding: "1px 6px", borderRadius: 4, background: `${col}14`, color: col, fontSize: 10, fontWeight: 600 }}>{t.cat}</span><span>·</span><span>{t.acct}</span></>
                          )}
                        </div>
                      </div>
                      {/* Amount */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: isTransfer ? T.goldDeep : inc ? T.greenDeep : T.ink }}>
                          {inc ? "+" : isTransfer ? "" : "−"}{fmtCompact(t.amount)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Subscription UI helpers
  const subColor = (name) => {
    const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#a855f7"];
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return colors[h % colors.length];
  };
  const cycleDays = (c) => c === "yearly" ? 365 : c === "weekly" ? 7 : 30;
  const subAnnual = (s) => s.cycle === "yearly" ? s.amount : s.cycle === "weekly" ? s.amount * 52 : s.amount * 12;
  const totalAnnual = filteredSubs.reduce((a, s) => a + subAnnual(s), 0);
  const nextSub = [...filteredSubs].sort((a, b) => a.next.localeCompare(b.next))[0];
  const nextDays = nextSub ? Math.ceil((new Date(nextSub.next + "T00:00:00") - new Date()) / 864e5) : null;

  const subsContent = (
    <div className="lg-pop">
      {!isDesktop && <Header title="Subscriptions" sub={`${fmtDisp(subTotal)}/mo`} />}

      {/* Summary bar */}
      {pdata.subscriptions.length > 0 && (
        <Card style={{ padding: "14px 18px", marginBottom: 14 }} className="lg-rise">
          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr 1fr 1fr" : "1fr 1fr", gap: isDesktop ? 0 : "8px 0" }}>
            {[
              { l: "Monthly", v: fmtCompact(subTotal), sub: "total" },
              { l: "Annual", v: fmtCompact(totalAnnual), sub: "projected", col: T.sub },
              { l: "Active", v: filteredSubs.length, sub: "subscriptions", col: T.sub },
              { l: "Next renewal", v: nextSub ? nextSub.merchant : "—", sub: nextDays !== null ? (nextDays <= 0 ? "today" : nextDays === 1 ? "tomorrow" : `in ${nextDays}d`) : "", col: nextDays !== null && nextDays <= 3 ? T.gold : T.sub },
            ].map(({ l, v, sub, col }, i) => {
              const col2 = isDesktop ? i > 0 : i % 2 !== 0;
              return (
              <div key={l} style={{ paddingLeft: col2 ? 16 : 0, borderLeft: col2 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 3 }}>{l}</div>
                <div style={{ fontFamily: T.display, fontSize: i < 2 ? 20 : 16, fontWeight: 800, letterSpacing: -0.4, color: col || T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
                {sub && <div style={{ fontSize: 10, color: T.faint, marginTop: 1 }}>{sub}</div>}
              </div>
            );})}
          </div>
        </Card>
      )}

      {/* Search bar */}
      <div style={{ marginBottom: 12 }}>
        <FilterBar q={q} setQ={setQ} onFilter={() => setShowFilter(true)} count={activeChips.length} chips={activeChips} onClearAll={resetFilters} onExport={exportView} placeholder="Search subscriptions…" />
      </div>

      {filteredSubs.length === 0 ? <Empty message="No subscriptions" sub="Add one with the + button" /> : (
        <div style={{ display: isDesktop ? "grid" : "flex", gridTemplateColumns: isDesktop ? "1fr 1fr" : undefined, flexDirection: isDesktop ? undefined : "column", gap: 10 }}>
          {filteredSubs.map((s) => {
            const days = Math.ceil((new Date(s.next + "T00:00:00") - new Date()) / 864e5);
            const cd = cycleDays(s.cycle);
            const progress = Math.max(0, Math.min(1, 1 - days / cd)); // 0=just renewed, 1=due now
            const urgent = days <= 0;
            const soon = days > 0 && days <= 3;
            const col = subColor(s.merchant);
            const urgencyCol = urgent ? T.red : soon ? T.gold : T.faint;
            const annualised = subAnnual(s);

            return (
              <Card key={s.id} onClick={() => setEditing({ kind: "sub", item: s })}
                style={{ padding: 0, cursor: "pointer", overflow: "hidden", border: (urgent || soon) ? `1px solid ${urgencyCol}40` : undefined }}
                className="lg-card-btn lg-rise">
                {/* Top: icon + name + amount */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 10px" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 13, background: `${col}1a`, border: `1.5px solid ${col}30`, display: "grid", placeItems: "center", flexShrink: 0, position: "relative" }}>
                    <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 17, color: col }}>{s.merchant[0]}</span>
                    {(urgent || soon) && (
                      <div style={{ position: "absolute", top: -3, right: -3, width: 10, height: 10, borderRadius: 10, background: urgencyCol, border: `2px solid ${T.panelSolid}`, boxShadow: `0 0 8px ${urgencyCol}` }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{s.merchant}</div>
                    <div style={{ fontSize: 11, color: T.faint, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ padding: "1px 6px", borderRadius: 5, background: T.panel2, fontSize: 10, fontWeight: 600, textTransform: "capitalize" }}>{s.cycle}</span>
                      <span>·</span>
                      <span>{s.acct}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 800, letterSpacing: -0.4, color: T.ink }}>{fmtCompact(s.amount)}</div>
                    {s.cycle !== "monthly" && <div style={{ fontSize: 9.5, color: T.faint, marginTop: 1 }}>{fmtCompact(Math.round(annualised / 12))}/mo</div>}
                  </div>
                </div>

                {/* Renewal countdown bar + date */}
                <div style={{ padding: "0 16px 13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: T.faint }}>Renews {new Date(s.next + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: urgencyCol }}>
                      {urgent ? "⚠ today" : soon ? `in ${days}d` : days === 0 ? "today" : `${days}d`}
                    </span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: T.line, overflow: "hidden" }}>
                    <div style={{ width: `${progress * 100}%`, height: "100%", background: urgent ? T.red : soon ? T.gold : col, borderRadius: 2, transition: "width .6s ease", opacity: 0.8 }} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const refreshPrices = async () => {
    setPriceLoading(true);
    const GECKO_IDS = {
      BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
      MATIC: "matic-network", ADA: "cardano", DOT: "polkadot", AVAX: "avalanche-2",
      LINK: "chainlink", UNI: "uniswap", XRP: "ripple", DOGE: "dogecoin",
      SHIB: "shiba-inu", LTC: "litecoin", ATOM: "cosmos", NEAR: "near",
      ARB: "arbitrum", OP: "optimism", SUI: "sui", TON: "the-open-network",
    };

    let updated = [...pdata.holdings];

    // 1. Crypto via CoinGecko
    const cryptoHoldings = pdata.holdings.filter((h) => GECKO_IDS[h.ticker]);
    if (cryptoHoldings.length > 0) {
      try {
        const ids = [...new Set(cryptoHoldings.map((h) => GECKO_IDS[h.ticker])), "usd-coin"].join(",");
        const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,idr`);
        const prices = await resp.json();
        if (prices["usd-coin"]?.idr) {
          const rate = Math.round(prices["usd-coin"].idr);
          if (rate > 10000) { const ts = Date.now(); setUsdIdr(rate); setRateTs(ts); localStorage.setItem("oreo:usdIdr:v2", JSON.stringify({ rate, ts })); }
        }
        updated = updated.map((h) => {
          const geckoId = GECKO_IDS[h.ticker];
          if (!geckoId || !prices[geckoId]) return h;
          const newPrice = h.ccy === "USD" ? prices[geckoId].usd : prices[geckoId].idr;
          return { ...h, price: +(newPrice).toFixed(h.ccy === "USD" ? 2 : 0) };
        });
      } catch {}
    }

    // 2. Stocks/ETFs/funds via TradingView
    const stockHoldings = pdata.holdings.filter((h) => !GECKO_IDS[h.ticker]);
    if (stockHoldings.length > 0) {
      try {
        // Resolve each ticker to a TradingView "EXCHANGE:TICKER" symbol.
        // IDR holdings → IDX (Jakarta Stock Exchange). USD holdings → look up via
        // TV symbol search and cache the result so we only fetch once per ticker.
        const tvCache = JSON.parse(localStorage.getItem("oreo:tvSymbols") || "{}");
        const symbolMap = {}; // holdingId → "EXCHANGE:TICKER"

        await Promise.allSettled(stockHoldings.map(async (h) => {
          if (h.ccy === "IDR") {
            symbolMap[h.id] = `IDX:${h.ticker}`;
            return;
          }
          if (tvCache[h.ticker]) {
            symbolMap[h.id] = tvCache[h.ticker];
            return;
          }
          // First time: ask TradingView symbol search for the right exchange
          const r = await fetch(
            `https://symbol-search.tradingview.com/symbol_search/v3/?text=${encodeURIComponent(h.ticker)}&exchange=&type=stock,etf,fund`
          );
          const hits = await r.json();
          const match = hits.find((x) => x.symbol === h.ticker.toUpperCase()) || hits[0];
          if (match?.full_name) {
            tvCache[h.ticker] = match.full_name;
            symbolMap[h.id] = match.full_name;
          }
        }));
        localStorage.setItem("oreo:tvSymbols", JSON.stringify(tvCache));

        const tickers = [...new Set(Object.values(symbolMap))].filter(Boolean);
        if (tickers.length > 0) {
          const resp = await fetch("https://scanner.tradingview.com/global/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbols: { tickers }, columns: ["close"] }),
          });
          const data = await resp.json();
          const priceBySymbol = {};
          (data.data || []).forEach((item) => { priceBySymbol[item.s] = item.d[0]; });
          updated = updated.map((h) => {
            const sym = symbolMap[h.id];
            const price = sym != null ? priceBySymbol[sym] : undefined;
            if (price == null) return h;
            return { ...h, price: +(price).toFixed(h.ccy === "USD" ? 2 : 0) };
          });
        }
      } catch {}
    }

    setPData({ holdings: updated });
    showToast("Prices updated ✓");
    setPriceLoading(false);
  };

  // Portfolio value over time — uses investment's own date range, not dashboard range
  const portfolioSeries = (() => {
    const buys = invTxns.filter((it) => it.type === "buy").sort((a, b) => a.date.localeCompare(b.date));
    if (!buys.length) return [];
    const unrealRatio = invCost > 0 ? invValue / invCost : 1;
    // Generate monthly points between invRangeBounds.from and invRangeBounds.to
    const points = [];
    const start = new Date(invRangeBounds.from + "T00:00:00");
    const end = new Date(invRangeBounds.to + "T00:00:00");
    const diffDays = (end - start) / 864e5;
    const step = diffDays <= 45 ? 1 : diffDays <= 120 ? 7 : diffDays <= 400 ? 30 : 90;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + step)) {
      const iso = d.toISOString().slice(0, 10);
      const deployed = buys.filter((it) => it.date <= iso).reduce((s, it) => {
        const h = pdata.holdings.find((x) => x.id === it.holdingId);
        const rate = h && h.ccy === "USD" ? USD_IDR : 1;
        return s + (it.qty * it.price + (it.fees || 0)) * rate;
      }, 0);
      points.push({ ms: d.getTime(), label: d.toLocaleString("en", { month: "short", day: "numeric" }), full: iso, value: Math.round(deployed * unrealRatio) });
    }
    // Always include the exact endpoint as today's value
    if (points.length && points[points.length - 1].full !== invRangeBounds.to) {
      const deployed = buys.reduce((s, it) => { const h = pdata.holdings.find((x) => x.id === it.holdingId); const rate = h && h.ccy === "USD" ? USD_IDR : 1; return s + (it.qty * it.price + (it.fees || 0)) * rate; }, 0);
      points.push({ ms: end.getTime(), label: "Now", full: invRangeBounds.to, value: Math.round(deployed * unrealRatio) });
    }
    return points;
  })();

  const investContent = (
    <div className="lg-pop">
      {pdata.holdings.length === 0 ? (
        <div style={{ textAlign: "center", padding: "52px 24px" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: `${T.gold}14`, border: `1px solid ${T.gold}28`, display: "grid", placeItems: "center", margin: "0 auto 18px", boxShadow: `0 0 24px ${T.gold}12` }}>
            <TrendingUp size={28} color={T.gold} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 8, fontFamily: T.display }}>No holdings yet</div>
          <div style={{ fontSize: 13.5, color: T.sub, maxWidth: 280, margin: "0 auto 20px", lineHeight: 1.6 }}>Track stocks, crypto, mutual funds and ETFs in one place. Add a holding to see performance charts and P&L.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
            {[["Stocks", "#3b82f6"], ["Crypto", "#f97316"], ["Mutual Funds", "#10b981"], ["ETF", "#8b5cf6"]].map(([t, c]) => (
              <span key={t} style={{ padding: "5px 14px", borderRadius: 99, background: `${c}14`, border: `1px solid ${c}30`, fontSize: 12, color: c, fontWeight: 600 }}>{t}</span>
            ))}
          </div>
          <button onClick={() => setModal("hold")} className="lg-btn"
            style={{ padding: "12px 28px", borderRadius: 12, background: T.accent, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: T.body, boxShadow: `0 4px 16px ${T.accent}50` }}>
            Add your first holding
          </button>
        </div>
      ) : (<>
      {/* Mobile: pull-to-refresh indicator */}
      {!isDesktop && (pullDist > 0 || priceLoading) && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 7, height: 36, marginBottom: 4, color: pullDist > 64 ? T.accent : T.faint, fontSize: 12, fontFamily: T.body, transition: "color .15s ease" }}>
          <RefreshCw size={14} style={{ animation: priceLoading ? "spin .8s linear infinite" : "none", transform: !priceLoading ? `rotate(${pullDist * 3}deg)` : undefined }} />
          {priceLoading ? "Updating prices…" : pullDist > 64 ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}

      {/* Mobile: range selector at the top */}
      {!isDesktop && (
        <div style={{ marginBottom: 14 }}>
          <ChartRangeBar range={invRange} setRange={setInvRange} from={invFrom} setFrom={setInvFrom} to={invTo} setTo={setInvTo} opts={RANGE_OPTS} isDesktop={false} />
        </div>
      )}

      {/* Mobile: portfolio chart */}
      {!isDesktop && portfolioSeries.length > 1 && (
        <Card style={{ padding: 18, marginBottom: 14 }} className="lg-rise">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <Label>Portfolio performance</Label>
            <span style={{ fontSize: 11, color: T.sub, fontFamily: T.mono }}>{invRangeBounds.label}</span>
          </div>
          <GrowthChart data={portfolioSeries} chartId="portfolio" />
        </Card>
      )}

      {/* Stats bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
        <Card style={{ padding: "10px 14px", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { l: "Market value", v: fmtCompact(invValue), sub: `Cost ${fmtCompact(invCost)}` },
              { l: "Unrealized", v: (invValue - invCost >= 0 ? "+" : "−") + fmtCompact(Math.abs(invValue - invCost)), col: invValue - invCost >= 0 ? T.greenDeep : T.red, sub: invCost > 0 ? `${(((invValue - invCost) / invCost) * 100).toFixed(1)}% on cost` : "—" },
              { l: "Realized", v: (totalRealized >= 0 ? "+" : "−") + fmtCompact(Math.abs(totalRealized)), col: totalRealized >= 0 ? T.greenDeep : T.red, sub: `${invTxns.filter((it) => it.type === "sell" || it.type === "dividend").length} closed` },
            ].map(({ l, v, col, sub }) => (
              <div key={l}>
                <div style={{ fontSize: 10.5, color: T.faint, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>{l}</div>
                <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 800, color: col || T.ink, letterSpacing: -0.4 }}>{v}</div>
                <div style={{ fontSize: 10.5, color: T.faint, marginTop: 2, fontFamily: T.mono }}>{sub}</div>
              </div>
            ))}
          </div>
        </Card>
        {isDesktop && (
          <button className="lg-btn" onClick={refreshPrices} disabled={priceLoading}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: T.panel2, border: `1px solid ${T.line}`, color: priceLoading ? T.faint : T.sub, borderRadius: 11, padding: "9px 12px", cursor: priceLoading ? "not-allowed" : "pointer", fontSize: 11, fontFamily: T.body, flexShrink: 0 }}>
            <RefreshCw size={14} style={priceLoading ? { animation: "spin .8s linear infinite" } : {}} />
            {priceLoading ? "…" : "Refresh"}
          </button>
        )}
      </div>

      {/* Desktop: portfolio chart */}
      {isDesktop && portfolioSeries.length > 1 && (
        <Card style={{ padding: 18, marginBottom: 14 }} className="lg-rise">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <Label>Portfolio performance</Label>
            <span style={{ fontSize: 11, color: T.sub, fontFamily: T.mono }}>{invRangeBounds.label}</span>
          </div>
          <GrowthChart data={portfolioSeries} chartId="portfolio" />
        </Card>
      )}

      {isDesktop ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
            <div style={{ position: "sticky", top: 0 }}>
              {allocSegments.length > 0 && (
                <Card style={{ padding: 16 }}>
                  <Label style={{ marginBottom: 12 }}>Allocation</Label>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <Donut segments={allocSegments} size={150} thickness={20} centerTop={fmtCompact(invValue)} centerBot={"total " + disp} />
                  </div>
                  {allocSegments.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 0", borderBottom: `1px solid ${T.line}` }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: T.faint }}>{s.platform}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11.5, fontFamily: T.mono }}>{fmtDisp(s.value)}</div>
                        <div style={{ fontSize: 10, color: T.sub }}>{((s.value / totalInvIDR) * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </div>
            <div>
              <div style={{ position: "sticky", top: 0, zIndex: 4, background: T.bg + "f2", backdropFilter: "blur(10px)", paddingBottom: 10 }}>
                <FilterBar q={q} setQ={setQ} onFilter={() => setShowFilter(true)} count={activeChips.length} chips={activeChips} onClearAll={resetFilters} onExport={exportView} placeholder="Search tickers…" />
              </div>
              <div style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: `${T.line} transparent`, paddingRight: 4 }}>
                {filteredHoldings.length === 0 && <Empty />}
                {["Stockbit","Bybit","Pluang","Bibit","Binance"].map((plat) => {
                  const hs = filteredHoldings.filter((h) => h.platform === plat);
                  if (!hs.length) return null;
                  return (
                    <div key={plat} style={{ marginBottom: 14 }}>
                      <Label style={{ marginBottom: 8 }}>{plat}</Label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {hs.map((h) => {
                          const val = h.qty * h.price, cost = h.qty * h.avg, pl = val - cost, plPct = cost > 0 ? (pl / cost) * 100 : 0, up = pl >= 0;
                          const rate = h.ccy === "USD" ? USD_IDR : 1; const realIDR = realizedByHolding[h.id] || 0;
                          return (
                            <Card key={h.id} onClick={() => setEditing({ kind: "holdDetail", item: h })} style={{ padding: 14, cursor: "pointer" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${up ? T.green : T.red}16`, display: "grid", placeItems: "center", color: up ? T.greenDeep : T.red, fontFamily: T.mono, fontWeight: 600, fontSize: 11 }}>{h.ticker.slice(0,3)}</div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: 13, fontFamily: T.display }}>{h.ticker}{realIDR !== 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 5px", marginLeft: 5, borderRadius: 4, background: realIDR > 0 ? `${T.green}1c` : `${T.red}1c`, color: realIDR > 0 ? T.greenDeep : T.red }}>R {realIDR > 0 ? "+" : "−"}{fmtCompact(Math.abs(realIDR))}</span>}</div>
                                    <div style={{ fontSize: 10, color: T.faint }}>{h.qty} @ {h.ccy === "USD" ? fmtUSD(h.avg) : fmtIDR(h.avg)}</div>
                                  </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div style={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 600 }}>{fmtDisp(val * rate)}</div>
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: 2, marginTop: 2, padding: "2px 6px", borderRadius: 6, background: `${up ? T.green : T.red}16`, color: up ? T.greenDeep : T.red, fontFamily: T.mono, fontSize: 10 }}>
                                    {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(plPct).toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {allocSegments.length > 0 && (
            <Card style={{ padding: 18, marginBottom: 16 }}>
              <Label>Allocation</Label>
              <div style={{ display: "flex", justifyContent: "center", marginTop: 16, marginBottom: 20 }}>
                <Donut segments={allocSegments} size={170} thickness={22} centerTop={fmtCompact(invValue)} centerBot={"total " + disp} />
              </div>
              {allocSegments.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.line}` }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0, boxShadow: `0 0 6px ${s.color}66` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 10.5, color: T.faint }}>{s.platform}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: T.mono, fontSize: 12.5 }}>{fmtDisp(s.value)}</div>
                    <div style={{ fontSize: 11, color: T.sub }}>{((s.value / totalInvIDR) * 100).toFixed(1)}%</div>
                  </div>
                </div>
              ))}
            </Card>
          )}
          <FilterBar q={q} setQ={setQ} onFilter={() => setShowFilter(true)} count={activeChips.length} chips={activeChips} onClearAll={resetFilters} onExport={exportView} placeholder="Search tickers…" />
          {filteredHoldings.length === 0 && <Empty />}
          {["Stockbit","Bybit","Pluang","Bibit","Binance"].map((plat) => {
            const hs = filteredHoldings.filter((h) => h.platform === plat);
            if (!hs.length) return null;
            return (
              <div key={plat} style={{ marginBottom: 16 }}>
                <Label style={{ marginBottom: 9 }}>{plat}</Label>
                {hs.map((h) => {
                  const val = h.qty * h.price, cost = h.qty * h.avg, pl = val - cost, plPct = cost > 0 ? (pl / cost) * 100 : 0, up = pl >= 0;
                  const rate = h.ccy === "USD" ? USD_IDR : 1; const realIDR = realizedByHolding[h.id] || 0;
                  const typeCol = h.type === "crypto" ? "#f97316" : h.type === "stock" ? "#3b82f6" : h.type === "etf" ? "#8b5cf6" : "#10b981";
                  return (
                    <Card key={h.id} onClick={() => setEditing({ kind: "holdDetail", item: h })} style={{ padding: 14, marginBottom: 9, cursor: "pointer" }} className="lg-card-btn">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${typeCol}18`, border: `1.5px solid ${typeCol}30`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 11, color: typeCol, letterSpacing: -0.5 }}>{h.ticker.slice(0,3)}</span>
                            <div style={{ width: 16, height: 2, borderRadius: 1, background: typeCol, marginTop: 2, opacity: 0.5 }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: T.display, display: "flex", alignItems: "center", gap: 6 }}>
                              {h.ticker}
                              <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 5px", borderRadius: 4, background: `${typeCol}18`, color: typeCol, textTransform: "uppercase" }}>{h.type || "equity"}</span>
                              {realIDR !== 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: realIDR > 0 ? `${T.green}1c` : `${T.red}1c`, color: realIDR > 0 ? T.greenDeep : T.red }}>R {realIDR > 0 ? "+" : "−"}{fmtCompact(Math.abs(realIDR))}</span>}
                            </div>
                            <div style={{ fontSize: 11, color: T.faint }}>{h.qty} @ {h.ccy === "USD" ? fmtUSD(h.avg) : fmtIDR(h.avg)}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700 }}>{fmtDisp(val * rate)}</div>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 3, marginTop: 3, padding: "2px 8px", borderRadius: 99, background: `${up ? T.green : T.red}16`, color: up ? T.greenDeep : T.red, fontFamily: T.mono, fontSize: 10.5, fontWeight: 600 }}>
                            {up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{Math.abs(plPct).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
      </>)}
    </div>
  );

  const settingsContent = (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: isDesktop ? "32px 40px" : "24px 18px", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Profile */}
      <div style={{ background: T.panelSolid, borderRadius: 16, border: `1px solid ${T.line}`, overflow: "hidden", boxShadow: T.shadow }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Profile</div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Manage your active workspace</div>
        </div>
        <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 14 }}>
          {user?.photoURL && profile?.type !== "business" ? (
            <img src={user.photoURL} alt="" style={{ width: 48, height: 48, borderRadius: 14, objectFit: "cover", flexShrink: 0, boxShadow: `0 4px 14px rgba(0,0,0,0.25)` }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: profile?.type === "business" ? "linear-gradient(135deg, #22c55e, #15a34a)" : `linear-gradient(135deg, ${T.goldDeep}, ${T.orange})`,
              display: "grid", placeItems: "center", boxShadow: `0 4px 14px ${T.gold}30` }}>
              {profile?.type === "business" ? <Building2 size={22} color="#fff" /> : <Wallet size={22} color="#fff" />}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingProfileName ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                const trimmed = profileNameDraft.trim();
                if (trimmed) {
                  setState((s) => ({ ...s, profiles: s.profiles.map((p) => p.id === s.active ? { ...p, name: trimmed } : p) }));
                  showToast("Profile name updated ✓", 2000);
                }
                setEditingProfileName(false);
              }} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input autoFocus value={profileNameDraft} onChange={(e) => setProfileNameDraft(e.target.value)}
                  style={{ flex: 1, background: T.panel2, border: `1px solid ${T.accent}`, borderRadius: 9, padding: "7px 12px", fontSize: 14, fontWeight: 600, color: T.ink, fontFamily: T.body, outline: "none" }} />
                <button type="submit" className="lg-btn" style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: T.body, flexShrink: 0 }}>Save</button>
                <button type="button" onClick={() => setEditingProfileName(false)} className="lg-btn" style={{ padding: "7px 10px", borderRadius: 9, border: `1px solid ${T.line}`, background: "transparent", color: T.sub, fontSize: 13, cursor: "pointer", fontFamily: T.body, flexShrink: 0 }}>Cancel</button>
              </form>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{profile?.name}</div>
                  <div style={{ fontSize: 12, color: T.faint, textTransform: "capitalize", marginTop: 1 }}>{profile?.type} workspace</div>
                </div>
                <button onClick={() => { setProfileNameDraft(profile?.name || ""); setEditingProfileName(true); }} className="lg-btn"
                  style={{ marginLeft: 4, padding: "4px 10px", borderRadius: 7, border: `1px solid ${T.line}`, background: "transparent", color: T.sub, fontSize: 12, cursor: "pointer", fontFamily: T.body, fontWeight: 500 }}>
                  Rename
                </button>
              </div>
            )}
          </div>
        </div>
        {state.profiles.length > 1 && (
          <div style={{ borderTop: `1px solid ${T.line}`, padding: "8px 8px" }}>
            <div style={{ padding: "4px 8px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: T.faint }}>Switch profile</div>
            {state.profiles.map((p) => {
              const active = p.id === state.active;
              return (
                <button key={p.id} onClick={() => { if (!active) { setState((s) => ({ ...s, active: p.id })); showToast(`Switched to ${p.name}`, 1600); } }} className="lg-btn"
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 10px", borderRadius: 10, border: "none", cursor: active ? "default" : "pointer",
                    background: active ? `${T.accent}12` : "transparent", textAlign: "left", marginBottom: 2 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "grid", placeItems: "center",
                    background: p.type === "business" ? "linear-gradient(135deg, #22c55e, #15a34a)" : active ? T.accent : `${T.accent}22`,
                    color: active ? "#fff" : T.accent }}>
                    {p.type === "business" ? <Building2 size={14} color="#fff" /> : <Wallet size={14} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? T.accent : T.ink }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: T.faint, textTransform: "capitalize" }}>{p.type} workspace</div>
                  </div>
                  {active && <div style={{ width: 8, height: 8, borderRadius: 99, background: T.accent, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Display */}
      <div style={{ background: T.panelSolid, borderRadius: 16, border: `1px solid ${T.line}`, overflow: "hidden", boxShadow: T.shadow }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Display</div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Appearance and formatting preferences</div>
        </div>
        <div style={{ padding: "8px 8px" }}>
          {[
            {
              label: "Currency", sub: "Switch between Rupiah and US Dollar display",
              right: (
                <button onClick={() => setDisp(disp === "IDR" ? "USD" : "IDR")} className="lg-btn"
                  style={{ display: "flex", gap: 0, borderRadius: 9, overflow: "hidden", border: `1px solid ${T.line}`, cursor: "pointer", background: "none", padding: 0, fontFamily: T.body }}>
                  {["IDR", "USD"].map((c) => (
                    <div key={c} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, background: disp === c ? T.accent : "transparent", color: disp === c ? "#fff" : T.sub, transition: "all .15s ease" }}>{c}</div>
                  ))}
                </button>
              ),
            },
            {
              label: "Theme", sub: "Choose light or dark interface",
              right: (
                <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="lg-btn"
                  style={{ display: "flex", gap: 0, borderRadius: 9, overflow: "hidden", border: `1px solid ${T.line}`, cursor: "pointer", background: "none", padding: 0, fontFamily: T.body }}>
                  {[["light", "Light", Sun], ["dark", "Dark", Moon]].map(([v, l, Icon]) => (
                    <div key={v} style={{ padding: "7px 16px", fontSize: 13, fontWeight: 600, background: theme === v ? T.accent : "transparent", color: theme === v ? "#fff" : T.sub, display: "flex", alignItems: "center", gap: 6, transition: "all .15s ease" }}>
                      <Icon size={13} strokeWidth={2} />{l}
                    </div>
                  ))}
                </button>
              ),
            },
            {
              label: "Privacy mode", sub: "Blur all amounts for screen sharing",
              right: (
                <button onClick={() => setPrivacy(!privacy)} className="lg-btn"
                  style={{ width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative", background: privacy ? T.accent : T.panel2, transition: "background .2s ease" }}>
                  <div style={{ position: "absolute", top: 3, left: privacy ? 21 : 3, width: 20, height: 20, borderRadius: 10, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", transition: "left .2s ease" }} />
                </button>
              ),
            },
          ].map(({ label, sub, right }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 10, gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{label}</div>
                <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{sub}</div>
              </div>
              {right}
            </div>
          ))}
        </div>
      </div>

      {/* Data management */}
      <div style={{ background: T.panelSolid, borderRadius: 16, border: `1px solid ${T.line}`, overflow: "hidden", boxShadow: T.shadow }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Data</div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Manage your accounts, categories, and import data</div>
        </div>
        <div style={{ padding: "8px 8px" }}>
          {[
            { label: "Manage accounts", sub: "Add, edit or remove your bank accounts and wallets", icon: Wallet, action: () => setShowAcctMgr(true) },
            { label: "Manage categories", sub: "Customise expense and income categories", icon: Tag, action: () => setShowCatMgr(true) },
            { label: "Import CSV", sub: "Bulk-import transactions from a spreadsheet or bank export", icon: Download, action: () => setShowCSVImport(true) },
          ].map(({ label, sub, icon: Icon, action }) => (
            <button key={label} onClick={action} className="lg-btn"
              style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.gold}14`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon size={17} strokeWidth={1.8} color={T.gold} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{label}</div>
                <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>{sub}</div>
              </div>
              <ChevronDown size={14} color={T.faint} style={{ transform: "rotate(-90deg)", flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      {/* Export */}
      <div style={{ background: T.panelSolid, borderRadius: 16, border: `1px solid ${T.line}`, overflow: "hidden", boxShadow: T.shadow }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Export</div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Download your data</div>
        </div>
        <div style={{ padding: "8px 8px" }}>
          <button onClick={() => setShowExport(true)} className="lg-btn"
            style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", textAlign: "left" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.greenDeep}18`, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Download size={17} strokeWidth={1.8} color={T.greenDeep} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>Export to Excel</div>
              <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Download all transactions, holdings, and history as .xlsx</div>
            </div>
            <ChevronDown size={14} color={T.faint} style={{ transform: "rotate(-90deg)", flexShrink: 0 }} />
          </button>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div style={{ background: T.panelSolid, borderRadius: 16, border: `1px solid ${T.line}`, overflow: "hidden", boxShadow: T.shadow }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Keyboard shortcuts</div>
        </div>
        <div style={{ padding: "8px 8px" }}>
          {[["⌘N", "Open Add modal"], ["/ ", "Focus AI Search"], ["⌘1", "Go to Overview"], ["⌘2", "Go to Activity"], ["⌘3", "Go to Subscriptions"], ["⌘4", "Go to Investments"], ["Esc", "Close modal / panel"]].map(([k, l]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10 }}>
              <span style={{ fontSize: 13, color: T.sub }}>{l}</span>
              <kbd style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontFamily: T.mono, color: T.ink, fontWeight: 600 }}>{k}</kbd>
            </div>
          ))}
        </div>
      </div>

      {/* Account / Sign out */}
      {hasFirebase && user && (
        <div style={{ background: T.panelSolid, borderRadius: 16, border: `1px solid ${T.line}`, overflow: "hidden", boxShadow: T.shadow }}>
          <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.line}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>Account</div>
            <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Signed in via Google — your data syncs across devices</div>
          </div>
          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
            {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName || user.email}</div>
              <div style={{ fontSize: 12, color: T.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
            <button onClick={() => { localStorage.removeItem(KEY); signOut(auth); }} className="lg-btn"
              style={{ padding: "7px 16px", borderRadius: 9, border: `1px solid ${T.line}`, background: "transparent", color: T.sub, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.body, flexShrink: 0 }}>
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Danger zone */}
      <div style={{ background: T.panelSolid, borderRadius: 16, border: `1px solid ${T.red}30`, overflow: "hidden", boxShadow: T.shadow }}>
        <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${T.red}20` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.red }}>Danger zone</div>
          <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Irreversible actions — proceed with care</div>
        </div>
        <div style={{ padding: "8px 8px" }}>
          {showResetConfirm ? (
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 14 }}>This will delete all transactions, holdings, subscriptions, goals, and budgets for the current profile. This cannot be undone.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowResetConfirm(false)} className="lg-btn"
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${T.line}`, background: "transparent", color: T.sub, cursor: "pointer", fontSize: 13, fontFamily: T.body, fontWeight: 500 }}>Cancel</button>
                <button onClick={() => {
                  setPData({ transactions: [], subscriptions: [], holdings: [], investmentTransactions: [], goals: [], budgets: [], history: [], accounts: pdata.accounts.map((a) => ({ ...a, opening: 0 })), categories: pdata.categories });
                  setState((s) => ({ ...s, firstRun: false }));
                  setShowResetConfirm(false);
                  showToast("✓ All data cleared");
                }} className="lg-btn"
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: T.red, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: T.body }}>Yes, reset everything</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowResetConfirm(true)} className="lg-btn"
              style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "12px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", textAlign: "left" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.red}14`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Trash2 size={17} strokeWidth={1.8} color={T.red} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: T.red }}>Reset all data</div>
                <div style={{ fontSize: 12, color: T.faint, marginTop: 2 }}>Wipe all transactions, holdings, goals, and budgets for this profile</div>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const tabContent = tab === "dash" ? (isDesktop ? dashDesktop : dashMobile) : tab === "txn" ? activityContent : tab === "sub" ? subsContent : tab === "inv" ? investContent : settingsContent;

  const onboardingBanner = null;
  const addBtn = (
    <button className="lg-btn" onClick={() => setModal(tab === "sub" ? "sub" : tab === "inv" ? "hold" : "txn")}
      style={{ display: "flex", alignItems: "center", gap: 7, background: T.accent, border: "none", borderRadius: 12, padding: "10px 16px", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: T.body, boxShadow: `0 4px 14px ${T.accent}45` }}>
      <Plus size={18} strokeWidth={2.6} /> Add
    </button>
  );
  const notifications = [
    ...pdata.subscriptions.map((s) => { const days = Math.round((new Date(s.next + "T00:00:00") - new Date()) / 864e5); return days >= 0 && days <= 7 ? { kind: "renewal", icon: <Clock size={14} />, col: T.gold, text: `${s.merchant} renews ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days}d`}`, sub: fmtCompact(s.amount), days } : null; }).filter(Boolean).sort((a, b) => a.days - b.days),
    ...budgetProgress.filter((b) => b.pct >= 0.85).map((b) => ({ kind: "budget", icon: <ShieldAlert size={14} />, col: b.pct >= 1 ? T.red : T.orange, text: `${b.cat} budget at ${(b.pct * 100).toFixed(0)}%`, sub: `${fmtCompact(b.spent)} of ${fmtCompact(b.monthly)}` })),
    ...goals.filter((g) => g.daysLeft !== null && g.daysLeft > 0 && g.daysLeft <= 30 && g.pct < 0.9).map((g) => ({ kind: "goal", icon: <Target size={14} />, col: T.goldDeep, text: `Goal "${g.name}" — ${(g.pct * 100).toFixed(0)}% done`, sub: `${g.daysLeft} days left` })),
  ];

  const bellEl = (
    <div style={{ position: "relative" }}>
      <button onClick={() => setShowBell((v) => !v)} className="lg-btn"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "grid", placeItems: "center", borderRadius: 9, color: T.sub }}>
        <Bell size={19} color={showBell ? T.goldDeep : T.sub} />
        {notifications.length > 0 && !showBell && (
          <div style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, borderRadius: 9, background: notifications.some((n) => n.kind === "budget" && n.col === T.red) ? T.red : T.orange, boxShadow: `0 0 8px currentColor`, border: `2px solid ${T.bg}` }} />
        )}
      </button>
      {showBell && (
        <div className="lg-pop" onClick={(e) => e.stopPropagation()} style={{ position: "fixed", top: 62, right: 16, width: 310, maxWidth: "calc(100vw - 24px)", background: T.panelSolid, border: `1px solid ${T.line}`, borderRadius: 16, boxShadow: T.shadowLg, zIndex: 50, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px 10px" }}>
            <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15 }}>Notifications</div>
            <button onClick={() => setShowBell(false)} className="lg-btn" style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, padding: 4 }}><X size={15} /></button>
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: T.faint, fontSize: 13 }}>All clear ✓</div>
          ) : notifications.map((n, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 16px", borderTop: `1px solid ${T.line}` }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${n.col}18`, display: "grid", placeItems: "center", color: n.col, flexShrink: 0 }}>{n.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{n.text}</div>
                <div style={{ fontSize: 11.5, color: T.faint, marginTop: 2, fontFamily: T.mono }}>{n.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  const themeToggle = (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="lg-btn" title="Toggle dark mode"
      style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 10, padding: 8, cursor: "pointer", color: T.sub, display: "grid", placeItems: "center" }}>
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
  const privacyToggle = (
    <button onClick={() => setPrivacy(!privacy)} className="lg-btn" title={privacy ? "Show amounts" : "Hide amounts (privacy mode)"}
      style={{ background: privacy ? `${T.accent}1c` : T.panel2, border: `1px solid ${privacy ? T.accent : T.line}`, borderRadius: 10, padding: 8, cursor: "pointer", color: privacy ? T.accent : T.sub, display: "grid", placeItems: "center" }}>
      {privacy ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <div style={{ background: theme === "dark"
        ? `radial-gradient(ellipse 70% 45% at 50% 0%, rgba(255,255,255,0.025) 0%, transparent 70%), ${T.bg}`
        : `radial-gradient(ellipse 70% 50% at 5% 0%, rgba(124,58,237,0.06) 0%, transparent 60%),
           radial-gradient(ellipse 50% 40% at 95% 100%, rgba(245,158,11,0.05) 0%, transparent 60%),
           ${T.bg}`,
      minHeight: "100dvh", fontFamily: T.body, color: T.ink, position: "relative", overflow: isDesktop ? "hidden" : "visible", maxWidth: "100vw" }}
      onClick={() => { setProfMenu(false); setShowBell(false); setShowSettings(false); setInvViewOpen(false); setChartViewOpen(false); }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Spline+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { background: ${T.bg}; max-width: 100vw; overflow-x: hidden; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        /* ── resets ── */
        *, *::before, *::after { box-sizing: border-box; }
        /* ── input text always uses theme ink ── */
        input, select, textarea { color: ${T.ink}; }
        input::placeholder, textarea::placeholder { color: ${T.faint}; opacity: 1; }
        select option { background: ${T.panelSolid}; color: ${T.ink}; }
        /* ── date picker icon color in dark mode ── */
        input[type="date"]::-webkit-calendar-picker-indicator { filter: ${T.mode === "dark" ? "invert(0.7) sepia(0.3) saturate(3) hue-rotate(240deg)" : "none"}; opacity: 0.7; cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.18); border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.32); }
        ::selection { background: rgba(168,85,247,0.22); color: inherit; }
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; box-sizing: border-box; }
        /* ── inputs ── */
        input, select, textarea { transition: border-color .15s ease, box-shadow .15s ease; }
        input:focus, select:focus, textarea:focus { outline: none; box-shadow: 0 0 0 3px rgba(168,85,247,0.16); border-color: rgba(168,85,247,0.55) !important; }
        input::placeholder, textarea::placeholder { color: ${T.faint}; opacity: 1; }
        /* ── interactive ── */
        .lg-tab   { transition: color .16s ease; }
        .lg-row   { transition: background .15s ease, box-shadow .2s ease; border-radius: 10px; }
        .lg-row:hover   { background: ${T.accent}0f; box-shadow: inset 0 0 0 1px ${T.accent}22; }
        .lg-btn   { transition: transform .12s ease, opacity .12s ease, filter .15s ease, box-shadow .18s ease; }
        .lg-btn:hover   { filter: brightness(1.08); box-shadow: 0 0 16px ${T.accent}38; }
        .lg-btn:active  { transform: scale(.93); opacity: .8; }
        .lg-nav   { transition: background .15s ease, color .15s ease, border-color .15s ease, box-shadow .2s ease; }
        .lg-nav:hover   { background: ${T.accent}12; box-shadow: inset 0 0 0 1px ${T.accent}28; }
        /* card — accent stroke + accent glow on hover */
        .lg-card-btn { transition: transform .22s cubic-bezier(.2,.85,.3,1), box-shadow .22s ease; cursor: pointer; }
        .lg-card-btn:hover  { transform: translateY(-4px);
          box-shadow: 0 0 0 1px ${T.accent}30,
                      0 0 20px ${T.accent}18,
                      0 0 60px ${T.accent}0a,
                      0 20px 56px rgba(0,0,0,0.35); }
        .lg-card-btn:active { transform: translateY(-1px) scale(.99); }
        /* pill/chip */
        .lg-chip { display:inline-flex; align-items:center; border-radius:99px; font-size:11px; font-weight:600; line-height:1; transition: all .15s ease; }
        /* ── animations ── */
        @keyframes rise     { from { opacity:0; transform:translateY(14px) scale(.99);  } to { opacity:1; transform:none; } }
        @keyframes pop      { from { opacity:0; transform:translateY(7px)  scale(.99);  } to { opacity:1; transform:none; } }
        @keyframes modalIn  { from { opacity:0; transform:scale(.97) translateY(-8px);  } to { opacity:1; transform:none; } }
        @keyframes sheetIn  { from { opacity:0; transform:translateY(24px) scale(.99);  } to { opacity:1; transform:none; } }
        @keyframes tabFade  { from { opacity:0; transform:translateY(5px);              } to { opacity:1; transform:none; } }
        @keyframes pulse    { 0%,100% { box-shadow:0 0 0 0 rgba(168,85,247,.35); } 70% { box-shadow:0 0 0 14px rgba(168,85,247,0); } }
        @keyframes drawLine { from { stroke-dashoffset:1; } to { stroke-dashoffset:0; } }
        @keyframes growBar  { from { transform:scaleY(0); transform-origin:bottom; } to { transform:scaleY(1); } }
        @keyframes growBarX { from { transform:scaleX(0); transform-origin:left; }  to { transform:scaleX(1); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
        @keyframes dotPop   { 0% { transform:scale(0); opacity:0; } 70% { transform:scale(1.35); } 100% { transform:scale(1); opacity:1; } }
        @keyframes spin     { from { transform:rotate(0deg); }   to { transform:rotate(360deg); } }
        @keyframes toastIn  { from { opacity:0; transform:translateX(-50%) translateY(18px) scale(.95); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }
        @keyframes toastOut { from { opacity:1; transform:translateX(-50%); } to { opacity:0; transform:translateX(-50%) translateY(10px); } }
        @keyframes shimmer  { from { background-position:-200% 0; } to { background-position:200% 0; } }
        [style*="scrollbarWidth: none"]::-webkit-scrollbar { display:none; }
        .lg-rise     { animation: rise    .36s cubic-bezier(.2,.7,.25,1) both; }
        .lg-pop      { animation: pop     .2s  cubic-bezier(.2,.7,.3,1)  both; }
        .lg-modal    { animation: modalIn .2s  cubic-bezier(.15,.9,.3,1) both; }
        .lg-sheet    { animation: sheetIn .22s cubic-bezier(.15,.9,.3,1) both; }
        .lg-tab-content { animation: tabFade .18s ease both; }
        .lg-toast    { animation: toastIn .28s cubic-bezier(.2,.9,.3,1) both; }
      `}</style>

      <div style={{ position: "absolute", top: -120, left: "30%", width: 460, height: 320, background: `radial-gradient(circle, ${T.gold}14, transparent 70%)`, pointerEvents: "none" }} />

      {isDesktop ? (
        /* ── DESKTOP: MONARCH-STYLE SIDEBAR LAYOUT ── */
        <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>

          {/* LEFT SIDEBAR */}
          <div style={{ width: 256, flexShrink: 0, background: T.panelSolid, display: "flex", flexDirection: "column", height: "100vh", borderRight: `1px solid ${T.line}`, position: "relative", zIndex: 2 }}>

            {/* Logo */}
            <div style={{ padding: "24px 20px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(145deg, ${T.orange}, #ec6a2e)`, display: "grid", placeItems: "center", boxShadow: `0 4px 12px ${T.orange}55`, flexShrink: 0 }}>
                <span style={{ fontFamily: T.display, fontWeight: 800, color: "#fff", fontSize: 17, lineHeight: 1 }}>O</span>
              </div>
              <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 21, letterSpacing: -0.5, color: T.ink }}>Oreo</span>
              <span style={{ marginLeft: "auto", background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 6, padding: "2px 7px", fontSize: 9.5, fontWeight: 700, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase" }}>BETA</span>
            </div>

            {/* Nav items */}
            <div style={{ padding: "4px 10px", flex: 1, overflowY: "auto" }}>
              {navItems.map((n) => {
                const on = tab === n.k; const Icon = n.icon;
                return (
                  <button key={n.k} onClick={() => setTab(n.k)} className="lg-nav lg-btn"
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 3,
                      background: on ? `${T.accent}14` : "transparent",
                      color: on ? T.accent : T.sub,
                      fontFamily: T.body, fontWeight: on ? 600 : 400, fontSize: 14, textAlign: "left", position: "relative" }}>
                    {on && <div style={{ position: "absolute", left: 0, top: "20%", height: "60%", width: 3, borderRadius: 2, background: T.accent, boxShadow: `0 0 8px ${T.accent}66` }} />}
                    <Icon size={18} strokeWidth={on ? 2.2 : 1.7} color={on ? T.accent : T.faint} />
                    <span>{n.l}</span>
                  </button>
                );
              })}

              {/* Divider + Quick stats */}
              <div style={{ margin: "16px 4px 12px", borderTop: `1px solid ${T.line}` }} />
              <div style={{ padding: "0 8px", marginBottom: 12 }}>
                <div style={{ fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700, color: T.faint, marginBottom: 12 }}>Portfolio</div>
                {PRIVATE ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 4px" }}>
                    <EyeOff size={12} color={T.faint} />
                    <span style={{ fontSize: 11.5, color: T.faint, fontStyle: "italic" }}>Amounts hidden</span>
                  </div>
                ) : (
                  <>
                    {[
                      { label: "Net worth", val: netWorth, col: T.ink },
                      { label: "Cash & accounts", val: totalAssets, col: T.sub },
                      { label: "Investments", val: invValue, col: T.sub },
                      { label: "Liabilities", val: -totalLiab, col: totalLiab > 0 ? T.red : T.faint },
                    ].map(({ label, val, col }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: T.faint, fontWeight: 500 }}>{label}</span>
                        <span style={{ fontSize: 12.5, fontFamily: T.mono, fontWeight: 600, color: col }}>{val < 0 ? "−" : ""}{fmtCompact(Math.abs(val))}</span>
                      </div>
                    ))}
                    {state.profiles.length > 1 && (() => {
                      const allNW = state.profiles.reduce((sum, prof) => {
                        const d = state.data[prof.id]; if (!d) return sum;
                        const assets = (d.accounts || []).filter((a) => a.kind !== "liability").reduce((s, a) => s + (a.opening || 0), 0);
                        const liabs = (d.accounts || []).filter((a) => a.kind === "liability").reduce((s, a) => s + (a.opening || 0), 0);
                        const inv = (d.holdings || []).reduce((s, h) => s + h.qty * h.price * (h.ccy === "USD" ? usdIdr : 1), 0);
                        return sum + assets + inv - liabs;
                      }, 0);
                      return (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontSize: 11, color: T.faint, fontWeight: 500 }}>All profiles</span>
                            <span style={{ fontSize: 12, fontFamily: T.mono, fontWeight: 600, color: T.sub }}>{fmtCompact(allNW)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
              {/* Live exchange rate indicator */}
              {!PRIVATE && (() => {
                const live = rateTs > 0;
                const updatedAt = live ? new Date(rateTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
                const forceRefresh = async () => {
                  try {
                    localStorage.removeItem("oreo:usdIdr:v2");
                    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=IDR");
                    const data = await res.json();
                    const rate = Math.round(data.rates.IDR);
                    if (rate > 10000) { const ts = Date.now(); setUsdIdr(rate); setRateTs(ts); localStorage.setItem("oreo:usdIdr:v2", JSON.stringify({ rate, ts })); }
                  } catch (_) {}
                };
                return (
                  <div style={{ padding: "4px 8px", marginTop: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: T.faint, letterSpacing: 0.3 }}>1 USD</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 10.5, fontFamily: T.mono, color: live ? T.sub : T.faint, letterSpacing: 0.2 }}>
                          = Rp {usdIdr.toLocaleString("id-ID")}
                        </span>
                        <button onClick={forceRefresh} className="lg-btn" title="Refresh rate"
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: T.faint, display: "grid", placeItems: "center", borderRadius: 4 }}>
                          <RefreshCw size={9} />
                        </button>
                      </div>
                    </div>
                    {updatedAt && (
                      <div style={{ fontSize: 9, color: T.faint, textAlign: "right", marginTop: 1, fontFamily: T.mono }}>
                        <span style={{ color: T.greenDeep }}>●</span> updated {updatedAt}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Profile + Settings at bottom */}
            <div style={{ borderTop: `1px solid ${T.line}`, padding: "10px 10px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, padding: "8px 12px", cursor: "pointer", borderRadius: 9 }}
                  onClick={() => setProfMenu((v) => !v)}>
                  {user?.photoURL && profile?.type !== "business" ? (
                    <img src={user.photoURL} alt="" style={{ width: 30, height: 30, borderRadius: 9, objectFit: "cover", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.2)" }} />
                  ) : (
                    <div style={{ width: 30, height: 30, borderRadius: 9,
                      background: profile?.type === "business" ? "linear-gradient(135deg, #22c55e, #15a34a)" : `linear-gradient(135deg, ${T.goldDeep}, ${T.orange})`,
                      display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {profile?.type === "business" ? <Building2 size={14} color="#fff" /> : <Wallet size={14} color="#fff" />}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.name || "Personal"}</div>
                    <div style={{ fontSize: 10.5, color: T.faint, textTransform: "capitalize" }}>{profile?.type || "personal"} workspace</div>
                  </div>
                </div>
                <button onClick={() => setTab("settings")} className="lg-btn"
                  style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${tab === "settings" ? T.accent : T.line}`, background: tab === "settings" ? `${T.accent}14` : "transparent", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, color: tab === "settings" ? T.accent : T.faint }}>
                  <Settings size={15} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: T.bg }}>

            {/* Slim top bar — page title + (dashboard: range selector) + actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px 12px", flexShrink: 0, background: `${T.panelSolid}d8`, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${T.line}50`, zIndex: 10 }}>
              <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 800, letterSpacing: -0.6, color: T.ink, flexShrink: 0 }}>
                {tab === "settings" ? "Settings" : navItems.find((n) => n.k === tab)?.l}
              </div>
              {tab === "dash" && (
                <div style={{ flex: 1, maxWidth: 520 }}>
                  <ChartRangeBar range={chartRange} setRange={setChartRange} from={chartFrom} setFrom={setChartFrom} to={chartTo} setTo={setChartTo} opts={RANGE_OPTS} isDesktop={true} centered />
                </div>
              )}
              {tab === "inv" && (
                <div style={{ flex: 1, maxWidth: 520 }}>
                  <ChartRangeBar range={invRange} setRange={setInvRange} from={invFrom} setFrom={setInvFrom} to={invTo} setTo={setInvTo} opts={RANGE_OPTS} isDesktop={true} centered />
                </div>
              )}
              {tab === "dash" && (
                <div style={{ fontSize: 11, color: T.faint, fontFamily: T.mono, flexShrink: 0, whiteSpace: "nowrap" }}>
                  {rangeText} · <span style={{ color: T.sub }}>{statTx.filter((t) => t.type !== "transfer").length} txns</span>
                </div>
              )}
              {tab === "inv" && (
                <div style={{ fontSize: 11, color: T.faint, fontFamily: T.mono, flexShrink: 0, whiteSpace: "nowrap" }}>
                  {invRangeBounds.label}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto", flexShrink: 0 }}>
                {bellEl}
                {tab !== "settings" && addBtn}
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 24px 40px" }}>
              {onboardingBanner}
              <div key={tab} className="lg-tab-content">
                {tabContent}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* MOBILE TOP BAR */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", position: "relative", zIndex: 5 }}>
            {logo}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {privacyToggle}
              {themeToggle}
              {bellEl}
              <button onClick={() => setTab("settings")} className="lg-btn"
                style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${tab === "settings" ? T.accent : T.line}`, background: tab === "settings" ? `${T.accent}14` : T.panelSolid, cursor: "pointer", display: "grid", placeItems: "center", color: tab === "settings" ? T.accent : T.sub }}>
                <Settings size={16} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          {/* MOBILE CONTENT */}
          <div style={{ padding: "8px 18px 96px", position: "relative", zIndex: 1, minHeight: 460 }}
            onTouchStart={(e) => { pullStartY.current = e.touches[0].clientY; }}
            onTouchMove={(e) => {
              if (tab !== "inv" || priceLoading) return;
              if (window.scrollY > 8) return;
              const delta = e.touches[0].clientY - pullStartY.current;
              if (delta > 0) setPullDist(Math.min(delta * 0.55, 96));
            }}
            onTouchEnd={() => {
              if (pullDist > 64 && !priceLoading) refreshPrices();
              setPullDist(0);
            }}>
            {tabContent}
          </div>

          {/* FAB */}
          {tab !== "settings" && (
            <button className="lg-btn" onClick={() => setModal(tab === "sub" ? "sub" : tab === "inv" ? "hold" : "txn")}
              style={{ position: "fixed", bottom: 80, right: 18, width: 54, height: 54, borderRadius: 17, background: T.accent, border: "none", cursor: "pointer", display: "grid", placeItems: "center", zIndex: 8, animation: "pulse 2.6s 3", boxShadow: `0 6px 20px ${T.accent}55` }}>
              <Plus size={24} color="#fff" strokeWidth={2.6} />
            </button>
          )}

          {/* BOTTOM NAV */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", borderTop: `1px solid ${T.line}`, background: T.navBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", zIndex: 6, boxShadow: "0 -4px 24px rgba(17,24,39,0.08)" }}>
            {navItems.map((n) => {
              const on = tab === n.k; const Icon = n.icon;
              const labels = { dash: "Home", txn: "Activity", sub: "Subs", inv: "Invest" };
              return (
                <button key={n.k} className="lg-tab" onClick={() => setTab(n.k)}
                  style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "10px 0 13px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}>
                  <div style={{ width: 40, height: 28, borderRadius: 10, display: "grid", placeItems: "center", position: "relative",
                    background: on ? `${T.accent}1a` : "transparent", transition: "background .18s ease" }}>
                    <Icon size={19} strokeWidth={on ? 2.4 : 1.9} color={on ? T.accent : T.faint} />
                    {n.k === "dash" && notifications.length > 0 && (
                      <div style={{ position: "absolute", top: 3, right: 6, width: 6, height: 6, borderRadius: 9,
                        background: notifications.some((x) => x.kind === "budget" && x.col === T.red) ? T.red : T.orange,
                        border: `1.5px solid ${T.bg}`, animation: "dotPop .3s ease" }} />
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, color: on ? T.accent : T.faint, letterSpacing: 0.1, transition: "color .18s ease" }}>{labels[n.k]}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {(modal || editing) && (
        <AddModal
          kind={editing ? editing.kind : modal}
          accounts={pdata.accounts}
          initial={editing ? editing.item : null}
          isDesktop={isDesktop}
          invTxns={invTxns}
          realizedByHolding={realizedByHolding}
          transactions={pdata.transactions}
          categories={pdata.categories || []}
          onOpenTrade={(holding) => setEditing({ kind: "trade", item: holding })}
          onClose={() => { setModal(null); setEditing(null); }}
          onDelete={editing ? () => {
            const { kind, item } = editing;
            if (kind === "txn") setPData({ transactions: pdata.transactions.filter((x) => x.id !== item.id) });
            else if (kind === "sub") setPData({ subscriptions: pdata.subscriptions.filter((x) => x.id !== item.id) });
            else if (kind === "goal") setPData({ goals: (pdata.goals || []).filter((x) => x.id !== item.id) });
            else if (kind === "budget") setPData({ budgets: (pdata.budgets || []).filter((x) => x.id !== item.id) });
            else if (kind === "invTxn") {
              // Delete a trade and reverse its effect on the holding
              const trades = (pdata.investmentTransactions || []).filter((x) => x.id !== item.id);
              const h = pdata.holdings.find((x) => x.id === item.holdingId);
              if (h && item.type === "buy") {
                const newQty = Math.max(0, h.qty - item.qty);
                const newAvg = newQty > 0 ? ((h.qty * h.avg) - (item.qty * item.price) - item.fees) / newQty : h.avg;
                setPData({ investmentTransactions: trades, holdings: pdata.holdings.map((x) => x.id === h.id ? { ...x, qty: newQty, avg: Math.max(0, newAvg) } : x) });
              } else {
                setPData({ investmentTransactions: trades });
              }
              setEditing(null); showToast("Trade deleted ✓"); return;
            }
            setUndoStack({ kind, item });
            setEditing(null);
            showToast("Deleted ✓ · Undo", 5000);
            setTimeout(() => { setToast(""); setUndoStack(null); }, 5000); // undo
          } : null}
          onSave={(item) => {
            if (editing && editing.kind === "trade") {
              // Log a new trade and update the holding
              const h = pdata.holdings.find((x) => x.id === editing.item.id);
              if (!h) { setEditing(null); return; }
              const trade = { ...item, id: "it" + Date.now(), holdingId: h.id };
              let updatedH = { ...h };
              if (trade.type === "buy") {
                const newQty = h.qty + trade.qty;
                const newAvg = (h.qty * h.avg + trade.qty * trade.price + (trade.fees || 0)) / newQty;
                updatedH = { ...h, qty: +newQty.toFixed(8), avg: +newAvg.toFixed(2) };
              } else if (trade.type === "sell") {
                const realized = trade.qty * (trade.price - h.avg) - (trade.fees || 0);
                trade.realized = +realized.toFixed(2);
                updatedH = { ...h, qty: +Math.max(0, h.qty - trade.qty).toFixed(8) };
              } else if (trade.type === "dividend") {
                trade.realized = +(trade.price || 0);
                trade.qty = 0;
              }
              setPData({
                investmentTransactions: [...(pdata.investmentTransactions || []), trade],
                holdings: pdata.holdings.map((x) => x.id === h.id ? updatedH : x),
              });
              setEditing({ kind: "holdDetail", item: updatedH });
              showToast("Trade logged ✓");
              return;
            }
            if (editing && editing.kind !== "trade" && editing.kind !== "holdDetail") {
              const merged = { ...editing.item, ...item };
              if (editing.kind === "txn") {
                if (editing.editSeries && editing.item.recurring) {
                  // Update this entry AND all future instances that match the old signature
                  const today = todayISO();
                  const oldSig = `${editing.item.type}|${editing.item.cat}|${editing.item.amount}|${editing.item.acct}`;
                  const updatedTxns = pdata.transactions.map((x) => {
                    if (x.id === editing.item.id) return merged;
                    const xSig = `${x.type}|${x.cat}|${x.amount}|${x.acct}`;
                    if (x.recurring && x.date > today && xSig === oldSig) {
                      return { ...x, type: merged.type, cat: merged.cat, amount: merged.amount, acct: merged.acct, note: merged.note, recurring: merged.recurring };
                    }
                    return x;
                  });
                  const futureCount = updatedTxns.filter((x, i) => x !== pdata.transactions[i] && x.id !== editing.item.id).length;
                  setPData({ transactions: updatedTxns });
                  showToast(`Series updated ✓${futureCount > 0 ? ` · ${futureCount} future entries` : ""}`);
                } else {
                  setPData({ transactions: pdata.transactions.map((x) => x.id === editing.item.id ? merged : x) });
                  setToast("Saved ✓");
                }
              }
              else if (editing.kind === "sub") setPData({ subscriptions: pdata.subscriptions.map((x) => x.id === editing.item.id ? merged : x) });
              else if (editing.kind === "goal") setPData({ goals: (pdata.goals || []).map((x) => x.id === editing.item.id ? merged : x) });
              else if (editing.kind === "budget") setPData({ budgets: (pdata.budgets || []).map((x) => x.id === editing.item.id ? merged : x) });
              if (editing.kind !== "txn") showToast("Saved ✓");
              setEditing(null);
              setTimeout(() => setToast(""), 2000);
            } else {
              if (modal === "txn") setPData({ transactions: [{ ...item, id: "t" + Date.now() }, ...pdata.transactions] });
              if (modal === "sub") setPData({ subscriptions: [...pdata.subscriptions, { ...item, id: "s" + Date.now() }] });
              if (modal === "hold") {
                const existing = pdata.holdings.find(
                  (h) => h.ticker.toUpperCase() === item.ticker.toUpperCase() && h.platform === item.platform
                );
                if (existing) {
                  const newQty = existing.qty + item.qty;
                  const newAvg = (existing.qty * existing.avg + item.qty * item.avg) / newQty;
                  setPData({ holdings: pdata.holdings.map((h) => h.id === existing.id ? { ...h, qty: +newQty.toFixed(8), avg: +newAvg.toFixed(2), price: item.price } : h) });
                  showToast(`Merged into existing ${item.ticker} position`);
                } else {
                  setPData({ holdings: [...pdata.holdings, { ...item, id: "h" + Date.now() }] });
                }
              }
              if (modal === "goal") setPData({ goals: [...(pdata.goals || []), { ...item, id: "g" + Date.now() }] });
              if (modal === "budget") setPData({ budgets: [...(pdata.budgets || []), { ...item, id: item.id || "b" + Date.now() }] });
              setModal(null);
            }
          }}
        />
      )}

      {showFilter && <FilterSheet tab={tab} f={f} setF={setF} cats={allCats} accts={allAccts} onClose={() => setShowFilter(false)} onReset={resetFilters} />}
      {showAcctMgr && (
        <AccountManager accounts={pdata.accounts} onClose={() => setShowAcctMgr(false)}
          onSave={(accounts) => { setPData({ accounts }); showToast("Accounts saved ✓", 2000); }} />
      )}
      {showCatMgr && (
        <CategoryManager cats={pdata.categories} onClose={() => setShowCatMgr(false)} onSave={(newCats) => setPData({ categories: newCats })} />
      )}
      {showCSVImport && (
        <CSVImport accounts={pdata.accounts} categories={pdata.categories} onClose={() => setShowCSVImport(false)}
          onImport={(txns) => { setPData({ transactions: [...txns, ...pdata.transactions] }); showToast(`✓ Imported ${txns.length} transactions`, 3000); setShowCSVImport(false); }} />
      )}
      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          pdata={pdata}
          profile={profile}
          accountBalances={accountBalances}
          invValue={invValue}
          invCost={invCost}
          totalRealized={totalRealized}
          subTotal={subTotal}
          netWorth={netWorth}
          USD_IDR={USD_IDR}
          T={T}
        />
      )}

      {toast && (
        <div className="lg-toast" style={{ position: "fixed", bottom: isDesktop ? 28 : 88, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: T.ink, color: T.bg, padding: "11px 18px 11px 14px", borderRadius: 99, fontFamily: T.body, fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 10, boxShadow: T.shadowLg, whiteSpace: "nowrap", backdropFilter: "blur(12px)", border: `1px solid rgba(255,255,255,0.1)`, letterSpacing: 0.1 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: `${T.gold}2a`, display: "grid", placeItems: "center", flexShrink: 0 }}><Sparkles size={13} color={T.gold2} /></div>
          <span>{toast.replace(" · Undo", "")}</span>
          {undoStack && toast.includes("Undo") && (
            <button onClick={() => {
              const { kind, item } = undoStack;
              if (kind === "txn") setPData({ transactions: [item, ...pdata.transactions] });
              else if (kind === "sub") setPData({ subscriptions: [item, ...pdata.subscriptions] });
              else if (kind === "goal") setPData({ goals: [item, ...(pdata.goals || [])] });
              setUndoStack(null);
              showToast("Restored ✓", 1800);
            }} className="lg-btn" style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: T.body, marginLeft: 4 }}>Undo</button>
          )}
        </div>
      )}
    </div>
  );
}
