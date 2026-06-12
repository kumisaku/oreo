import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  LayoutDashboard, ArrowLeftRight, RefreshCw, TrendingUp, Plus,
  ChevronDown, Wallet, Building2, X, ArrowUpRight, ArrowDownRight,
  Calendar, Bell, Check, Sparkles, Search, SlidersHorizontal, Download,
  Sun, Moon, Eye, EyeOff, Target, Tag, Settings,
  AlertTriangle, Clock, Zap, Info, Inbox, TrendingDown, ShieldAlert, BarChart3, Trash2
} from "lucide-react";

/* ============================ THEME ============================ */
const lightTheme = {
  bg: "#eaecef",
  panelA: "#ffffff", panelB: "#ffffff", panelSolid: "#ffffff",
  panel2: "#f1f3f6",
  line: "rgba(17,24,39,0.07)", lineSolid: "#e6e8ec",
  ink: "#14161c", sub: "#6b7280", faint: "#9aa1ad",
  gold: "#2f6bff", gold2: "#6ea0ff", goldDeep: "#1c4fd6",
  green: "#22c55e", greenDeep: "#15a34a", red: "#f43f6e", pink: "#ec4899", orange: "#f59345",
  shadow: "0 1px 3px rgba(17,24,39,0.06), 0 16px 32px -18px rgba(17,24,39,0.16)",
  shadowMd: "0 4px 16px rgba(17,24,39,0.1), 0 1px 4px rgba(17,24,39,0.06)",
  shadowLg: "0 20px 60px rgba(17,24,39,0.18), 0 4px 16px rgba(17,24,39,0.08)",
  navBg: "rgba(255,255,255,0.92)",
  // Sidebar — always dark navy
  sidebar: "#10172a", sidebarDeep: "#0c1220",
  sidebarLine: "rgba(255,255,255,0.07)", sidebarText: "rgba(255,255,255,0.52)", sidebarTextActive: "#ffffff",
  display: "'Bricolage Grotesque', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  body: "'Spline Sans', -apple-system, system-ui, sans-serif",
};
const darkTheme = {
  bg: "#0d0f14",
  panelA: "#13161e", panelB: "#13161e", panelSolid: "#13161e",
  panel2: "#1d2028",
  line: "rgba(255,255,255,0.07)", lineSolid: "#262b35",
  ink: "#f0f4fb", sub: "#8fa0bc", faint: "#52607a",
  gold: "#5b8cff", gold2: "#86a9ff", goldDeep: "#4070ee",
  green: "#34d27b", greenDeep: "#2fc475", red: "#fb6b8e", pink: "#f472b6", orange: "#f8a55a",
  shadow: "0 1px 3px rgba(0,0,0,0.5), 0 20px 40px -24px rgba(0,0,0,0.8)",
  shadowMd: "0 4px 16px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)",
  shadowLg: "0 24px 64px rgba(0,0,0,0.55), 0 6px 20px rgba(0,0,0,0.25)",
  navBg: "rgba(13,15,20,0.92)",
  sidebar: "#0b1020", sidebarDeep: "#070c18",
  sidebarLine: "rgba(255,255,255,0.06)", sidebarText: "rgba(255,255,255,0.42)", sidebarTextActive: "#ffffff",
  display: "'Bricolage Grotesque', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  body: "'Spline Sans', -apple-system, system-ui, sans-serif",
};
let T = lightTheme;
const PALETTE = ["#2f6bff", "#22c55e", "#ec4899", "#f59345", "#8b5cf6", "#06b6d4"];
const GRAIN = "none";
// Category color — deterministic hash → 12-color palette
const catColor = (cat) => {
  const p = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#a855f7","#06b6d4","#84cc16"];
  let h = 0; for (let i = 0; i < (cat || "").length; i++) h = (h * 31 + cat.charCodeAt(i)) & 0xffff;
  return p[h % p.length];
};

const fmtIDR = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
const fmtUSD = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
let USD_IDR = 16250; // reassigned each render from live rate state

let DISPLAY = "IDR";
let PRIVATE = false;
const fmtDisp = (idr) => PRIVATE ? "••••••" : (DISPLAY === "USD" ? fmtUSD(idr / USD_IDR) : fmtIDR(idr));
const fmtDispBare = (idr) => PRIVATE ? "••••" : (DISPLAY === "USD" ? fmtUSD(idr / USD_IDR).replace("$", "") : fmtIDR(idr).replace("Rp ", ""));
const fmtCompact = (idr) => {
  if (PRIVATE) return DISPLAY === "USD" ? "$••" : "Rp ••";
  if (DISPLAY === "USD") { const v = idr / USD_IDR; return "$" + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "K" : v.toFixed(0)); }
  return "Rp " + (Math.abs(idr) >= 1e6 ? (idr / 1e6).toFixed(1) + "M" : Math.abs(idr) >= 1e3 ? Math.round(idr / 1e3) + "K" : "" + Math.round(idr));
};

/* ============================ SEED ============================ */
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysFromNow = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
const daysAgo = (d) => daysFromNow(-d);

function seed() {
  return {
    profiles: [
      { id: "p1", name: "Personal", type: "personal", icon: "wallet" },
      { id: "p2", name: "Business", type: "business", icon: "building" },
    ],
    active: "p1",
    firstRun: true,
    data: {
      p1: {
        accounts: [
          { id: "a1", name: "BCA Tahapan", provider: "BCA", kind: "asset", opening: 12500000 },
          { id: "a2", name: "Jenius", provider: "Jenius", kind: "asset", opening: 4200000 },
          { id: "a3", name: "GoPay", provider: "GoPay", kind: "asset", opening: 850000 },
          { id: "a4", name: "Cash Wallet", provider: "Cash", kind: "asset", opening: 350000 },
          { id: "a5", name: "Bibit", provider: "Bibit", kind: "asset", opening: 0 },
          { id: "a6", name: "Pluang", provider: "Pluang", kind: "asset", opening: 0 },
          { id: "a7", name: "Binance", provider: "Binance", kind: "asset", opening: 0 },
          { id: "a8", name: "BCA Credit Card", provider: "BCA", kind: "liability", opening: 3850000 },
          { id: "a9", name: "ShopeePay Later", provider: "Shopee", kind: "liability", opening: 0 },
        ],
        budgets: [
          { id: "b1", cat: "Food", monthly: 3000000 },
          { id: "b2", cat: "Transport", monthly: 800000 },
          { id: "b3", cat: "Shopping", monthly: 2000000 },
          { id: "b4", cat: "Bills", monthly: 2500000 },
          { id: "b5", cat: "Entertainment", monthly: 600000 },
        ],
        goals: [
          { id: "g1", name: "Emergency fund", target: 100000000, deadline: "2026-12-31", kind: "save", linkedAccounts: ["Bibit"] },
          { id: "g2", name: "Apartment down payment", target: 250000000, deadline: "2027-06-30", kind: "save", linkedAccounts: ["Pluang", "Bibit"] },
          { id: "g3", name: "Pay off credit card", target: 3850000, deadline: "2026-08-31", kind: "debt", linkedAccounts: ["BCA Credit Card"] },
        ],
        categories: [
          { name: "Food", type: "expense" }, { name: "Transport", type: "expense" }, { name: "Bills", type: "expense" },
          { name: "Shopping", type: "expense" }, { name: "Subscriptions", type: "expense" }, { name: "Health", type: "expense" },
          { name: "Entertainment", type: "expense" }, { name: "Freelance", type: "income" }, { name: "Salary", type: "income" },
          { name: "AdSense", type: "income" }, { name: "Investment", type: "income" }, { name: "Gift", type: "income" }, { name: "Refund", type: "income" },
        ],
        transactions: [
          { id: "t1", type: "income", amount: 12000000, cat: "Freelance", acct: "BCA Tahapan", note: "Client project payment", date: daysAgo(2) },
          { id: "t2", type: "expense", amount: 285000, cat: "Food", acct: "GoPay", note: "GoFood dinner", date: daysAgo(1) },
          { id: "t3", type: "expense", amount: 1500000, cat: "Bills", acct: "BCA Tahapan", note: "Apartment rent share", date: daysAgo(3), recurring: "monthly" },
          { id: "t4", type: "expense", amount: 54990, cat: "Subscriptions", acct: "Jenius", note: "Spotify Premium", date: daysAgo(5) },
          { id: "t5", type: "income", amount: 3200000, cat: "AdSense", acct: "BCA Tahapan", note: "Ad revenue payout", date: daysAgo(8), recurring: "monthly" },
          { id: "t6", type: "expense", amount: 175000, cat: "Transport", acct: "GoPay", note: "Grab rides", date: daysAgo(6) },
          { id: "t7", type: "transfer", amount: 2000000, cat: "Transfer", acct: "BCA Tahapan", toAcct: "Jenius", note: "Top up Jenius", date: daysAgo(4) },
          { id: "t8", type: "expense", amount: 420000, cat: "Food", acct: "BCA Tahapan", note: "Groceries Superindo", date: daysAgo(7) },
          { id: "t9", type: "expense", amount: 95000, cat: "Food", acct: "GoPay", note: "Lunch", date: daysAgo(9) },
        ],
        subscriptions: [
          { id: "s1", merchant: "Spotify", amount: 54990, cycle: "monthly", next: daysFromNow(2), acct: "Jenius" },
          { id: "s2", merchant: "Netflix", amount: 186000, cycle: "monthly", next: daysFromNow(11), acct: "BCA Tahapan" },
          { id: "s3", merchant: "ChatGPT Plus", amount: 325000, cycle: "monthly", next: daysFromNow(18), acct: "Jenius" },
        ],
        holdings: [
          { id: "h1", platform: "Stockbit", ticker: "BBCA", type: "stock",       qty: 100,  avg: 9500,   price: 10200,  ccy: "IDR" },
          { id: "h2", platform: "Stockbit", ticker: "BREN", type: "stock",       qty: 200,  avg: 8900,   price: 7400,   ccy: "IDR" },
          { id: "h3", platform: "Bybit",    ticker: "BTC",  type: "crypto",      qty: 0.05, avg: 42000,  price: 95000,  ccy: "USD" },
          { id: "h4", platform: "Bybit",    ticker: "ETH",  type: "crypto",      qty: 1.2,  avg: 2800,   price: 3400,   ccy: "USD" },
          { id: "h5", platform: "Pluang",   ticker: "AAPL", type: "stock",       qty: 0.5,  avg: 155,    price: 210,    ccy: "USD" },
          { id: "h6", platform: "Pluang",   ticker: "GOLD", type: "gold",        qty: 3,    avg: 820000, price: 930000, ccy: "IDR" },
          { id: "h7", platform: "Bibit",    ticker: "RDPU", type: "mutual_fund", qty: 1500, avg: 1840,   price: 1968,   ccy: "IDR" },
          { id: "h8", platform: "Bibit",    ticker: "RDSH", type: "mutual_fund", qty: 800,  avg: 2150,   price: 2480,   ccy: "IDR" },
          { id: "h9", platform: "Binance",  ticker: "BNB",  type: "crypto",      qty: 0.8,  avg: 280,    price: 605,    ccy: "USD" },
          { id: "h10",platform: "Binance",  ticker: "SOL",  type: "crypto",      qty: 5,    avg: 25,     price: 165,    ccy: "USD" },
        ],
        investmentTransactions: [
          { id: "it1",  holdingId: "h1", type: "buy",      qty: 50,   price: 9300,  fees: 5000, date: daysAgo(180), note: "Initial position" },
          { id: "it2",  holdingId: "h1", type: "buy",      qty: 50,   price: 9700,  fees: 5000, date: daysAgo(60),  note: "Added on dip" },
          { id: "it3",  holdingId: "h2", type: "buy",      qty: 220,  price: 8900,  fees: 8000, date: daysAgo(150), note: "Initial position" },
          { id: "it4",  holdingId: "h2", type: "sell",     qty: 20,   price: 9500,  fees: 3000, date: daysAgo(40),  note: "Partial profit-take", realized: 9000 },
          { id: "it5",  holdingId: "h3", type: "buy",      qty: 0.05, price: 42000, fees: 0,    date: daysAgo(120), note: "DCA buy" },
          { id: "it6",  holdingId: "h4", type: "buy",      qty: 1.2,  price: 2800,  fees: 0,    date: daysAgo(100), note: "DCA buy" },
          { id: "it7",  holdingId: "h7", type: "buy",      qty: 1500, price: 1840,  fees: 0,    date: daysAgo(200), note: "Lump sum" },
          { id: "it8",  holdingId: "h7", type: "dividend", qty: 0,    price: 0,     fees: 0,    date: daysAgo(20),  note: "Distribution", realized: 35000 },
          { id: "it9",  holdingId: "h8", type: "buy",      qty: 800,  price: 2150,  fees: 0,    date: daysAgo(150), note: "Initial buy" },
          { id: "it10", holdingId: "h10",type: "buy",      qty: 5,    price: 25,    fees: 0,    date: daysAgo(220), note: "Early position" },
        ],
        history: [
          { m: "Jun", date: "2025-06-01", income: 8400000, expense: 5200000 },
          { m: "Jul", date: "2025-07-01", income: 7800000, expense: 6800000 },
          { m: "Aug", date: "2025-08-01", income: 11500000, expense: 7300000 },
          { m: "Sep", date: "2025-09-01", income: 9200000, expense: 5900000 },
          { m: "Oct", date: "2025-10-01", income: 13100000, expense: 8600000 },
          { m: "Nov", date: "2025-11-01", income: 8600000, expense: 4700000 },
          { m: "Dec", date: "2025-12-01", income: 9800000, expense: 6200000 },
          { m: "Jan", date: "2026-01-01", income: 11200000, expense: 7100000 },
          { m: "Feb", date: "2026-02-01", income: 8600000, expense: 5400000 },
          { m: "Mar", date: "2026-03-01", income: 14500000, expense: 8900000 },
          { m: "Apr", date: "2026-04-01", income: 10300000, expense: 6800000 },
          { m: "May", date: "2026-05-01", income: 15200000, expense: 2014990 },
        ],
      },
      p2: {
        accounts: [
          { id: "b1", name: "BCA Bisnis", provider: "BCA", kind: "asset", opening: 48000000 },
          { id: "b2", name: "BCA Savings", provider: "BCA", kind: "asset", opening: 22000000 },
          { id: "b3", name: "Kas Kecil", provider: "Cash", kind: "asset", opening: 2000000 },
          { id: "b4", name: "Kartu Kredit Bisnis", provider: "BCA", kind: "liability", opening: 8500000 },
        ],
        budgets: [
          { id: "bb1", cat: "Software", monthly: 5000000 },
          { id: "bb2", cat: "Marketing", monthly: 10000000 },
          { id: "bb3", cat: "Travel", monthly: 8000000 },
          { id: "bb4", cat: "Office", monthly: 3000000 },
        ],
        goals: [
          { id: "bg1", name: "Rainy day fund", target: 300000000, deadline: "2027-01-01", kind: "save", linkedAccounts: ["BCA Savings"] },
          { id: "bg2", name: "Pay off card", target: 8500000, deadline: "2026-09-30", kind: "debt", linkedAccounts: ["Kartu Kredit Bisnis"] },
        ],
        categories: [
          { name: "Revenue", type: "income" }, { name: "Client Payment", type: "income" },
          { name: "Grant", type: "income" }, { name: "Interest", type: "income" },
          { name: "Software", type: "expense" }, { name: "Marketing", type: "expense" },
          { name: "Travel", type: "expense" }, { name: "Salary", type: "expense" },
          { name: "Office", type: "expense" }, { name: "Taxes", type: "expense" },
          { name: "Equipment", type: "expense" }, { name: "Meals", type: "expense" },
        ],
        subscriptions: [
          { id: "bs1", merchant: "Vercel Pro",    amount: 240000,   cycle: "monthly", next: daysFromNow(12), acct: "Kartu Kredit Bisnis" },
          { id: "bs2", merchant: "Figma",         amount: 480000,   cycle: "monthly", next: daysFromNow(4),  acct: "Kartu Kredit Bisnis" },
          { id: "bs3", merchant: "Notion Team",   amount: 320000,   cycle: "monthly", next: daysFromNow(19), acct: "Kartu Kredit Bisnis" },
          { id: "bs4", merchant: "AWS",           amount: 2100000,  cycle: "monthly", next: daysFromNow(2),  acct: "BCA Bisnis" },
          { id: "bs5", merchant: "Slack",         amount: 410000,   cycle: "monthly", next: daysFromNow(27), acct: "Kartu Kredit Bisnis" },
          { id: "bs6", merchant: "GitHub Team",   amount: 550000,   cycle: "monthly", next: daysFromNow(14), acct: "Kartu Kredit Bisnis" },
        ],
        holdings: [],
        investmentTransactions: [],
        transactions: [
          { id: "bt1", type: "income",  amount: 45000000, cat: "Client Payment", acct: "BCA Bisnis",          note: "PT Maju Jaya — invoice #22", date: daysAgo(4) },
          { id: "bt2", type: "income",  amount: 28000000, cat: "Client Payment", acct: "BCA Bisnis",          note: "CV Kreasi — monthly retainer", date: daysAgo(8) },
          { id: "bt3", type: "expense", amount: 18500000, cat: "Salary",          acct: "BCA Bisnis",          note: "Payroll May — Ahmad",          date: daysAgo(3) },
          { id: "bt4", type: "expense", amount: 18500000, cat: "Salary",          acct: "BCA Bisnis",          note: "Payroll May — Desi",           date: daysAgo(3) },
          { id: "bt5", type: "expense", amount: 4200000,  cat: "Marketing",       acct: "Kartu Kredit Bisnis", note: "Google Ads May",               date: daysAgo(6) },
          { id: "bt6", type: "expense", amount: 2100000,  cat: "Software",        acct: "BCA Bisnis",          note: "AWS compute",                  date: daysAgo(2) },
          { id: "bt7", type: "expense", amount: 1850000,  cat: "Travel",          acct: "Kartu Kredit Bisnis", note: "Flight JKT–SBY client visit",  date: daysAgo(10) },
          { id: "bt8", type: "income",  amount: 12000000, cat: "Revenue",         acct: "BCA Bisnis",          note: "SaaS subscriptions May",       date: daysAgo(1) },
          { id: "bt9", type: "expense", amount: 3200000,  cat: "Office",          acct: "BCA Bisnis",          note: "Co-working May",               date: daysAgo(5) },
          { id: "bt10",type: "expense", amount: 890000,   cat: "Meals",           acct: "Kartu Kredit Bisnis", note: "Client lunch meeting",         date: daysAgo(9) },
        ],
        history: [
          { m: "Jan", date: "2026-01-01", income: 72000000, expense: 48000000 },
          { m: "Feb", date: "2026-02-01", income: 68000000, expense: 52000000 },
          { m: "Mar", date: "2026-03-01", income: 95000000, expense: 61000000 },
          { m: "Apr", date: "2026-04-01", income: 81000000, expense: 55000000 },
          { m: "May", date: "2026-05-01", income: 85000000, expense: 49040000 },
        ],
      },
    },
  };
}

/* ============================ PROVIDER COLORS ============================ */
const PROVIDER_COLORS = {
  BCA: "#1a6fff", Jenius: "#00c2d9", GoPay: "#00aed6", DANA: "#118eea",
  OVO: "#4c3494", Cash: "#f59345", Bibit: "#ff6b35", Pluang: "#3b6ef0",
  Binance: "#f3ba2f", Bybit: "#f7a600", Stockbit: "#e8463a", Shopee: "#ee4d2d",
};
const providerColor = (name) => PROVIDER_COLORS[name] || "#6b7280";

/* ============================ STORAGE ============================ */
const KEY = "oreo:state:v9";
async function loadState() {
  try { const r = await window.storage.get(KEY); if (r && r.value) return JSON.parse(r.value); } catch (e) {}
  const s = seed();
  try { await window.storage.set(KEY, JSON.stringify(s)); } catch (e) {}
  return s;
}
async function saveState(s) { try { await window.storage.set(KEY, JSON.stringify(s)); } catch (e) {} }

/* ============================ PRIMITIVES ============================ */
const Money = ({ v, sign = false, color }) => {
  const txt = fmtDisp(Math.abs(v));
  const pre = sign ? (v >= 0 ? "+" : "−") : v < 0 ? "−" : "";
  return <span style={{ fontFamily: T.mono, color: color || T.ink, fontVariantNumeric: "tabular-nums" }}>{pre}{txt}</span>;
};

function CcyToggle({ disp, setDisp }) {
  return (
    <div style={{ display: "flex", background: T.panel2, borderRadius: 9, padding: 3, gap: 2, border: `1px solid ${T.line}` }}>
      {["IDR", "USD"].map((c) => (
        <button key={c} onClick={() => setDisp(c)} className="lg-btn"
          style={{ padding: "4px 11px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: T.mono, fontSize: 11, fontWeight: 600, background: disp === c ? `linear-gradient(145deg, ${T.gold2}, ${T.gold})` : "transparent", color: disp === c ? "#ffffff" : T.sub }}>
          {c}
        </button>
      ))}
    </div>
  );
}

function Card({ children, style, glow, onClick }) {
  return (
    <div onClick={onClick} className={onClick ? "lg-card-btn" : undefined} style={{
      background: T.panelSolid,
      border: `1px solid ${glow ? `${glow}35` : T.line}`,
      borderRadius: 18,
      boxShadow: glow
        ? `${T.shadowMd}, 0 0 0 1px ${glow}20, 0 0 28px ${glow}14`
        : T.shadow,
      cursor: onClick ? "pointer" : undefined,
      ...style,
    }}>{children}</div>
  );
}

function Label({ children, style }) {
  return <div style={{ fontFamily: T.body, color: T.faint, fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 600, ...style }}>{children}</div>;
}

function Empty({ icon, message = "Nothing here", sub = "Try adjusting your filters" }) {
  const Icon = icon || Inbox;
  return (
    <div style={{ textAlign: "center", padding: "52px 24px 44px", color: T.faint, fontFamily: T.body, userSelect: "none" }}>
      <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 18px" }}>
        {/* concentric rings */}
        {[72, 52].map((size, i) => (
          <div key={i} style={{ position: "absolute", inset: `${(72 - size) / 2}px`, borderRadius: "50%", border: `1px solid ${T.line}`, opacity: 0.6 - i * 0.2 }} />
        ))}
        <div style={{ position: "absolute", inset: 10, borderRadius: "50%", background: T.panel2, display: "grid", placeItems: "center" }}>
          <Icon size={22} strokeWidth={1.5} color={T.faint} />
        </div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: T.sub, marginBottom: 6 }}>{message}</div>
      <div style={{ fontSize: 12.5, color: T.faint, lineHeight: 1.5, maxWidth: 220, margin: "0 auto" }}>{sub}</div>
    </div>
  );
}

// Compact "show more / show less" toggle for right-panel sections
function ShowMoreBar({ total, limit, shown, onToggle }) {
  if (total <= limit) return null;
  const hidden = total - limit;
  return (
    <button onClick={onToggle} className="lg-btn"
      style={{ width: "100%", marginTop: 6, padding: "5px 0", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.faint, fontFamily: T.body, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
      {shown ? <><ChevronDown size={11} style={{ transform: "rotate(180deg)" }} /> Show less</> : <><ChevronDown size={11} /> +{hidden} more</>}
    </button>
  );
}

function MobileSection({ sectionKey, label, icon, children, alwaysShow, collapsed, onToggle }) {
  if (!children && !alwaysShow) return null;
  return (
    <Card style={{ padding: 0, overflow: "hidden", marginBottom: 14 }} className="lg-rise">
      <button onClick={() => onToggle(sectionKey)} className="lg-btn"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "13px 16px", background: "none", border: "none", cursor: "pointer", borderBottom: collapsed ? "none" : `1px solid ${T.line}`, textAlign: "left" }}>
        {icon}
        <span style={{ flex: 1, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", fontWeight: 700, color: T.faint, fontFamily: T.body }}>{label}</span>
        <ChevronDown size={14} color={T.faint} style={{ transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform .2s ease", flexShrink: 0 }} />
      </button>
      {!collapsed && <div style={{ padding: 16, animation: "pop .18s ease" }}>{children}</div>}
    </Card>
  );
}

/* ============================ CHARTS ============================ */
function Sparkline({ points, w = 96, h = 30, color = T.gold }) {
  if (!points || points.length < 2) return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} />;
  const max = Math.max(...points), min = Math.min(...points);
  const rng = max - min || 1;
  const step = w / (points.length - 1);
  const pts = points.map((p, i) => [i * step, h - ((p - min) / rng) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = d + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" style={{ animation: "fadeIn 1s ease both" }} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "drawLine 1s cubic-bezier(.4,0,.2,1) forwards" }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} style={{ transformBox: "fill-box", transformOrigin: "center", animation: "dotPop .4s ease .9s both" }} />
    </svg>
  );
}

function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function GrowthChart({ data, invested = [], chartId = "main" }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const W = 340, H = 188, padT = 28, padL = 20, padR = 58, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const hasInvested = invested.length > 0 && invested.some((d) => d.value > 0);

  if (!data || data.length === 0) {
    return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <text x={(W - padR) / 2} y={H / 2 - 8} textAnchor="middle" fill={T.faint} style={{ fontFamily: T.body, fontSize: 13 }}>No data yet</text>
      <text x={(W - padR) / 2} y={H / 2 + 10} textAnchor="middle" fill={T.faint} style={{ fontFamily: T.body, fontSize: 10 }}>Add transactions to see trends</text>
    </svg>;
  }
  if (data.length < 3) {
    const lastVal = data[data.length - 1]?.value || 0;
    const dispVal = PRIVATE ? (DISPLAY === "USD" ? "$••" : "Rp ••") : fmtCompact(lastVal);
    return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <circle cx={(W - padR) / 2} cy={H / 2 - 18} r="24" fill={`${T.gold}14`} />
      <text x={(W - padR) / 2} y={H / 2 - 13} textAnchor="middle" fill={T.gold} style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 14 }}>{dispVal}</text>
      <text x={(W - padR) / 2} y={H / 2 + 8} textAnchor="middle" fill={T.faint} style={{ fontFamily: T.body, fontSize: 10 }}>Not enough history for a trend line</text>
    </svg>;
  }

  // Y scale: encompass both series
  const allVals = [...data.map((d) => d.value), ...(hasInvested ? invested.map((d) => d.value) : [])];
  const dataMin = Math.min(...allVals), dataMax = Math.max(...allVals);
  const rough = Math.max((dataMax - dataMin) / 3, Math.abs(dataMax) * 0.05, 1);
  const exp = Math.floor(Math.log10(rough));
  const base = Math.pow(10, exp);
  const step = [1, 2, 5, 10].map((s) => s * base).find((s) => s >= rough) || base;
  const yMin = Math.max(0, Math.floor(dataMin / step) * step);
  const yMax = Math.ceil(dataMax / step) * step;
  const ticks = []; for (let v = yMin; v <= yMax + step * 0.001; v += step) ticks.push(Math.round(v));

  const fmtAxis = (v) => {
    if (PRIVATE) return "••";
    const val = DISPLAY === "USD" ? v / USD_IDR : v;
    const pfx = DISPLAY === "USD" ? "$" : "Rp ";
    if (val === 0) return pfx + "0";
    if (Math.abs(val) >= 1e9) return pfx + (val / 1e9).toFixed(1) + "B";
    if (Math.abs(val) >= 1e6) return pfx + (val / 1e6).toFixed(1) + "M";
    if (Math.abs(val) >= 1000) return pfx + (val / 1e3).toFixed(1) + "K";
    return pfx + Math.round(val);
  };

  const range = yMax - yMin || 1;
  const denom = Math.max(1, data.length - 1);
  const x = (i) => padL + (i / denom) * plotW;
  const yv = (v) => padT + plotH - ((v - yMin) / range) * plotH;
  const pts = data.map((d, i) => [x(i), yv(d.value)]);
  const iPts = hasInvested ? invested.map((d, i) => [x(i), yv(d.value)]) : [];

  const lineD = data.length === 1
    ? `M ${x(0)} ${pts[0][1]} L ${padL + plotW} ${pts[0][1]}`
    : pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const areaD = lineD + ` L ${pts[pts.length - 1][0].toFixed(1)} ${yv(yMin).toFixed(1)} L ${pts[0][0].toFixed(1)} ${yv(yMin).toFixed(1)} Z`;
  const invD = hasInvested && iPts.length > 1
    ? iPts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") : "";

  const last = pts[pts.length - 1];
  const nLab = Math.min(data.length, 6);
  const showIdx = new Set();
  for (let j = 0; j < nLab; j++) showIdx.add(Math.round((j * (data.length - 1)) / Math.max(1, nLab - 1)));

  const pick = (clientX) => {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let nearest = 0, best = Infinity;
    for (let i = 0; i < data.length; i++) { const dd = Math.abs(x(i) - px); if (dd < best) { best = dd; nearest = i; } }
    setHover(nearest);
  };

  const INVESTED_COLOR = "#8b5cf6"; // purple

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
      onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)}
      onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)} onTouchEnd={() => setHover(null)}>
      <defs>
        <linearGradient id={`gGrow_${chartId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.gold} stopOpacity="0.32" />
          <stop offset="85%" stopColor={T.gold} stopOpacity="0.04" />
          <stop offset="100%" stopColor={T.gold} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`gGrowLine_${chartId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={T.goldDeep} /><stop offset="100%" stopColor={T.gold2} />
        </linearGradient>
      </defs>

      {/* Mini legend top-left */}
      {hasInvested && (<>
        <circle cx={padL + 6} cy={padT - 14} r="3.5" fill={T.gold} />
        <text x={padL + 13} y={padT - 10} fill={T.sub} fontSize="8" fontFamily={T.mono}>Net worth</text>
        <circle cx={padL + 68} cy={padT - 14} r="3.5" fill={INVESTED_COLOR} opacity="0.75" />
        <text x={padL + 75} y={padT - 10} fill={T.sub} fontSize="8" fontFamily={T.mono}>Invested capital</text>
      </>)}

      {/* Y-axis gridlines */}
      {ticks.map((v, i) => {
        const yy = yv(v);
        if (yy < padT - 2 || yy > padT + plotH + 2) return null;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke={T.line} strokeWidth={1} strokeDasharray="2 4" />
            <line x1={W - padR} x2={W - padR + 4} y1={yy} y2={yy} stroke={T.faint} strokeWidth={1} />
            <text x={W - padR + 11} y={yy + 3.5} textAnchor="start" fill={T.sub} fontSize="7" fontFamily={T.mono}>{fmtAxis(v)}</text>
          </g>
        );
      })}

      {/* Invested capital line (behind net worth) */}
      {invD && <>
        <path d={invD} fill="none" stroke={INVESTED_COLOR} strokeWidth="1.5" strokeDasharray="5 3"
          opacity="0.6" pathLength="1" style={{ strokeDasharray: "5 3", animation: "drawLine 1.4s cubic-bezier(.4,0,.2,1) .1s forwards" }} />
      </>}

      {/* Net worth area + line */}
      <path d={areaD} fill={`url(#gGrow_${chartId})`} style={{ animation: "fadeIn 1.1s ease both" }} />
      <path d={lineD} fill="none" stroke={`url(#gGrowLine_${chartId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "drawLine 1.2s cubic-bezier(.4,0,.2,1) forwards" }} />

      {/* End dot */}
      <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: "dotPop .5s cubic-bezier(.2,.8,.3,1) 1s both" }}>
        <circle cx={last[0]} cy={last[1]} r="5" fill={T.gold} opacity="0.22" />
        <circle cx={last[0]} cy={last[1]} r="2.5" fill={T.gold2} />
      </g>

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (!showIdx.has(i)) return null;
        return <text key={i} x={x(i)} y={padT + plotH + 16} textAnchor="middle" fill={T.sub}
          style={{ fontFamily: T.mono, fontSize: 8 }}>{d.label}</text>;
      })}

      {/* Hover crosshair + dual tooltip */}
      {hover !== null && data[hover] && (() => {
        const hx = x(hover), hy = yv(data[hover].value);
        const iVal = hasInvested && invested[hover] ? invested[hover].value : null;
        const dateLabel = data[hover].full || data[hover].label;
        const nwLabel = fmtAxis(data[hover].value);
        const invLabel = iVal !== null ? fmtAxis(iVal) : null;
        const tipW = Math.max(72, dateLabel.length * 4.5 + 16, nwLabel.length * 6 + 20);
        const tipH = iVal !== null ? 44 : 30;
        let tipX = hx - tipW / 2;
        tipX = Math.max(padL, Math.min(tipX, W - padR - tipW));
        const tipY = Math.max(padT, hy - tipH - 10);
        return (
          <g style={{ pointerEvents: "none" }}>
            <line x1={hx} x2={hx} y1={padT} y2={padT + plotH} stroke={T.faint} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
            <circle cx={hx} cy={hy} r="5.5" fill={T.gold} opacity={0.2} />
            <circle cx={hx} cy={hy} r="3.5" fill={T.gold} stroke={T.panelSolid} strokeWidth="1.5" />
            {iVal !== null && (() => { const iy = yv(iVal); return <><circle cx={hx} cy={iy} r="3" fill={INVESTED_COLOR} stroke={T.panelSolid} strokeWidth="1.5" opacity="0.8" /></>; })()}
            <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={6} fill={T.panelSolid} stroke={T.lineSolid} strokeWidth={1} style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.18))" }} />
            <text x={tipX + tipW / 2} y={tipY + 11} textAnchor="middle" fill={T.faint} fontSize="7.5" fontFamily={T.mono}>{dateLabel}</text>
            <circle cx={tipX + 10} cy={tipY + 22} r="2.5" fill={T.gold} />
            <text x={tipX + 15} y={tipY + 25} fill={T.ink} fontSize="9.5" fontWeight="700" fontFamily={T.mono}>{nwLabel}</text>
            {invLabel && <>
              <circle cx={tipX + 10} cy={tipY + 36} r="2.5" fill={INVESTED_COLOR} opacity="0.8" />
              <text x={tipX + 15} y={tipY + 39} fill={T.sub} fontSize="9" fontFamily={T.mono}>{invLabel}</text>
            </>}
          </g>
        );
      })()}
    </svg>
  );
}

function CashFlowChart({ data }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const W = 320, H = 156, padTop = 16;
  const padX = 16;
  const padBot = 28;

  if (!data || data.length === 0) {
    return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <text x={W / 2} y={H / 2} textAnchor="middle" fill={T.faint} style={{ fontFamily: T.body, fontSize: 12 }}>No transactions in this range</text>
    </svg>;
  }

  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  const plotH = H - padTop - padBot;
  const groupW = (W - padX * 2) / data.length;
  const bw = Math.max(3, Math.min(9, Math.floor(groupW * 0.34)));
  const gap = data.length > 8 ? 2 : 3;
  const y = (v) => padTop + plotH - (v / max) * plotH;
  const gx = (i) => padX + groupW * i + groupW / 2;

  const nLab = Math.min(data.length, 6);
  const showIdx = new Set();
  for (let j = 0; j < nLab; j++) showIdx.add(Math.round((j * (data.length - 1)) / Math.max(1, nLab - 1)));

  const pick = (clientX) => {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let n = 0, best = Infinity;
    for (let i = 0; i < data.length; i++) { const dd = Math.abs(gx(i) - px); if (dd < best) { best = dd; n = i; } }
    setHover(n);
  };

  const fmt = (v) => fmtCompact(v);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
      onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)}
      onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)} onTouchEnd={() => setHover(null)}>
      <defs>
        <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" /><stop offset="100%" stopColor={T.greenDeep} />
        </linearGradient>
        <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f9a8c4" /><stop offset="100%" stopColor={T.red} />
        </linearGradient>
        <pattern id="hatchIn" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="url(#gIn)" /><line x1="0" y1="0" x2="0" y2="5" stroke="#ffffff" strokeWidth="1.6" opacity="0.45" />
        </pattern>
        <pattern id="hatchOut" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="url(#gOut)" /><line x1="0" y1="0" x2="0" y2="5" stroke="#ffffff" strokeWidth="1.6" opacity="0.5" />
        </pattern>
      </defs>
      {[0.5, 1].map((g, i) => {
        const yy = padTop + plotH - g * plotH;
        return (
          <g key={i}>
            <line x1={padX} x2={W - padX} y1={yy} y2={yy} stroke={T.line} strokeWidth={1} strokeDasharray="2 4" />
            {g === 1 && <text x={padX} y={yy - 3} textAnchor="start" fill={T.faint} fontSize="7" fontFamily={T.mono}>{fmt(max)}</text>}
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = gx(i);
        const lbl = d.label || d.m;
        const dim = hover !== null && hover !== i ? 0.35 : 1;
        return (
          <g key={i} style={{ opacity: dim, transition: "opacity .12s ease" }}>
            <rect x={cx - bw - gap / 2} y={y(d.income)} width={bw} height={padTop + plotH - y(d.income)} rx={2} fill="url(#hatchIn)"
              style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `growBar .55s cubic-bezier(.2,.8,.3,1) ${i * 0.05}s both` }} />
            <rect x={cx + gap / 2} y={y(d.expense)} width={bw} height={padTop + plotH - y(d.expense)} rx={2} fill="url(#hatchOut)"
              style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `growBar .55s cubic-bezier(.2,.8,.3,1) ${i * 0.05 + 0.03}s both` }} />
            {showIdx.has(i) && hover === null && (
              <text x={cx} y={H - 9} textAnchor="middle"
                fill={T.faint} style={{ fontFamily: T.mono, fontSize: 8 }}>{lbl}</text>
            )}
          </g>
        );
      })}

      {/* Hover tooltip */}
      {hover !== null && data[hover] && (() => {
        const d = data[hover];
        const cx = gx(hover);
        const tipW = 98, tipH = 50;
        let tipX = cx - tipW / 2;
        tipX = Math.max(padX, Math.min(tipX, W - padX - tipW));
        return (
          <g style={{ pointerEvents: "none" }}>
            <rect x={tipX} y={2} width={tipW} height={tipH} rx={7} fill={T.panelSolid} stroke={T.lineSolid} strokeWidth={1} style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.18))" }} />
            <text x={tipX + tipW / 2} y={14} textAnchor="middle" fill={T.sub} fontSize="7.5" fontWeight="700" fontFamily={T.mono}>{d.label || d.m}</text>
            <line x1={tipX + 8} x2={tipX + tipW - 8} y1={18} y2={18} stroke={T.line} strokeWidth={0.8} />
            <circle cx={tipX + 11} cy={29} r={2.6} fill={T.greenDeep} />
            <text x={tipX + 18} y={32} textAnchor="start" fill={T.sub} fontSize="8" fontFamily={T.mono}>In</text>
            <text x={tipX + tipW - 9} y={32} textAnchor="end" fill={T.greenDeep} fontSize="8.5" fontWeight="700" fontFamily={T.mono}>+{fmt(d.income)}</text>
            <circle cx={tipX + 11} cy={42} r={2.6} fill={T.red} />
            <text x={tipX + 18} y={45} textAnchor="start" fill={T.sub} fontSize="8" fontFamily={T.mono}>Out</text>
            <text x={tipX + tipW - 9} y={45} textAnchor="end" fill={T.red} fontSize="8.5" fontWeight="700" fontFamily={T.mono}>−{fmt(d.expense)}</text>
          </g>
        );
      })()}
    </svg>
  );
}

function Donut({ segments, size = 130, thickness = 19, centerTop, centerBot, onSegmentClick }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const [on, setOn] = useState(false);
  const [hovSeg, setHovSeg] = useState(null);
  useEffect(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id); }, []);
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0, filter: "drop-shadow(0 4px 10px rgba(17,24,39,0.12))", cursor: onSegmentClick ? "pointer" : "default" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.lineSolid} strokeWidth={thickness} opacity={0.5} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((s, i) => {
          const raw = (s.value / total) * c;
          const len = Math.max(0, raw - 3);
          const isHov = hovSeg === i;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={isHov ? thickness + 3 : thickness}
              strokeDasharray={`${on ? len : 0.001} ${c}`} strokeDashoffset={-acc} strokeLinecap="round"
              style={{ transition: `stroke-dasharray .8s cubic-bezier(.3,.85,.3,1) ${i * 0.12}s, stroke-width .15s ease`, cursor: onSegmentClick ? "pointer" : "default" }}
              onMouseEnter={() => setHovSeg(i)} onMouseLeave={() => setHovSeg(null)}
              onClick={() => onSegmentClick && onSegmentClick(s.label)} />
          );
          acc += raw;
          return el;
        })}
      </g>
      {centerTop && <text x={size / 2} y={size / 2 - 1} textAnchor="middle" fill={T.ink} style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 600, animation: "fadeIn .6s ease .5s both" }}>{centerTop}</text>}
      {centerBot && <text x={size / 2} y={size / 2 + 15} textAnchor="middle" fill={T.faint} style={{ fontFamily: T.body, fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", animation: "fadeIn .6s ease .5s both" }}>{centerBot}</text>}
      {hovSeg !== null && segments[hovSeg] && (
        <text x={size / 2} y={size / 2 + 32} textAnchor="middle" fill={T.sub} style={{ fontFamily: T.body, fontSize: 8.5, pointerEvents: "none" }}>{onSegmentClick ? "click to filter" : ""}</text>
      )}
    </svg>
  );
}

function Legend({ segments }) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
      {segments.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0, boxShadow: `0 0 8px ${s.color}88` }} />
          <span style={{ fontSize: 12.5, color: T.sub, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
          <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.ink }}>{Math.round((s.value / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

/* ============================ APP ============================ */
export default function Oreo() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("dash");
  const [profMenu, setProfMenu] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAcctMgr, setShowAcctMgr] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [usdIdr, setUsdIdr] = useState(16250);
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
  const [disp, setDisp] = useState("IDR");
  const [isDesktop, setIsDesktop] = useState(typeof window !== "undefined" && window.innerWidth >= 900);
  const [chartView, setChartView] = useState("growth");
  const [ai, setAi] = useState("");
  const [aiResult, setAiResult] = useState(null); // { query, summary, total, matching, breakdown, suggestions }
  const [theme, setTheme] = useState("light");
  const [chartRange, setChartRange] = useState("month");
  const [chartFrom, setChartFrom] = useState("");
  const [chartTo, setChartTo] = useState("");
  const [invRange, setInvRange] = useState("1y");
  const [invFrom, setInvFrom] = useState("");
  const [invTo, setInvTo] = useState("");
  const [privacy, setPrivacy] = useState(false);
  const [undoStack, setUndoStack] = useState(null);
  const [dashCollapsed, setDashCollapsed] = useState({ insights: false, accounts: false, goals: false, budgets: false, upcoming: true, recurring: false });
  const [showAllSections, setShowAllSections] = useState({});
  const toggleShowAll = (k) => setShowAllSections((s) => ({ ...s, [k]: !s[k] }));
  const toggleSection = (k) => setDashCollapsed((s) => ({ ...s, [k]: !s[k] }));
  const aiInputRef = useRef(null);
  const [f, setF] = useState({ type: "all", cats: [], accts: [], range: "all", from: "", to: "", min: "", max: "", platform: "all", asset: "all", pl: "all", sort: "newest" });
  const resetFilters = () => { setF({ type: "all", cats: [], accts: [], range: "all", from: "", to: "", min: "", max: "", platform: "all", asset: "all", pl: "all", sort: "newest" }); setQ(""); };

  useEffect(() => { loadState().then(setState); }, []);
  useEffect(() => { if (state) saveState(state); }, [state]);
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

  if (!state) {
    return <div style={{ background: T.bg, color: T.sub, minHeight: 560, display: "grid", placeItems: "center", fontFamily: T.body }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={16} color={T.gold} /> Loading Oreo…</div>
    </div>;
  }

  const pdata = state.data[state.active];
  const profile = state.profiles.find((p) => p.id === state.active);
  const setPData = (patch) => setState((s) => ({ ...s, data: { ...s.data, [s.active]: { ...s.data[s.active], ...patch } } }));
  DISPLAY = disp;
  PRIVATE = privacy;
  USD_IDR = usdIdr;
  T = theme === "dark" ? darkTheme : lightTheme;

  const monthTx = pdata.transactions;

  // Unified range bounds — chartRange drives BOTH stats and charts
  const rangeBounds = (() => {
    const today = new Date();
    const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString().slice(0, 10); };
    if (chartRange === "month") { const s = new Date(today.getFullYear(), today.getMonth(), 1); return { from: startOfDay(s), to: todayISO(), label: "This month" }; }
    if (chartRange === "lastmo") { const s = new Date(today.getFullYear(), today.getMonth() - 1, 1); const e = new Date(today.getFullYear(), today.getMonth(), 0); return { from: startOfDay(s), to: startOfDay(e), label: "Last month" }; }
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
    const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString().slice(0, 10); };
    if (invRange === "month") { const s = new Date(today.getFullYear(), today.getMonth(), 1); return { from: startOfDay(s), to: todayISO(), label: "This month" }; }
    if (invRange === "lastmo") { const s = new Date(today.getFullYear(), today.getMonth() - 1, 1); const e = new Date(today.getFullYear(), today.getMonth(), 0); return { from: startOfDay(s), to: startOfDay(e), label: "Last month" }; }
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
  const recentHistory = pdata.history.slice(-3);
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

  const nwTrend = pdata.history.map((h, i, arr) => {
    const cum = arr.slice(0, i + 1).reduce((a, b) => a + (b.income - b.expense), 0);
    return cum + invValue * 0.6;
  });
  const growthData = pdata.history.map((h, i) => ({ label: h.m, value: nwTrend[i] }));
  const growthPct = nwTrend[0] ? ((nwTrend[nwTrend.length - 1] - nwTrend[0]) / nwTrend[0]) * 100 : 0;

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
      const moRows = pdata.history.map((h) => {
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
      const sumInc = pdata.history.reduce((a, h) => a + h.income, 0);
      const sumExp = pdata.history.reduce((a, h) => a + h.expense, 0);
      const blankMo = { Month: "", "Income (Rp)": "", "Expenses (Rp)": "", "Net (Rp)": "", "Savings Rate": "", "Income (USD)": "", "Expenses (USD)": "" };
      moRows.push(
        { ...blankMo },
        { ...blankMo, Month: "TOTAL", "Income (Rp)": rnd(sumInc), "Expenses (Rp)": rnd(sumExp), "Net (Rp)": rnd(sumInc - sumExp), "Savings Rate": sumInc ? (sumInc - sumExp) / sumInc : 0, "Income (USD)": usd(sumInc / USD_IDR), "Expenses (USD)": usd(sumExp / USD_IDR) },
        { ...blankMo, Month: "MONTHLY AVG", "Income (Rp)": rnd(sumInc / (pdata.history.length || 1)), "Expenses (Rp)": rnd(sumExp / (pdata.history.length || 1)), "Net (Rp)": rnd((sumInc - sumExp) / (pdata.history.length || 1)) },
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
  const fullNwTrend = pdata.history.map((_, i, arr) => {
    const cum = arr.slice(0, i + 1).reduce((a, b) => a + (b.income - b.expense), 0);
    return cum + invValue * 0.6;
  });

  // Slice-based history filter so range labels always show sensible point counts
  const filteredHistory = (() => {
    const hist = pdata.history;
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
  const firstHistMs = new Date(pdata.history[0].date + "T00:00:00").getTime();
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
  const nwAnchors = pdata.history.map((h, i) => ({ t: new Date(h.date + "T00:00:00").getTime(), v: fullNwTrend[i] }));
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
      const dayNum = Math.floor(ms / 864e5);
      const wiggle = Math.sin(dayNum * 1.7) * 0.012 + Math.sin(dayNum * 0.55) * 0.008;
      out.push({ ms, label: axisLabel(ms), full: fullDate(ms), value: Math.max(0, Math.round(base * (1 + wiggle))) });
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
  const cashSeries = (() => {
    // Short ranges (≤45 days): weekly buckets from real transactions
    if (rangeDays <= 45) {
      const endDate = new Date(rangeBoundsEnd); endDate.setHours(0, 0, 0, 0);
      const nWeeks = Math.max(2, Math.ceil(rangeDays / 7));
      const buckets = [];
      for (let w = nWeeks - 1; w >= 0; w--) {
        const end = new Date(endDate); end.setDate(end.getDate() - w * 7);
        const start = new Date(end); start.setDate(start.getDate() - 6);
        const endIso = end.toISOString().slice(0, 10);
        const startIso = start.toISOString().slice(0, 10);
        let income = 0, expense = 0;
        pdata.transactions.forEach((t) => {
          if (t.date >= startIso && t.date <= endIso) {
            if (t.type === "income") income += t.amount;
            else if (t.type === "expense") expense += t.amount;
          }
        });
        buckets.push({ label: dayLabel(end.getTime()), income, expense });
      }
      return buckets;
    }
    // Longer ranges: monthly history sliced
    const months = Math.max(2, Math.round(rangeDays / 30));
    const slice = chartRange === "custom"
      ? pdata.history.filter((h) => (!chartFrom || h.date >= chartFrom) && (!chartTo || h.date <= chartTo))
      : pdata.history.slice(-months);
    return (slice.length ? slice : pdata.history).map((h) => ({ label: chartMonthLabel(h), income: h.income, expense: h.expense }));
  })();
  const cashTotals = cashSeries.reduce((a, b) => ({ income: a.income + b.income, expense: a.expense + b.expense }), { income: 0, expense: 0 });

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
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 13, padding: "9px 12px", cursor: "pointer" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(145deg, ${T.gold2}, ${T.goldDeep})`, display: "grid", placeItems: "center", color: "#fff", flexShrink: 0, boxShadow: `0 4px 12px ${T.gold}40` }}>
          {profile.type === "business" ? <Building2 size={16} /> : <Wallet size={16} />}
        </div>
        <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: -0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.name}</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", textTransform: "capitalize", marginTop: 1 }}>{profile.type} account</div>
        </div>
        <ChevronDown size={13} color="rgba(255,255,255,0.35)" style={{ flexShrink: 0 }} />
      </button>
      {profMenu && (
        <div className="lg-pop" style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, background: T.sidebar, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 16, padding: 6, zIndex: 20, boxShadow: "0 -24px 48px rgba(0,0,0,0.4)" }}>
          {state.profiles.map((p) => {
            const active = p.id === state.active;
            return (
              <button key={p.id} className="lg-nav lg-btn" onClick={() => { setState((s) => ({ ...s, active: p.id })); setProfMenu(false); setTab("dash"); showToast(`Switched to ${p.name}`, 1600); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: active ? "rgba(255,255,255,0.1)" : "none", border: "none", borderRadius: 10, padding: "9px 10px", cursor: "pointer", color: active ? "#fff" : "rgba(255,255,255,0.65)", textAlign: "left" }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: active ? `linear-gradient(145deg, ${T.gold2}, ${T.goldDeep})` : "rgba(255,255,255,0.1)", display: "grid", placeItems: "center", color: "#fff", flexShrink: 0 }}>
                  {p.type === "business" ? <Building2 size={13} /> : <Wallet size={13} />}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: active ? 700 : 500, flex: 1 }}>{p.name}</span>
                {active && <div style={{ width: 7, height: 7, borderRadius: 99, background: T.gold, boxShadow: `0 0 6px ${T.gold}` }} />}
              </button>
            );
          })}
          <div style={{ borderTop: `1px solid rgba(255,255,255,0.07)`, margin: "4px 6px 0" }} />
          <div style={{ padding: "8px 10px", fontSize: 11.5, color: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", gap: 7 }}><Plus size={12} /> New profile coming soon</div>
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
      <Sparkles size={isDesktop ? 20 : 18} color={T.gold} />
      <input ref={aiInputRef} value={ai} onChange={(e) => setAi(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runAI()}
        placeholder={isDesktop ? "Ask anything about your money — e.g. “food spending this month”, “income last month”…" : "Ask about your money — e.g. “food spending this month”"}
        style={{ flex: 1, border: "none", outline: "none", background: "none", fontSize: isDesktop ? 15 : 14.5, fontFamily: T.body, color: T.ink, minWidth: 0 }} />
      <button onClick={runAI} disabled={aiLoading} className="lg-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: aiLoading ? T.panel2 : `linear-gradient(145deg, ${T.gold2}, ${T.gold} 60%, ${T.goldDeep})`, border: aiLoading ? `1px solid ${T.line}` : "none", borderRadius: 12, padding: isDesktop ? "10px 18px" : "9px 15px", cursor: aiLoading ? "not-allowed" : "pointer", color: aiLoading ? T.faint : "#fff", fontWeight: 600, fontSize: isDesktop ? 14 : 13.5, fontFamily: T.body, transition: "all .2s ease" }}>
        {aiLoading ? <><RefreshCw size={14} style={{ animation: "spin .8s linear infinite" }} /> Thinking…</> : "Explore"}
      </button>
    </div>
  );

  const heroCard = (
    <Card style={{ padding: 22, height: "100%" }} className="lg-rise">
      <div className="lg-rise" style={{ ...stagger(0) }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label>Net Worth</Label>
          {!isDesktop && <CcyToggle disp={disp} setDisp={setDisp} />}
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
      <Card style={{ padding: "12px 14px 10px", marginBottom: 14 }} className="lg-rise">
        <div style={{ fontSize: 10.5, color: T.faint, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, marginBottom: 7 }}>Date range</div>
        <ChartRangeBar range={chartRange} setRange={setChartRange} from={chartFrom} setFrom={setChartFrom} to={chartTo} setTo={setChartTo} opts={RANGE_OPTS} />
        <div style={{ fontSize: 11, color: T.faint, fontFamily: T.mono, marginTop: 6 }}>
          <span style={{ color: T.sub, fontWeight: 600 }}>{rangeBounds.label}</span> · {rangeText} · {statTx.filter((t) => t.type !== "transfer").length} txns
        </div>
      </Card>
      <div style={{ marginBottom: 14 }}>{aiBar}{aiResultPanel}</div>
      <div style={{ marginBottom: 14 }}>{heroCard}</div>
      <div style={{ marginBottom: 14 }}>{statGrid("1fr 1fr 1fr")}</div>
      <Card style={{ padding: 16, marginBottom: 14 }} className="lg-rise">
        <div style={{ display: "flex", background: T.panel2, borderRadius: 11, padding: 3, gap: 2, marginBottom: 4 }}>
          {chartTabs.map((c) => (
            <button key={c.k} onClick={() => setChartView(c.k)} className="lg-btn"
              style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: T.body, fontSize: 11.5, fontWeight: 600, background: chartView === c.k ? T.ink : "transparent", color: chartView === c.k ? T.bg : T.sub }}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="lg-pop" key={chartView + chartRange} style={{ marginTop: 14 }}>
          {chartTabs.find((c) => c.k === chartView).node}
        </div>
      </Card>
      <Card style={{ padding: 16, marginBottom: 14 }} className="lg-rise">{breakdownNode}</Card>
      {insightsNode && <MobileSection sectionKey="insights" label="Insights" icon={<Sparkles size={12} color={T.gold} />} collapsed={dashCollapsed.insights} onToggle={toggleSection}>{insightsNode}</MobileSection>}
      <MobileSection sectionKey="goals" label="Goals" icon={<Target size={12} color={T.faint} />} alwaysShow collapsed={dashCollapsed.goals} onToggle={toggleSection}>{goalsNode}</MobileSection>
      {budgetsNode && <MobileSection sectionKey="budgets" label="Budgets" icon={<BarChart3 size={12} color={T.faint} />} collapsed={dashCollapsed.budgets} onToggle={toggleSection}>{budgetsNode}</MobileSection>}
      <MobileSection sectionKey="accounts" label="Accounts" icon={<Wallet size={12} color={T.faint} />} alwaysShow collapsed={dashCollapsed.accounts} onToggle={toggleSection}>{accountsNode}</MobileSection>
      <MobileSection sectionKey="upcoming" label="Upcoming renewals" icon={<Clock size={12} color={T.faint} />} collapsed={dashCollapsed.upcoming} onToggle={toggleSection}>{renewalsList}</MobileSection>
    </div>
  );

  const dashDesktop = (
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
                background: `linear-gradient(135deg, ${T.gold}10, ${T.gold2}06, ${T.gold}08)`,
                border: `1px solid ${T.gold}25`, borderRadius: 14, cursor: "pointer", fontFamily: T.body,
                boxShadow: `0 2px 16px ${T.gold}0c, inset 0 1px 0 rgba(255,255,255,0.05)` }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: `linear-gradient(145deg, ${T.gold2}, ${T.gold})`, display: "grid", placeItems: "center", flexShrink: 0, boxShadow: `0 3px 10px ${T.gold}35` }}>
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
            style={{ marginTop: 8, width: "100%", padding: "8px 14px", borderRadius: 10, background: `${T.gold}12`, border: `1px solid ${T.gold}28`, color: T.goldDeep, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: T.body, display: "flex", alignItems: "center", gap: 7 }}>
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
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", cursor: "pointer", borderBottom: idx < txns.length - 1 ? `1px solid ${T.line}` : "none", background: bulkSel.has(t.id) ? `${T.gold}0c` : "transparent" }}>
                      {bulkSel.size > 0 && (
                        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${bulkSel.has(t.id) ? T.gold : T.line}`, background: bulkSel.has(t.id) ? T.gold : "transparent", display: "grid", placeItems: "center", flexShrink: 0, transition: "all .14s ease" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0 }}>
            {[
              { l: "Monthly", v: fmtCompact(subTotal), sub: "total" },
              { l: "Annual", v: fmtCompact(totalAnnual), sub: "projected", col: T.sub },
              { l: "Active", v: filteredSubs.length, sub: "subscriptions", col: T.sub },
              { l: "Next renewal", v: nextSub ? nextSub.merchant : "—", sub: nextDays !== null ? (nextDays <= 0 ? "today" : nextDays === 1 ? "tomorrow" : `in ${nextDays}d`) : "", col: nextDays !== null && nextDays <= 3 ? T.gold : T.sub },
            ].map(({ l, v, sub, col }, i) => (
              <div key={l} style={{ paddingLeft: i > 0 ? 16 : 0, borderLeft: i > 0 ? `1px solid ${T.line}` : "none" }}>
                <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 3 }}>{l}</div>
                <div style={{ fontFamily: T.display, fontSize: i < 2 ? 20 : 16, fontWeight: 800, letterSpacing: -0.4, color: col || T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
                {sub && <div style={{ fontSize: 10, color: T.faint, marginTop: 1 }}>{sub}</div>}
              </div>
            ))}
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
    const GECKO_IDS = { BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana", MATIC: "matic-network", ADA: "cardano" };
    const cryptoHoldings = pdata.holdings.filter((h) => GECKO_IDS[h.ticker]);
    try {
      const ids = [...new Set(cryptoHoldings.map((h) => GECKO_IDS[h.ticker])), "usd-coin"].join(",");
      const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,idr`);
      const prices = await resp.json();
      // Update live USD/IDR rate from USDC
      if (prices["usd-coin"]?.idr) setUsdIdr(Math.round(prices["usd-coin"].idr));
      // Update holding prices
      const updated = pdata.holdings.map((h) => {
        const geckoId = GECKO_IDS[h.ticker];
        if (!geckoId || !prices[geckoId]) return h;
        const newPrice = h.ccy === "USD" ? prices[geckoId].usd : prices[geckoId].idr;
        return { ...h, price: +(newPrice).toFixed(h.ccy === "USD" ? 2 : 0) };
      });
      // Stocks get a small random jitter (real stock API needs auth)
      const withStocks = updated.map((h) => GECKO_IDS[h.ticker] ? h : { ...h, price: +(h.price * (1 + (Math.random() - 0.5) * 0.012)).toFixed(h.ccy === "USD" ? 2 : 0) });
      setPData({ holdings: withStocks });
      showToast(`✓ Prices updated · 1 USD = Rp ${Math.round(prices["usd-coin"]?.idr || usdIdr).toLocaleString("id-ID")}`);
    } catch {
      showToast("Price fetch failed — check connection");
    }
    
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
      {!isDesktop && (
        <>
          <Header title="Investments" sub={invCost > 0 ? `${fmtDisp(invValue)} · ${(((invValue - invCost) / invCost) * 100).toFixed(1)}% all-time` : "No holdings yet"} />
          <div style={{ marginBottom: 12 }}>
            <ChartRangeBar range={invRange} setRange={setInvRange} from={invFrom} setFrom={setInvFrom} to={invTo} setTo={setInvTo} opts={RANGE_OPTS} />
          </div>
        </>
      )}
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
            style={{ padding: "12px 28px", borderRadius: 12, background: `linear-gradient(145deg,${T.gold2},${T.gold} 55%,${T.goldDeep})`, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: T.body, boxShadow: `0 4px 16px ${T.gold}40` }}>
            Add your first holding
          </button>
        </div>
      ) : (<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        {isDesktop && <div style={{ fontSize: 13, color: T.sub }}>{invCost > 0 ? `${fmtDisp(invValue)} market · ${(((invValue - invCost) / invCost) * 100).toFixed(1)}% all-time` : "No holdings yet"}</div>}
        <button className="lg-btn" onClick={refreshPrices} disabled={priceLoading}
          style={{ display: "flex", alignItems: "center", gap: 6, background: T.panel2, border: `1px solid ${T.line}`, color: priceLoading ? T.faint : T.sub, borderRadius: 11, padding: "7px 11px", cursor: priceLoading ? "not-allowed" : "pointer", fontSize: 12, fontFamily: T.body }}>
          <RefreshCw size={13} style={priceLoading ? { animation: "spin .8s linear infinite" } : {}} />
          {priceLoading ? "Fetching…" : "Refresh prices"}
        </button>
      </div>

      {pdata.holdings.length > 0 && (
        <Card style={{ padding: 16, marginBottom: 14 }}>
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
      )}

      {isDesktop ? (
        <>
          {portfolioSeries.length > 1 && (
            <Card style={{ padding: 18, marginBottom: 16 }} className="lg-rise">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <Label>Portfolio performance</Label>
                <span style={{ fontSize: 11, color: T.sub, fontFamily: T.mono }}>{invRangeBounds.label}</span>
              </div>
              <GrowthChart data={portfolioSeries} chartId="portfolio" />
            </Card>
          )}
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

  const tabContent = tab === "dash" ? (isDesktop ? dashDesktop : dashMobile) : tab === "txn" ? activityContent : tab === "sub" ? subsContent : investContent;

  const onboardingBanner = state?.firstRun ? (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", background: `linear-gradient(135deg, ${T.gold}18, ${T.gold2}0c)`, border: `1px solid ${T.gold}35`, borderRadius: 14, marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <Sparkles size={18} color={T.gold} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>You're exploring sample data</div>
        <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>Clear it and start tracking your real finances, or keep exploring the demo.</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => {
          const fresh = { transactions: [], subscriptions: [], holdings: [], investmentTransactions: [], goals: [], accounts: pdata.accounts.map((a) => ({ ...a, opening: 0 })), categories: pdata.categories, budgets: [], history: [] };
          setPData(fresh); setState((s) => ({ ...s, firstRun: false }));
          showToast("Cleared ✓ — add your first transaction", 3000);
        }} className="lg-btn" style={{ background: T.gold, border: "none", color: "#fff", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: T.body }}>Start fresh</button>
        <button onClick={() => setState((s) => ({ ...s, firstRun: false }))} className="lg-btn" style={{ background: "transparent", border: `1px solid ${T.line}`, color: T.sub, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: T.body }}>Keep demo</button>
      </div>
    </div>
  ) : null;
  const addBtn = (
    <button className="lg-btn" onClick={() => setModal(tab === "sub" ? "sub" : tab === "inv" ? "hold" : "txn")}
      style={{ display: "flex", alignItems: "center", gap: 7, background: `linear-gradient(145deg, ${T.gold2}, ${T.gold} 55%, ${T.goldDeep})`, border: "none", borderRadius: 12, padding: "10px 16px", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: T.body }}>
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
      style={{ background: privacy ? `${T.gold}1c` : T.panel2, border: `1px solid ${privacy ? T.gold : T.line}`, borderRadius: 10, padding: 8, cursor: "pointer", color: privacy ? T.goldDeep : T.sub, display: "grid", placeItems: "center" }}>
      {privacy ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );

  return (
    <div style={{ background: T.bg, minHeight: isDesktop ? 720 : 640, fontFamily: T.body, color: T.ink, position: "relative", overflow: "hidden" }}
      onClick={() => { setProfMenu(false); setShowBell(false); }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Spline+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        /* ── resets ── */
        *, *::before, *::after { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.18); border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.32); }
        ::selection { background: rgba(47,107,255,0.2); color: inherit; }
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; box-sizing: border-box; }
        /* ── inputs ── */
        input, select, textarea { transition: border-color .15s ease, box-shadow .15s ease; }
        input:focus, select:focus, textarea:focus { outline: none; box-shadow: 0 0 0 3px rgba(47,107,255,0.14); border-color: rgba(47,107,255,0.5) !important; }
        input::placeholder, textarea::placeholder { color: rgba(128,128,148,0.4); }
        /* ── interactive ── */
        .lg-tab   { transition: color .16s ease; }
        .lg-row   { transition: background .12s ease; border-radius: 10px; }
        .lg-row:hover   { background: rgba(120,130,150,0.07); }
        .lg-btn   { transition: transform .1s ease, opacity .1s ease, filter .14s ease, box-shadow .16s ease; }
        .lg-btn:hover   { filter: brightness(1.08); }
        .lg-btn:active  { transform: scale(.94); opacity: .82; }
        .lg-nav   { transition: background .14s ease, color .14s ease, border-color .14s ease; }
        .lg-nav:hover   { background: rgba(255,255,255,0.05); }
        /* card lift */
        .lg-card-btn { transition: transform .2s cubic-bezier(.2,.85,.3,1), box-shadow .2s ease; cursor: pointer; }
        .lg-card-btn:hover  { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(17,24,39,0.14), 0 3px 10px rgba(17,24,39,0.07); }
        .lg-card-btn:active { transform: translateY(-1px) scale(.99); }
        /* pill/chip */
        .lg-chip { display:inline-flex; align-items:center; border-radius:99px; font-size:11px; font-weight:600; line-height:1; transition: all .14s ease; }
        /* ── animations ── */
        @keyframes rise     { from { opacity:0; transform:translateY(14px) scale(.99);  } to { opacity:1; transform:none; } }
        @keyframes pop      { from { opacity:0; transform:translateY(7px)  scale(.99);  } to { opacity:1; transform:none; } }
        @keyframes modalIn  { from { opacity:0; transform:scale(.97) translateY(-8px);  } to { opacity:1; transform:none; } }
        @keyframes sheetIn  { from { opacity:0; transform:translateY(24px) scale(.99);  } to { opacity:1; transform:none; } }
        @keyframes tabFade  { from { opacity:0; transform:translateY(5px);              } to { opacity:1; transform:none; } }
        @keyframes pulse    { 0%,100% { box-shadow:0 0 0 0 rgba(47,107,255,.35); } 70% { box-shadow:0 0 0 14px rgba(47,107,255,0); } }
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
          <div style={{ width: 242, flexShrink: 0, background: T.sidebar, display: "flex", flexDirection: "column", height: "100vh", borderRight: `1px solid ${T.sidebarLine}`, position: "relative", zIndex: 2,
            backgroundImage: `radial-gradient(ellipse at 60% -10%, rgba(47,107,255,0.12) 0%, transparent 60%)` }}>

            {/* Logo */}
            <div style={{ padding: "22px 20px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(145deg, ${T.gold2}, ${T.gold} 55%, ${T.goldDeep})`, display: "grid", placeItems: "center", fontFamily: T.display, fontWeight: 900, fontSize: 16, color: "#fff", flexShrink: 0 }}>O</div>
              <span style={{ fontFamily: T.display, fontWeight: 800, fontSize: 18, color: "#fff", letterSpacing: -0.3 }}>Oreo</span>
              <span style={{ marginLeft: "auto", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "2px 7px", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.5, textTransform: "uppercase" }}>BETA</span>
            </div>

            {/* Nav items */}
            <div style={{ padding: "6px 10px", flex: 1, overflowY: "auto" }}>
              {navItems.map((n) => {
                const on = tab === n.k; const Icon = n.icon;
                return (
                  <button key={n.k} onClick={() => setTab(n.k)} className="lg-nav lg-btn"
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px 9px 14px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 1,
                      background: on ? "rgba(255,255,255,0.10)" : "transparent",
                      color: on ? T.sidebarTextActive : T.sidebarText,
                      fontFamily: T.body, fontWeight: on ? 600 : 400, fontSize: 13.5, textAlign: "left", position: "relative",
                      boxShadow: on ? "inset 0 1px 0 rgba(255,255,255,0.06)" : "none" }}>
                    {on && <div style={{ position: "absolute", left: 0, top: "18%", height: "64%", width: 3, borderRadius: 2, background: T.gold, boxShadow: `0 0 8px ${T.gold}88` }} />}
                    <Icon size={16} strokeWidth={on ? 2.3 : 1.8} color={on ? T.gold2 : T.sidebarText} />
                    <span style={{ letterSpacing: on ? 0 : 0 }}>{n.l}</span>
                  </button>
                );
              })}

              {/* Divider + Quick stats */}
              <div style={{ margin: "14px 4px 10px", borderTop: `1px solid ${T.sidebarLine}` }} />
              <div style={{ padding: "0 8px", marginBottom: 10 }}>
                <div style={{ fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>Portfolio</div>
                {PRIVATE ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 4px" }}>
                    <EyeOff size={12} color="rgba(255,255,255,0.25)" />
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>Amounts hidden</span>
                  </div>
                ) : (
                  <>
                    {[
                      { label: "Net worth", val: netWorth, col: "#fff" },
                      { label: "Cash & accounts", val: totalAssets, col: "rgba(255,255,255,0.65)" },
                      { label: "Investments", val: invValue, col: "rgba(255,255,255,0.65)" },
                      { label: "Liabilities", val: -totalLiab, col: totalLiab > 0 ? "#fb6b8e" : "rgba(255,255,255,0.4)" },
                    ].map(({ label, val, col }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{label}</span>
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
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>All profiles</span>
                            <span style={{ fontSize: 12, fontFamily: T.mono, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>{fmtCompact(allNW)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
              {/* Live exchange rate indicator — hidden in privacy mode */}
              {!PRIVATE && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", letterSpacing: 0.3 }}>1 USD</span>
                  <span style={{ fontSize: 10.5, fontFamily: T.mono, color: usdIdr !== 16250 ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)", letterSpacing: 0.2 }}>
                    = Rp {usdIdr.toLocaleString("id-ID")}
                    {usdIdr !== 16250 && <span style={{ fontSize: 9, marginLeft: 4, color: T.greenDeep }}>●</span>}
                  </span>
                </div>
              )}
            </div>
            <div style={{ borderTop: `1px solid ${T.sidebarLine}`, padding: "10px 10px" }}>
              {[
                { label: disp === "IDR" ? "IDR — Rupiah" : "USD — Dollar", icon: Wallet, action: () => setDisp(disp === "IDR" ? "USD" : "IDR") },
                { label: "Manage accounts", icon: Wallet, action: () => setShowAcctMgr(true) },
                { label: "Manage categories", icon: Tag, action: () => setShowCatMgr(true) },
                { label: "Import CSV", icon: Download, action: () => setShowCSVImport(true) },
                { label: privacy ? "Amounts hidden" : "Show amounts", icon: privacy ? EyeOff : Eye, action: () => setPrivacy(!privacy), active: privacy },
                { label: theme === "dark" ? "Dark mode" : "Light mode", icon: theme === "dark" ? Moon : Sun, action: () => setTheme(theme === "dark" ? "light" : "dark") },
              ].map(({ label, icon: Icon, action, active }) => (
                <button key={label} onClick={action} className="lg-btn"
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: active ? "rgba(255,255,255,0.07)" : "transparent", color: active ? T.sidebarTextActive : T.sidebarText, fontFamily: T.body, fontSize: 13, fontWeight: 500, textAlign: "left", marginBottom: 2 }}>
                  <Icon size={15} strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </div>

            {/* Profile + Export */}
            {/* Keyboard shortcuts strip */}
            <div style={{ padding: "6px 12px 0", borderTop: `1px solid ${T.sidebarLine}` }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", paddingBottom: 8 }}>
                {[["⌘N", "Add"], ["/ ", "Search"], ["⌘1-4", "Tabs"], ["Esc", "Close"]].map(([k, l]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <kbd style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 4, padding: "1px 5px", fontSize: 9.5, fontFamily: T.mono, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>{k}</kbd>
                    <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${T.sidebarLine}`, padding: "10px 10px 16px" }}>
              <button onClick={exportExcel} className="lg-btn"
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", color: T.sidebarText, fontFamily: T.body, fontSize: 13, fontWeight: 500, textAlign: "left", marginBottom: 4 }}>
                <Download size={15} strokeWidth={1.8} /> Export to Excel
              </button>
              {showResetConfirm ? (
                <div style={{ padding: "8px 12px", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>Delete all transactions, holdings, goals and subscriptions?</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setShowResetConfirm(false)} className="lg-btn"
                      style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, fontFamily: T.body }}>Cancel</button>
                    <button onClick={() => {
                      setPData({ transactions: [], subscriptions: [], holdings: [], investmentTransactions: [], goals: [], budgets: [], history: [], accounts: pdata.accounts.map((a) => ({ ...a, opening: 0 })), categories: pdata.categories });
                      setState((s) => ({ ...s, firstRun: false }));
                      setShowResetConfirm(false);
                      showToast("✓ All data cleared");
                    }} className="lg-btn"
                      style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "none", background: "#f43f6e22", color: "#fb6b8e", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: T.body }}>Reset</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowResetConfirm(true)} className="lg-btn"
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", borderRadius: 9, border: "none", cursor: "pointer", background: "transparent", color: "rgba(255,255,255,0.28)", fontFamily: T.body, fontSize: 12, fontWeight: 500, textAlign: "left", marginBottom: 4 }}>
                  <Trash2 size={13} strokeWidth={1.8} /> Reset all data
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer" }}
                onClick={() => setProfMenu((v) => !v)}>
                <div style={{ width: 28, height: 28, borderRadius: 8,
                  background: profile?.type === "business" ? "linear-gradient(135deg, #22c55e, #15a34a)" : `linear-gradient(135deg, ${T.gold2}, ${T.goldDeep})`,
                  display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {profile?.type === "business" ? <Building2 size={14} color="#fff" /> : <Wallet size={14} color="#fff" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.sidebarTextActive, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.name || "Personal"}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{profile?.type || "personal"} workspace</div>
                </div>
                <ChevronDown size={14} color="rgba(255,255,255,0.3)" />
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: T.bg }}>

            {/* Slim top bar — page title + (dashboard: range selector) + actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 28px 0", flexShrink: 0 }}>
              <div style={{ fontFamily: T.display, fontSize: 24, fontWeight: 800, letterSpacing: -0.6, color: T.ink, flexShrink: 0 }}>
                {navItems.find((n) => n.k === tab)?.l}
              </div>
              {tab === "dash" && (
                <div style={{ flex: 1, maxWidth: 520 }}>
                  <ChartRangeBar range={chartRange} setRange={setChartRange} from={chartFrom} setFrom={setChartFrom} to={chartTo} setTo={setChartTo} opts={RANGE_OPTS} />
                </div>
              )}
              {tab === "inv" && (
                <div style={{ flex: 1, maxWidth: 480 }}>
                  <ChartRangeBar range={invRange} setRange={setInvRange} from={invFrom} setFrom={setInvFrom} to={invTo} setTo={setInvTo} opts={RANGE_OPTS} />
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
                {addBtn}
              </div>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 28px 40px" }}>
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
            {profileSwitcher}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {logo}
              <button onClick={exportExcel} className="lg-btn" title="Export to Excel"
                style={{ background: T.panelSolid, border: `1px solid ${T.line}`, borderRadius: 10, padding: 7, cursor: "pointer", color: T.sub, display: "grid", placeItems: "center" }}>
                <Download size={16} />
              </button>
              {privacyToggle}
              {themeToggle}
              {bellEl}
            </div>
          </div>

          {/* MOBILE CONTENT */}
          <div style={{ padding: "8px 18px 96px", position: "relative", zIndex: 1, minHeight: 460 }}>
            {tabContent}
          </div>

          {/* FAB */}
          <button className="lg-btn" onClick={() => setModal(tab === "sub" ? "sub" : tab === "inv" ? "hold" : "txn")}
            style={{ position: "absolute", bottom: 80, right: 18, width: 54, height: 54, borderRadius: 17, background: `linear-gradient(145deg, ${T.gold2}, ${T.gold} 55%, ${T.goldDeep})`, border: "none", cursor: "pointer", display: "grid", placeItems: "center", zIndex: 8, animation: "pulse 2.6s 3" }}>
            <Plus size={24} color="#fff" strokeWidth={2.6} />
          </button>

          {/* BOTTOM NAV */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", borderTop: `1px solid ${T.line}`, background: T.navBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", zIndex: 6, boxShadow: "0 -4px 24px rgba(17,24,39,0.08)" }}>
            {navItems.map((n) => {
              const on = tab === n.k; const Icon = n.icon;
              const labels = { dash: "Home", txn: "Activity", sub: "Subs", inv: "Invest" };
              return (
                <button key={n.k} className="lg-tab" onClick={() => setTab(n.k)}
                  style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "10px 0 13px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}>
                  <div style={{ width: 40, height: 28, borderRadius: 10, display: "grid", placeItems: "center", position: "relative",
                    background: on ? `${T.gold}1a` : "transparent", transition: "background .18s ease" }}>
                    <Icon size={19} strokeWidth={on ? 2.4 : 1.9} color={on ? T.gold : T.faint} />
                    {n.k === "dash" && notifications.length > 0 && (
                      <div style={{ position: "absolute", top: 3, right: 6, width: 6, height: 6, borderRadius: 9,
                        background: notifications.some((x) => x.kind === "budget" && x.col === T.red) ? T.red : T.orange,
                        border: `1.5px solid ${T.bg}`, animation: "dotPop .3s ease" }} />
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, color: on ? T.gold : T.faint, letterSpacing: 0.1, transition: "color .18s ease" }}>{labels[n.k]}</span>
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
              if (modal === "hold") setPData({ holdings: [...pdata.holdings, { ...item, id: "h" + Date.now() }] });
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
            }} className="lg-btn" style={{ background: T.gold, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: T.body, marginLeft: 4 }}>Undo</button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================ SUB-COMPONENTS ============================ */
function CSVImport({ accounts, categories, onClose, onImport }) {
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [colDate, setColDate] = useState("");
  const [colNote, setColNote] = useState("");
  const [colAmount, setColAmount] = useState("");
  const [colDebit, setColDebit] = useState("");
  const [colCredit, setColCredit] = useState("");
  const [useDebitCredit, setUseDebitCredit] = useState(false);
  const [defaultAcct, setDefaultAcct] = useState(accounts[0]?.name || "");
  const [defaultCat, setDefaultCat] = useState("Uncategorized");
  const [error, setError] = useState("");

  const parseCSV = (text) => {
    // Strip BOM and normalize line endings
    const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const lines = cleaned.split("\n");
    if (lines.length < 2) return { headers: [], rows: [] };
    // Auto-detect delimiter: count semicolons vs commas in first line
    const firstLine = lines[0];
    const delim = (firstLine.split(";").length - 1) > (firstLine.split(",").length - 1) ? ";" : ",";
    const parseRow = (line) => {
      const cells = []; let cur = ""; let inQ = false;
      for (const ch of line + delim) {
        if (ch === '"') inQ = !inQ;
        else if (ch === delim && !inQ) { cells.push(cur.trim().replace(/^"|"$/g, "")); cur = ""; }
        else cur += ch;
      }
      return cells;
    };
    const hdrs = parseRow(lines[0]);
    const data = lines.slice(1).filter((l) => l.trim()).map((l) => {
      const vals = parseRow(l);
      return hdrs.reduce((o, h, i) => ({ ...o, [h]: vals[i] || "" }), {});
    });
    return { headers: hdrs, rows: data };
  };

  const parseAmount = (str) => {
    if (!str) return 0;
    const s = str.trim().replace(/^[Rp\s]+/i, "").trim(); // strip Rp prefix
    // IDR format: "1.500.000,00" or "1.500.000" — multiple periods, optional trailing comma+decimals
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
      return Math.abs(parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0);
    }
    // US format: "1,500,000.00" or "1,500,000"
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
      return Math.abs(parseFloat(s.replace(/,/g, "")) || 0);
    }
    // Plain number or with stray separators
    const clean = s.replace(/[^0-9.,\-]/g, "");
    // If ends with comma+2digits, treat as IDR decimal
    if (/,\d{2}$/.test(clean)) return Math.abs(parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0);
    return Math.abs(parseFloat(clean.replace(/,/g, "")) || 0);
  };

  const parseDate = (str) => {
    if (!str) return todayISO();
    // Try common formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
    const s = str.trim();
    const iso = s.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const dmy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,"0")}-${dmy[1].padStart(2,"0")}`;
    return todayISO();
  };

  const onFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { headers: hdrs, rows: data } = parseCSV(ev.target.result);
        if (!hdrs.length) { setError("Could not parse CSV — check the file format"); return; }
        setHeaders(hdrs); setRows(data); setError("");
        // Auto-detect columns by common header names
        const find = (...terms) => hdrs.find((h) => terms.some((t) => h.toLowerCase().includes(t))) || "";
        setColDate(find("date", "tanggal", "tgl"));
        setColNote(find("description", "keterangan", "memo", "note", "narasi", "ket"));
        const amtCol = find("amount", "jumlah", "nominal", "nilai");
        const dbCol = find("debit", "db", "keluar");
        const crCol = find("credit", "cr", "masuk");
        if (dbCol && crCol) { setColDebit(dbCol); setColCredit(crCol); setUseDebitCredit(true); }
        else { setColAmount(amtCol); setUseDebitCredit(false); }
      } catch { setError("Failed to read file"); }
    };
    reader.readAsText(file);
  };

  const buildTransactions = () => {
    if (!colDate || (!colAmount && !useDebitCredit)) return [];
    return rows.slice(0, 500).map((row, i) => {
      let amount = 0; let type = "expense";
      if (useDebitCredit) {
        const db = parseAmount(row[colDebit]); const cr = parseAmount(row[colCredit]);
        if (cr > 0) { amount = cr; type = "income"; }
        else { amount = db; type = "expense"; }
      } else {
        const raw = row[colAmount] || "";
        amount = parseAmount(raw);
        type = raw.trim().startsWith("-") ? "expense" : "income";
      }
      if (!amount) return null;
      return { id: "csv" + Date.now() + i, type, amount: Math.round(amount), cat: defaultCat, acct: defaultAcct, note: colNote ? (row[colNote] || "") : "", date: parseDate(row[colDate]) };
    }).filter(Boolean);
  };

  const preview = buildTransactions().slice(0, 5);
  const total = buildTransactions().length;

  const inputS2 = { flex: 1, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 10, padding: "8px 12px", color: T.ink, fontSize: 13, fontFamily: T.body, outline: "none" };
  const selS = { ...inputS2, cursor: "pointer" };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.5)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 24 }}>
      <div className="lg-modal" onClick={(e) => e.stopPropagation()} style={{ width: 520, maxHeight: "88vh", overflowY: "auto", background: T.panelSolid, border: `1px solid ${T.line}`, borderRadius: 20, padding: 26, boxShadow: "0 24px 64px rgba(17,24,39,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.gold}18`, display: "grid", placeItems: "center" }}><Download size={16} color={T.goldDeep} /></div>
            <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 800 }}>Import CSV</div>
          </div>
          <button onClick={onClose} className="lg-btn" style={{ background: T.panel2, border: "none", borderRadius: 9, padding: 8, cursor: "pointer", color: T.sub }}><X size={16} /></button>
        </div>

        {!rows.length ? (
          <>
            <div style={{ border: `2px dashed ${T.line}`, borderRadius: 14, padding: "32px 24px", textAlign: "center", marginBottom: 16 }}>
              <Download size={28} color={T.faint} style={{ margin: "0 auto 10px", display: "block" }} />
              <div style={{ fontSize: 14.5, fontWeight: 600, color: T.sub, marginBottom: 6 }}>Upload your bank CSV</div>
              <div style={{ fontSize: 12, color: T.faint, marginBottom: 16, lineHeight: 1.5 }}>Supports BCA, Jenius, GoPay, Tokopedia, or any CSV with Date, Amount, Description columns</div>
              <label style={{ background: `linear-gradient(145deg, ${T.gold2}, ${T.gold})`, color: "#fff", padding: "10px 22px", borderRadius: 11, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: T.body }}>
                Choose file <input type="file" accept=".csv,.txt" onChange={onFile} style={{ display: "none" }} />
              </label>
            </div>
            {error && <div style={{ color: T.red, fontSize: 13, textAlign: "center" }}>{error}</div>}
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, color: T.greenDeep, fontWeight: 600, marginBottom: 14 }}>✓ {rows.length} rows detected · {total} will be imported</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div><div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>Date column</div>
                <select style={selS} value={colDate} onChange={(e) => setColDate(e.target.value)}>
                  <option value="">— none —</option>{headers.map((h) => <option key={h}>{h}</option>)}
                </select></div>
              <div><div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>Note / description</div>
                <select style={selS} value={colNote} onChange={(e) => setColNote(e.target.value)}>
                  <option value="">— none —</option>{headers.map((h) => <option key={h}>{h}</option>)}
                </select></div>
            </div>

            <div style={{ background: T.panel2, borderRadius: 11, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <button onClick={() => setUseDebitCredit(false)} className="lg-btn" style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${!useDebitCredit ? T.gold : T.line}`, background: !useDebitCredit ? `${T.gold}18` : "transparent", color: !useDebitCredit ? T.goldDeep : T.sub, cursor: "pointer", fontFamily: T.body, fontSize: 12 }}>Single amount column</button>
                <button onClick={() => setUseDebitCredit(true)} className="lg-btn" style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${useDebitCredit ? T.gold : T.line}`, background: useDebitCredit ? `${T.gold}18` : "transparent", color: useDebitCredit ? T.goldDeep : T.sub, cursor: "pointer", fontFamily: T.body, fontSize: 12 }}>Debit / Credit columns</button>
              </div>
              {!useDebitCredit ? (
                <div><div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>Amount column (negative = expense)</div>
                  <select style={selS} value={colAmount} onChange={(e) => setColAmount(e.target.value)}>
                    <option value="">— none —</option>{headers.map((h) => <option key={h}>{h}</option>)}
                  </select></div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>Debit (expense)</div>
                    <select style={selS} value={colDebit} onChange={(e) => setColDebit(e.target.value)}>
                      <option value="">—</option>{headers.map((h) => <option key={h}>{h}</option>)}
                    </select></div>
                  <div><div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>Credit (income)</div>
                    <select style={selS} value={colCredit} onChange={(e) => setColCredit(e.target.value)}>
                      <option value="">—</option>{headers.map((h) => <option key={h}>{h}</option>)}
                    </select></div>
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div><div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>Account</div>
                <select style={selS} value={defaultAcct} onChange={(e) => setDefaultAcct(e.target.value)}>
                  {accounts.map((a) => <option key={a.id}>{a.name}</option>)}
                </select></div>
              <div><div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>Default category</div>
                <select style={selS} value={defaultCat} onChange={(e) => setDefaultCat(e.target.value)}>
                  <option>Uncategorized</option>
                  {[...new Set(categories.map((c) => c.name))].map((c) => <option key={c}>{c}</option>)}
                </select></div>
            </div>

            {preview.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: T.faint, marginBottom: 6 }}>Preview (first {preview.length})</div>
                <div style={{ border: `1px solid ${T.line}`, borderRadius: 11, overflow: "hidden" }}>
                  {preview.map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderBottom: i < preview.length - 1 ? `1px solid ${T.line}` : "none", background: i % 2 ? T.panel2 : "transparent" }}>
                      <span style={{ fontSize: 10.5, color: T.faint, fontFamily: T.mono, width: 72, flexShrink: 0 }}>{t.date}</span>
                      <span style={{ flex: 1, fontSize: 12.5, color: T.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.note || "(no note)"}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 600, color: t.type === "income" ? T.greenDeep : T.red, flexShrink: 0 }}>{t.type === "income" ? "+" : "−"}{fmtCompact(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setRows([]); setHeaders([]); }} className="lg-btn" style={{ flex: 1, padding: 13, borderRadius: 12, background: T.panel2, border: `1px solid ${T.line}`, color: T.sub, cursor: "pointer", fontFamily: T.body, fontWeight: 500 }}>Choose different file</button>
              <button onClick={() => { const txns = buildTransactions(); if (txns.length) onImport(txns); }} disabled={!total} className="lg-btn"
                style={{ flex: 2, padding: 13, borderRadius: 12, background: total ? `linear-gradient(145deg, ${T.gold2}, ${T.gold})` : T.panel2, border: "none", color: total ? "#fff" : T.faint, cursor: total ? "pointer" : "not-allowed", fontFamily: T.body, fontWeight: 700, fontSize: 14 }}>
                Import {total} transactions
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AccountManager({ accounts, onClose, onSave }) {
  const [list, setList] = useState(accounts.map((a) => ({ ...a })));
  const [editIdx, setEditIdx] = useState(null);
  const providers = ["BCA", "Mandiri", "BNI", "BRI", "CIMB", "Jenius", "Jago", "GoPay", "OVO", "Dana", "Bibit", "Pluang", "Stockbit", "Bybit", "Binance", "Cash", "Other"];

  const addAccount = () => {
    const newAcct = { id: "a" + Date.now(), name: "New Account", provider: "Other", kind: "asset", opening: 0 };
    setList([...list, newAcct]);
    setEditIdx(list.length);
  };

  const inputS = { width: "100%", background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 9, padding: "8px 11px", color: T.ink, fontSize: 13, fontFamily: T.body, outline: "none" };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.45)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 24 }}>
      <div className="lg-modal" onClick={(e) => e.stopPropagation()} style={{ width: 480, maxHeight: "84vh", overflowY: "auto", background: T.panelSolid, border: `1px solid ${T.line}`, borderRadius: 20, padding: 26, boxShadow: T.shadowLg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.gold}18`, display: "grid", placeItems: "center" }}><Wallet size={16} color={T.goldDeep} /></div>
            <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 800 }}>Accounts</div>
          </div>
          <button onClick={onClose} className="lg-btn" style={{ background: T.panel2, border: "none", borderRadius: 9, padding: 8, cursor: "pointer", color: T.sub }}><X size={16} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {list.map((a, i) => {
            const col = providerColor(a.provider);
            const isEdit = editIdx === i;
            return (
              <div key={a.id} style={{ background: T.panel2, borderRadius: 12, border: isEdit ? `1.5px solid ${T.gold}50` : `1px solid ${T.line}`, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer" }} onClick={() => setEditIdx(isEdit ? null : i)}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${col}18`, display: "grid", placeItems: "center", color: col, fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{(a.provider || a.name)[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 10.5, color: T.faint }}>{a.provider} · {a.kind === "liability" ? "Liability" : "Asset"} · Opening: {fmtIDR(a.opening || 0)}</div>
                  </div>
                  <ChevronDown size={14} color={T.faint} style={{ transform: isEdit ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </div>
                {isEdit && (
                  <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8, borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><div style={{ fontSize: 10, color: T.faint, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Account name</div>
                        <input style={inputS} value={a.name} onChange={(e) => setList(list.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></div>
                      <div><div style={{ fontSize: 10, color: T.faint, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Provider</div>
                        <select style={{ ...inputS, cursor: "pointer" }} value={a.provider} onChange={(e) => setList(list.map((x, j) => j === i ? { ...x, provider: e.target.value } : x))}>
                          {providers.map((p) => <option key={p}>{p}</option>)}</select></div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div><div style={{ fontSize: 10, color: T.faint, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Type</div>
                        <select style={{ ...inputS, cursor: "pointer" }} value={a.kind || "asset"} onChange={(e) => setList(list.map((x, j) => j === i ? { ...x, kind: e.target.value } : x))}>
                          <option value="asset">Asset</option><option value="liability">Liability</option></select></div>
                      <div><div style={{ fontSize: 10, color: T.faint, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Opening balance</div>
                        <input style={inputS} inputMode="numeric" value={a.opening ? Number(a.opening).toLocaleString("id-ID") : ""} placeholder="0"
                          onChange={(e) => setList(list.map((x, j) => j === i ? { ...x, opening: +(e.target.value.replace(/\D/g, "")) } : x))} /></div>
                    </div>
                    <button onClick={() => { setList(list.filter((_, j) => j !== i)); setEditIdx(null); }} className="lg-btn"
                      style={{ padding: "6px", borderRadius: 8, background: "transparent", border: `1px solid ${T.line}`, color: T.red, cursor: "pointer", fontSize: 12, fontFamily: T.body }}>Remove account</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={addAccount} className="lg-btn" style={{ width: "100%", padding: "10px", borderRadius: 11, border: `1px dashed ${T.line}`, background: "transparent", color: T.faint, cursor: "pointer", fontFamily: T.body, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 12 }}>
          <Plus size={14} /> Add account
        </button>

        <button onClick={() => onSave(list)} className="lg-btn" style={{ width: "100%", padding: 14, borderRadius: 13, background: `linear-gradient(145deg, ${T.gold2}, ${T.gold} 55%, ${T.goldDeep})`, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: T.body }}>Save accounts</button>
      </div>
    </div>
  );
}

function CategoryManager({ cats, onClose, onSave }) {
  const [list, setList] = useState(cats || []);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("expense");
  const [editIdx, setEditIdx] = useState(null);
  const [editName, setEditName] = useState("");

  const save = () => { onSave(list); onClose(); };

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.45)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", padding: 24 }}>
      <div className="lg-modal" onClick={(e) => e.stopPropagation()} style={{ width: 460, maxHeight: "82vh", overflowY: "auto", background: T.panelSolid, border: `1px solid ${T.line}`, borderRadius: 20, padding: 26, boxShadow: "0 24px 64px rgba(17,24,39,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.gold}18`, display: "grid", placeItems: "center" }}><Tag size={16} color={T.goldDeep} /></div>
            <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 800 }}>Categories</div>
          </div>
          <button onClick={onClose} className="lg-btn" style={{ background: T.panel2, border: "none", borderRadius: 9, padding: 8, cursor: "pointer", color: T.sub }}><X size={16} /></button>
        </div>

        {/* Add new */}
        <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category name…"
            style={{ flex: 1, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 11, padding: "10px 13px", color: T.ink, fontSize: 14, fontFamily: T.body, outline: "none" }}
            onKeyDown={(e) => e.key === "Enter" && newName.trim() && (setList([...list, { name: newName.trim(), type: newType }]), setNewName(""))} />
          <div style={{ display: "flex", background: T.panel2, borderRadius: 11, padding: 3, gap: 2, border: `1px solid ${T.line}` }}>
            {["expense", "income"].map((tp) => (
              <button key={tp} onClick={() => setNewType(tp)} className="lg-btn"
                style={{ padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: T.mono, fontSize: 11, fontWeight: 600, background: newType === tp ? T.ink : "transparent", color: newType === tp ? T.bg : T.sub }}>{tp}</button>
            ))}
          </div>
          <button onClick={() => { if (!newName.trim()) return; setList([...list, { name: newName.trim(), type: newType }]); setNewName(""); }} className="lg-btn"
            style={{ background: `linear-gradient(145deg, ${T.gold2}, ${T.gold})`, border: "none", borderRadius: 11, padding: "0 16px", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 14 }}>+</button>
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[{ label: "EXPENSE", type: "expense" }, { label: "INCOME", type: "income" }].map(({ label, type }) => (
            <div key={type}>
              <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700, padding: "8px 4px 5px" }}>{label}</div>
              {list.filter((c) => c.type === type).map((cat, idx) => {
                const absIdx = list.indexOf(cat);
                return (
                  <div key={absIdx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: T.panel2, borderRadius: 10, marginBottom: 4 }}>
                    {editIdx === absIdx ? (
                      <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { setList(list.map((c, i) => i === absIdx ? { ...c, name: editName } : c)); setEditIdx(null); } if (e.key === "Escape") setEditIdx(null); }}
                        onBlur={() => { if (editName.trim()) setList(list.map((c, i) => i === absIdx ? { ...c, name: editName } : c)); setEditIdx(null); }}
                        style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 13.5, fontFamily: T.body, color: T.ink }} />
                    ) : (
                      <span onClick={() => { setEditIdx(absIdx); setEditName(cat.name); }} style={{ flex: 1, fontSize: 13.5, cursor: "text" }}>{cat.name}</span>
                    )}
                    <span style={{ fontSize: 11, color: T.faint, fontFamily: T.mono }}>{type === "expense" ? "↓" : "↑"}</span>
                    <button onClick={() => setList(list.filter((_, i) => i !== absIdx))} className="lg-btn"
                      style={{ background: "none", border: "none", cursor: "pointer", color: T.faint, padding: 3, display: "grid", borderRadius: 6 }}><X size={13} /></button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <button onClick={save} className="lg-btn" style={{ width: "100%", marginTop: 16, padding: 14, borderRadius: 13, background: `linear-gradient(145deg, ${T.gold2}, ${T.gold} 55%, ${T.goldDeep})`, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: T.body }}>Save categories</button>
      </div>
    </div>
  );
}

function FilterBar({ q, setQ, f, setF, onFilter, count, chips, onClearAll, onExport, placeholder }) {
  const isDesk = typeof window !== "undefined" && window.innerWidth >= 900;
  const typeOpts = [
    { k: "all",      l: "All",      icon: null,              active: { bg: T.ink,              color: T.bg,      border: T.ink } },
    { k: "income",   l: "Income",   icon: <ArrowUpRight size={13} />,  active: { bg: `${T.green}1a`,    color: T.greenDeep, border: `${T.green}40` } },
    { k: "expense",  l: "Expense",  icon: <ArrowDownRight size={13} />, active: { bg: `${T.red}16`,     color: T.red,       border: `${T.red}40` } },
    { k: "transfer", l: "Transfer", icon: <ArrowLeftRight size={13} />, active: { bg: `${T.gold}18`,   color: T.goldDeep,  border: `${T.gold}45` } },
  ];
  const hasActive = count > 0;

  return (
    <div style={{ marginBottom: 18 }}>

      {/* Row 1: Search + Export */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          background: T.panelSolid, border: `1px solid ${q ? T.gold + "60" : T.line}`,
          borderRadius: 13, padding: "0 14px",
          boxShadow: q ? `0 0 0 3px ${T.gold}16` : "0 1px 3px rgba(17,24,39,0.05)",
          transition: "border-color .15s, box-shadow .15s",
        }}>
          <Search size={16} color={q ? T.gold : T.faint} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: T.ink, fontSize: 14, fontFamily: T.body, padding: "12px 0" }} />
          {q && <button onClick={() => setQ("")} className="lg-btn"
            style={{ background: T.panel2, border: "none", cursor: "pointer", color: T.sub, padding: "3px 5px", borderRadius: 6, display: "grid", lineHeight: 1 }}><X size={13} /></button>}
        </div>
        {onExport && (
          <button onClick={onExport} className="lg-btn" title="Export to Excel"
            style={{ display: "grid", placeItems: "center", background: T.panelSolid, border: `1px solid ${T.line}`, color: T.sub, borderRadius: 12, padding: "0 13px", cursor: "pointer" }}>
            <Download size={15} />
          </button>
        )}
      </div>

      {/* Row 2: Type quick-chips + Filters button */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {f && setF && (
          <div style={{ display: "flex", gap: 4, background: T.panel2, borderRadius: 99, padding: "3px" }}>
            {typeOpts.map(({ k, l, icon, active }) => {
              const on = f.type === k;
              return (
                <button key={k} onClick={() => setF({ ...f, type: k })} className="lg-btn"
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "6px 12px",
                    borderRadius: 99, border: `1px solid ${on ? active.border : "transparent"}`,
                    background: on ? active.bg : "transparent",
                    color: on ? active.color : T.faint,
                    cursor: "pointer", fontSize: 12, fontWeight: on ? 700 : 500, fontFamily: T.body,
                    transition: "all .15s ease", whiteSpace: "nowrap",
                  }}>{icon}{l}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 7, alignItems: "center" }}>
          {hasActive && (
            <span style={{ fontSize: 11.5, color: T.sub, fontFamily: T.mono, fontWeight: 500 }}>
              {chips.filter((c) => c.k !== "q").length} filter{chips.filter((c) => c.k !== "q").length !== 1 ? "s" : ""} active
            </span>
          )}
          <button onClick={onFilter} className="lg-btn"
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: isDesk ? "8px 14px" : "8px 12px",
              borderRadius: 11, cursor: "pointer",
              fontFamily: T.body, fontSize: 13, fontWeight: 600,
              border: hasActive ? `1.5px solid ${T.gold}` : `1px solid ${T.line}`,
              background: hasActive
                ? `linear-gradient(135deg, ${T.gold2}1a, ${T.gold}22)`
                : T.panelSolid,
              color: hasActive ? T.goldDeep : T.sub,
              boxShadow: hasActive ? `0 0 0 3px ${T.gold}16, 0 2px 8px ${T.gold}20` : "none",
              transition: "all .18s ease",
            }}>
            <SlidersHorizontal size={14} strokeWidth={hasActive ? 2.2 : 1.8} />
            {isDesk ? "Filters" : ""}
            {count > 0 && (
              <span style={{
                background: T.gold, color: "#fff", borderRadius: 20,
                fontSize: 10.5, fontWeight: 700, padding: "1px 6px", lineHeight: 1.5,
                boxShadow: `0 0 8px ${T.gold}40`,
              }}>{count}</span>
            )}
          </button>
        </div>
      </div>

      {/* Row 3: Active chips (non-type, since type is handled by quick row) */}
      {chips.filter((c) => c.k !== "q" && c.k !== "type").length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, alignItems: "center", paddingTop: 10, borderTop: `1px dashed ${T.line}` }}>
          <span style={{ fontSize: 11, color: T.faint, fontWeight: 600, letterSpacing: 0.2 }}>Active:</span>
          {chips.filter((c) => c.k !== "type").map((c) => (
            <button key={c.k} onClick={c.clear} className="lg-btn"
              style={{
                display: "flex", alignItems: "center", gap: 5,
                background: `${T.gold}12`, border: `1px solid ${T.gold}35`,
                color: T.goldDeep, borderRadius: 8, padding: "4px 9px",
                cursor: "pointer", fontSize: 12, fontFamily: T.body, fontWeight: 500,
              }}>
              {c.label} <X size={11} strokeWidth={2.4} />
            </button>
          ))}
          <button onClick={onClearAll} className="lg-btn"
            style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", fontSize: 11.5, fontFamily: T.body, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 2 }}>
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function ChartRangeBar({ range, setRange, from, setFrom, to, setTo, opts }) {
  const iS = { flex: 1, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 10, padding: "9px 12px", color: T.ink, fontSize: 13, fontFamily: T.body, outline: "none", colorScheme: T.ink === "#14161c" ? "light" : "dark" };
  return (
    <div>
      <div style={{ display: "flex", background: T.panel2, borderRadius: 12, padding: "3px", gap: 2, border: `1px solid ${T.line}` }}>
        {opts.map((o) => {
          const on = range === o.k;
          return (
            <button key={o.k} onClick={() => setRange(o.k)} className="lg-btn"
              style={{ flex: 1, padding: "6px 4px", borderRadius: 9, border: on ? `1px solid ${T.gold}30` : "1px solid transparent", cursor: "pointer", fontFamily: T.body, fontSize: 11.5, fontWeight: on ? 700 : 500,
                background: on ? `linear-gradient(145deg, ${T.gold}22, ${T.gold}12)` : "transparent",
                color: on ? T.gold : T.sub, transition: "all .16s ease",
                boxShadow: on ? `0 1px 3px ${T.gold}20` : "none" }}>
              {o.l}
            </button>
          );
        })}
      </div>
      {range === "custom" && (
        <div className="lg-pop" style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.faint, marginBottom: 5, fontWeight: 600 }}>From</div>
            <input type="date" style={iS} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.faint, marginBottom: 5, fontWeight: 600 }}>To</div>
            <input type="date" style={iS} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}



function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick} className="lg-btn"
      style={{ padding: "7px 14px", borderRadius: 99, border: `1px solid ${on ? T.gold : T.line}`,
        background: on ? `${T.gold}1a` : "transparent", color: on ? T.gold : T.sub,
        cursor: "pointer", fontWeight: on ? 600 : 500, fontSize: 12.5, fontFamily: T.body,
        textTransform: "capitalize", letterSpacing: 0.1,
        boxShadow: on ? `0 0 12px ${T.gold}18` : "none", transition: "all .15s ease" }}>
      {children}
    </button>
  );
}

function FilterSheet({ tab, f, setF, cats, accts, onClose, onReset }) {
  const isDesk = typeof window !== "undefined" && window.innerWidth >= 900;
  const inputS = { flex: 1, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 11, padding: "10px 13px", color: T.ink, fontSize: 14, fontFamily: T.body, outline: "none", width: "100%", colorScheme: T.ink === "#14161c" ? "light" : "dark" };
  const dragY = useRef(0);

  const toggle = (key, val) => setF({ ...f, [key]: f[key].includes(val) ? f[key].filter((x) => x !== val) : [...f[key], val] });

  const Section = ({ label, icon, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        {icon && <span style={{ color: T.faint }}>{icon}</span>}
        <span style={{ fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700, color: T.faint }}>{label}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>{children}</div>
    </div>
  );

  const PillChip = ({ on, onClick, children, color }) => (
    <button onClick={onClick} className="lg-btn" style={{
      padding: "7px 13px", borderRadius: 10, cursor: "pointer", fontFamily: T.body, fontWeight: on ? 600 : 500, fontSize: 13,
      border: `1px solid ${on ? (color || T.gold) + "55" : T.line}`,
      background: on ? `${color || T.gold}18` : T.panel2,
      color: on ? (color || T.goldDeep) : T.sub,
      transition: "all .15s",
    }}>{children}</button>
  );

  const sortIcons = { newest: "↓ Newest", oldest: "↑ Oldest", high: "↑ Highest", low: "↓ Lowest" };

  const sheetContent = (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.gold}18`, border: `1px solid ${T.gold}30`, display: "grid", placeItems: "center" }}>
            <SlidersHorizontal size={15} color={T.goldDeep} strokeWidth={2} />
          </div>
          <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 800 }}>Filters</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onReset} className="lg-btn" style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 9, padding: "6px 12px", cursor: "pointer", color: T.sub, fontSize: 12.5, fontFamily: T.body, fontWeight: 500 }}>Reset all</button>
          <button onClick={onClose} className="lg-btn" style={{ background: T.panel2, border: "none", borderRadius: 9, padding: 8, cursor: "pointer", color: T.sub, display: "grid", placeItems: "center" }}><X size={16} /></button>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${T.line}`, marginBottom: 20 }} />

      {/* ─── TRANSACTION FILTERS ─── */}
      {tab === "txn" && (<>
        <Section label="Transaction type" icon={<ArrowLeftRight size={13} />}>
          {[
            { v: "all", l: "All types" },
            { v: "income",   l: "Income",   col: T.greenDeep,  bg: T.green },
            { v: "expense",  l: "Expense",  col: T.red,        bg: T.red },
            { v: "transfer", l: "Transfer", col: T.goldDeep,   bg: T.gold },
          ].map(({ v, l, col, bg }) => (
            <PillChip key={v} on={f.type === v} onClick={() => setF({ ...f, type: v })} color={bg}>{l}</PillChip>
          ))}
        </Section>

        <Section label="Date range" icon={<Calendar size={13} />}>
          {[["all","All time"],["today","Today"],["7d","Last 7d"],["30d","Last 30d"],["month","This month"],["custom","Custom range"]].map(([v,l]) => (
            <PillChip key={v} on={f.range === v} onClick={() => setF({ ...f, range: v })}>{l}</PillChip>
          ))}
        </Section>
        {f.range === "custom" && (
          <div className="lg-pop" style={{ display: "flex", gap: 10, marginTop: -12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.faint, marginBottom: 5 }}>From</div>
              <input type="date" style={inputS} value={f.from} max={f.to || undefined} onChange={(e) => setF({ ...f, from: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.faint, marginBottom: 5 }}>To</div>
              <input type="date" style={inputS} value={f.to} min={f.from || undefined} onChange={(e) => setF({ ...f, to: e.target.value })} />
            </div>
          </div>
        )}

        {cats.length > 0 && (
          <Section label="Category" icon={<Tag size={13} />}>
            {cats.map((c) => <PillChip key={c} on={f.cats.includes(c)} onClick={() => toggle("cats", c)}>{c}</PillChip>)}
          </Section>
        )}

        {accts.length > 0 && (
          <Section label="Account" icon={<Wallet size={13} />}>
            {accts.map((a) => <PillChip key={a} on={f.accts.includes(a)} onClick={() => toggle("accts", a)}>{a}</PillChip>)}
          </Section>
        )}

        <Section label="Amount range" icon={<ArrowUpRight size={13} />}>
          <div style={{ display: "flex", gap: 9, width: "100%" }}>
            <input style={inputS} placeholder="Min (Rp)" inputMode="numeric" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value.replace(/\D/g, "") })} />
            <input style={inputS} placeholder="Max (Rp)" inputMode="numeric" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value.replace(/\D/g, "") })} />
          </div>
        </Section>

        <Section label="Sort by">
          {Object.entries(sortIcons).map(([v, l]) => (
            <PillChip key={v} on={f.sort === v} onClick={() => setF({ ...f, sort: v })}>{l}</PillChip>
          ))}
        </Section>
      </>)}

      {/* ─── SUBSCRIPTION FILTERS ─── */}
      {tab === "sub" && (<>
        <Section label="Billing cycle">
          {["all","monthly","yearly"].map((v) => <PillChip key={v} on={f.type === v} onClick={() => setF({ ...f, type: v })}>{v === "all" ? "All cycles" : v.charAt(0).toUpperCase() + v.slice(1)}</PillChip>)}
        </Section>
        <Section label="Account" icon={<Wallet size={13} />}>
          {accts.map((a) => <PillChip key={a} on={f.accts.includes(a)} onClick={() => toggle("accts", a)}>{a}</PillChip>)}
        </Section>
        <Section label="Sort by">
          {[["newest","Renewal date"],["high","Highest cost"],["low","Lowest cost"]].map(([v,l]) => (
            <PillChip key={v} on={f.sort === v} onClick={() => setF({ ...f, sort: v })}>{l}</PillChip>
          ))}
        </Section>
      </>)}

      {/* ─── INVESTMENT FILTERS ─── */}
      {tab === "inv" && (<>
        <Section label="Platform" icon={<Building2 size={13} />}>
          {["all","Stockbit","Bybit","Pluang","Bibit","Binance"].map((v) => (
            <PillChip key={v} on={f.platform === v} onClick={() => setF({ ...f, platform: v })}>{v === "all" ? "All platforms" : v}</PillChip>
          ))}
        </Section>
        <Section label="Asset type">
          {[["all","All types"],["stock","Stocks"],["crypto","Crypto"],["mutual_fund","Reksa Dana"],["gold","Gold"]].map(([v,l]) => (
            <PillChip key={v} on={f.asset === v} onClick={() => setF({ ...f, asset: v })}>{l}</PillChip>
          ))}
        </Section>
        <Section label="Performance">
          {[["all","All"],["gain","Gainers 🟢"],["loss","Losers 🔴"]].map(([v,l]) => (
            <PillChip key={v} on={f.pl === v} onClick={() => setF({ ...f, pl: v })}>{l}</PillChip>
          ))}
        </Section>
      </>)}

      {/* Apply button */}
      <div style={{ marginTop: 6 }}>
        <button onClick={onClose} className="lg-btn"
          style={{ width: "100%", padding: "14px", borderRadius: 13, background: `linear-gradient(145deg, ${T.gold2}, ${T.gold} 55%, ${T.goldDeep})`, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: T.body, boxShadow: `0 4px 16px ${T.gold}30` }}>
          Show results
        </button>
      </div>
    </>
  );

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.45)", zIndex: 30, display: "flex", alignItems: isDesk ? "center" : "flex-end", justifyContent: isDesk ? "flex-end" : "center", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}>
      <div className="lg-pop" onClick={(e) => e.stopPropagation()} style={isDesk ? {
        width: 400, height: "100%", overflowY: "auto", background: T.panelSolid,
        borderLeft: `1px solid ${T.line}`, padding: "28px 28px 32px",
        boxShadow: "-20px 0 60px rgba(17,24,39,0.25)",
        animation: "slideInRight .22s cubic-bezier(0.34,1.1,0.64,1)",
      } : {
        width: "100%", maxHeight: "88vh", overflowY: "auto", background: T.panelSolid,
        borderTop: `1px solid ${T.line}`, borderRadius: "24px 24px 0 0", padding: "8px 22px 28px",
        boxShadow: "0 -20px 60px rgba(17,24,39,0.25)",
      }}>
        {!isDesk && (
          <div onTouchStart={(e) => { dragY.current = e.touches[0].clientY; }}
            onTouchMove={(e) => { if (e.touches[0].clientY - dragY.current > 72) onClose(); }}
            style={{ width: "100%", padding: "6px 0 12px", display: "flex", justifyContent: "center", cursor: "grab", touchAction: "none" }}>
            <div style={{ width: 38, height: 4, borderRadius: 4, background: T.lineSolid }} />
          </div>
        )}
        {sheetContent}
      </div>
    </div>
  );
}

function Header({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: T.display, fontSize: 25, fontWeight: 800, letterSpacing: -0.6 }}>{title}</div>
      <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function TxnRow({ t, full, onClick }) {
  const isTransfer = t.type === "transfer";
  const inc = t.type === "income";
  const iconBg = isTransfer ? `${T.gold}1c` : inc ? `${T.green}1c` : `${T.red}1c`;
  const iconCol = isTransfer ? T.goldDeep : inc ? T.greenDeep : T.red;
  return (
    <div onClick={onClick} className="lg-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 8px", cursor: onClick ? "pointer" : "default", borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0, flex: 1 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: iconBg, display: "grid", placeItems: "center", color: iconCol, flexShrink: 0 }}>
          {isTransfer ? <ArrowLeftRight size={16} /> : inc ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t.note}
            {t.recurring && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 5, background: `${T.gold}1c`, color: T.goldDeep, letterSpacing: 0.3, textTransform: "uppercase", flexShrink: 0 }}>↻ {t.recurring}</span>}
          </div>
          <div style={{ fontSize: 11, color: T.faint, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {isTransfer ? `${t.acct} → ${t.toAcct || "?"}` : `${t.cat} · ${t.acct}`}{full ? " · " + t.date : ""}
          </div>
        </div>
      </div>
      <Money v={isTransfer ? t.amount : inc ? t.amount : -t.amount} sign={!isTransfer} color={isTransfer ? T.goldDeep : inc ? T.greenDeep : T.ink} />
    </div>
  );
}

function AddModal({ kind, accounts, initial, isDesktop, invTxns = [], realizedByHolding = {}, transactions = [], categories = [], onOpenTrade, onClose, onSave, onDelete }) {
  const editing = !!initial;
  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [cat, setCat] = useState(initial?.cat || "Food");
  const [acct, setAcct] = useState(initial?.acct || accounts[0]?.name || "");
  const [toAcct, setToAcct] = useState(initial?.toAcct || accounts[1]?.name || "");
  const [note, setNote] = useState(initial?.note || "");
  const [date, setDate] = useState(initial?.date || todayISO());
  const [dateMode, setDateMode] = useState(initial && initial.date !== todayISO() ? "custom" : "today");
  const [recurring, setRecurring] = useState(initial?.recurring || null); // null | "monthly" | "weekly"
  const [merchant, setMerchant] = useState(initial?.merchant || "");
  const [cycle, setCycle] = useState(initial?.cycle || "monthly");
  const [nextRenewal, setNextRenewal] = useState(initial?.next || daysFromNow(30));
  const [ticker, setTicker] = useState(initial?.ticker || "");
  const [platform, setPlatform] = useState(initial?.platform || "Stockbit");
  const [qty, setQty] = useState(initial?.qty ? String(initial.qty) : "");
  const [avg, setAvg] = useState(initial?.avg ? String(initial.avg) : "");
  const [goalName, setGoalName] = useState(initial?.name || "");
  const [goalTarget, setGoalTarget] = useState(initial?.target ? String(initial.target) : "");
  const [goalCurrent, setGoalCurrent] = useState(initial?.current ? String(initial.current) : "");
  const [goalDeadline, setGoalDeadline] = useState(initial?.deadline || daysFromNow(180));
  const [goalKind, setGoalKind] = useState(initial?.kind || "save");
  const [goalLinks, setGoalLinks] = useState(initial?.linkedAccounts || []);
  // Trade (buy/sell/dividend) state
  const [tradeType, setTradeType] = useState("buy");
  const [tradeQty, setTradeQty] = useState("");
  const [tradePrice, setTradePrice] = useState("");
  const [tradeFees, setTradeFees] = useState("");
  const [tradeDate, setTradeDate] = useState(todayISO());
  const [tradeNote, setTradeNote] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inputS = { width: "100%", background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 11, padding: "11px 13px", color: T.ink, fontSize: 14.5, fontFamily: T.body, outline: "none", transition: "border-color .15s ease, box-shadow .15s ease", colorScheme: T.ink === "#14161c" ? "light" : "dark" };
  const titleMap = {
    txn: editing ? "Edit Transaction" : "Add Transaction",
    sub: editing ? "Edit Subscription" : "Add Subscription",
    hold: editing ? "Edit Holding" : "Add Holding",
    goal: editing ? "Edit Goal" : "Add Goal",
    budget: editing ? "Edit Budget" : "Set Budget",
    holdDetail: initial ? `${initial.ticker} · ${initial.platform}` : "Holding",
    trade: editing ? "Edit Trade" : "Log Trade",
  };
  const fieldLabel = { fontSize: 10.5, fontWeight: 700, color: T.faint, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 5, display: "block" };

  const relLabel = (() => {
    const d = Math.round((new Date(date + "T00:00:00") - new Date(todayISO() + "T00:00:00")) / 864e5);
    if (Number.isNaN(d)) return "";
    if (d === 0) return "Today";
    if (d === -1) return "Yesterday";
    if (d === 1) return "Tomorrow";
    return d < 0 ? `${-d} days ago` : `in ${d} days`;
  })();
  const catSuggest = type === "income"
    ? ["Salary", "Freelance", "AdSense", "Investment", "Gift", "Refund"]
    : ["Food", "Transport", "Bills", "Shopping", "Subscriptions", "Health", "Entertainment"];

  const submit = () => {
    if (kind === "txn") {
      if (!amount || +amount <= 0) return; // amount must be positive
      if (type === "transfer") {
        if (!acct || !toAcct || acct === toAcct) return;
        onSave({ type: "transfer", amount: +amount, cat: "Transfer", acct, toAcct, note: note || `Transfer to ${toAcct}`, date: date || todayISO(), recurring });
      } else {
        onSave({ type, amount: +amount, cat: cat || (type === "income" ? "Income" : "Expense"), acct, note: note || cat, date: date || todayISO(), recurring });
      }
    }
    else if (kind === "sub") { if (!merchant || !amount || +amount <= 0) return; onSave({ merchant, amount: +amount, cycle, acct, next: nextRenewal || daysFromNow(30) }); }
    else if (kind === "goal") { if (!goalName || !goalTarget || +goalTarget <= 0) return; onSave({ name: goalName, target: +goalTarget, current: +(goalCurrent || 0), deadline: goalDeadline || daysFromNow(180), kind: goalKind, linkedAccounts: goalLinks }); }
    else if (kind === "budget") { if (!cat || !amount || +amount <= 0) return; onSave({ cat, monthly: +amount, id: initial?.id || "b" + Date.now() }); }
    else if (kind === "trade") {
      if (tradeType !== "dividend" && (!tradeQty || +tradeQty <= 0 || !tradePrice || +tradePrice <= 0)) return;
      if (tradeType === "dividend" && (!tradePrice || +tradePrice <= 0)) return;
      onSave({ type: tradeType, qty: +(tradeQty || 0), price: +tradePrice, fees: +(tradeFees || 0), date: tradeDate || todayISO(), note: tradeNote });
    }
    else {
      if (!ticker || !qty || !avg) return;
      const meta = {
        Stockbit: { type: "stock",       ccy: "IDR" },
        Bybit:    { type: "crypto",      ccy: "USD" },
        Binance:  { type: "crypto",      ccy: "USD" },
        Pluang:   { type: "stock",       ccy: "USD" },
        Bibit:    { type: "mutual_fund", ccy: "IDR" },
      };
      const { type: assetType, ccy } = meta[platform] || { type: "stock", ccy: "IDR" };
      onSave({ platform, ticker: ticker.toUpperCase(), type: assetType, qty: +qty, avg: +avg, price: +avg, ccy });
    }
  };

  const sheetRef = useRef(null);
  const dragState = useRef({ startY: 0, active: false });

  const onDragStart = (e) => {
    dragState.current = { startY: e.touches[0].clientY, active: true };
  };
  const onDragMove = (e) => {
    if (!dragState.current.active) return;
    if (e.touches[0].clientY - dragState.current.startY > 72) { onClose(); dragState.current.active = false; }
  };
  const onDragEnd = () => { dragState.current.active = false; };

  // ⌘↵ submits the form
  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [amount, type, cat, acct, note, date, recurring, merchant, cycle, goalName, goalTarget]);

  return (
    <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.45)", zIndex: 30, display: "flex", alignItems: isDesktop ? "center" : "flex-end", justifyContent: "center", backdropFilter: "blur(3px)", padding: isDesktop ? 24 : 0 }}>
      <div ref={sheetRef} className="lg-pop lg-modal" onClick={(e) => e.stopPropagation()} style={isDesktop ? {
        width: 500, maxWidth: "100%", maxHeight: "86vh", overflowY: "auto",
        background: T.panelSolid, border: `1px solid ${T.line}`, borderRadius: 18, padding: 28,
        boxShadow: "0 20px 60px rgba(17,24,39,0.35), 0 1px 0 rgba(255,255,255,0.04) inset"
      } : {
        width: "100%", maxHeight: "90vh", overflowY: "auto",
        background: T.panelSolid, borderTop: `1px solid ${T.line}`, borderRadius: "24px 24px 0 0", padding: 22,
        boxShadow: "0 -20px 60px rgba(17,24,39,0.25)"
      }}>
        {!isDesktop && (
          <div onTouchStart={onDragStart} onTouchMove={onDragMove} onTouchEnd={onDragEnd}
            style={{ width: "100%", padding: "6px 0 12px", display: "flex", justifyContent: "center", cursor: "grab", touchAction: "none", marginTop: -6 }}>
            <div style={{ width: 38, height: 4, borderRadius: 4, background: T.lineSolid }} />
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontFamily: T.display, fontSize: isDesktop ? 20 : 19, fontWeight: 800, letterSpacing: -0.4 }}>{titleMap[kind]}</div>
          <button onClick={onClose} className="lg-btn" style={{ background: T.panel2, border: "none", borderRadius: 9, padding: 7, cursor: "pointer", color: T.sub, display: "grid", placeItems: "center" }}><X size={16} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {kind === "txn" && (<>
            {/* Type selector — prominent tabs */}
            <div style={{ display: "flex", gap: 5, background: T.panel2, borderRadius: 14, padding: "4px" }}>
              {[
                { k: "expense",  l: "Expense",  icon: <ArrowDownRight size={15} />, col: T.red },
                { k: "income",   l: "Income",   icon: <ArrowUpRight size={15} />,   col: T.greenDeep },
                { k: "transfer", l: "Transfer", icon: <ArrowLeftRight size={15} />, col: T.goldDeep },
              ].map(({ k, l, icon, col }) => {
                const on = type === k;
                return (
                  <button key={k} onClick={() => { setType(k); if (k !== "transfer") setCat(k === "income" ? "Salary" : "Food"); }} className="lg-btn"
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "10px 6px", borderRadius: 10, border: "none",
                      background: on ? col : "transparent",
                      color: on ? "#fff" : T.faint,
                      cursor: "pointer", fontWeight: on ? 700 : 500, fontSize: 13, fontFamily: T.body,
                      boxShadow: on ? `0 4px 16px ${col}35` : "none",
                      transition: "all .16s ease" }}>
                    {icon}{l}
                  </button>
                );
              })}
            </div>

            {/* Big amount display */}
            <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
              <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>
                {DISPLAY === "USD" ? "Amount (USD)" : "Amount (IDR)"}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, position: "relative" }}>
                <span style={{ fontSize: 24, fontWeight: 400, color: T.faint, fontFamily: T.mono, alignSelf: "flex-start", paddingTop: 6 }}>{DISPLAY === "USD" ? "$" : "Rp"}</span>
                <input
                  inputMode="numeric" placeholder="0"
                  value={amount ? (+amount).toLocaleString("id-ID") : ""}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  style={{ fontSize: 48, fontWeight: 800, fontFamily: T.display, letterSpacing: -2,
                    width: "100%", maxWidth: 280, textAlign: "center", background: "none",
                    border: "none", outline: "none",
                    color: type === "income" ? T.greenDeep : type === "transfer" ? T.goldDeep : T.ink }} />
              </div>
              <div style={{ height: 2, background: T.line, borderRadius: 1, margin: "6px auto 0", width: 80 }}>
                <div style={{ height: "100%", borderRadius: 1, background: type === "income" ? T.greenDeep : type === "transfer" ? T.goldDeep : T.gold, transition: "width .3s ease", width: amount ? "100%" : "0%" }} />
              </div>
            </div>

            {/* Date */}
            <div>
              <div style={{ ...fieldLabel, display: "flex", justifyContent: "space-between" }}>
                <span>Date</span>
                <span style={{ color: T.goldDeep, textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>{relLabel}</span>
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={() => { setDateMode("today"); setDate(todayISO()); }} className="lg-btn"
                  style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1px solid ${dateMode === "today" ? T.gold : T.line}`, background: dateMode === "today" ? `${T.gold}18` : T.panel2, color: dateMode === "today" ? T.goldDeep : T.sub, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: T.body }}>Today</button>
                <button onClick={() => setDateMode("custom")} className="lg-btn"
                  style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1px solid ${dateMode === "custom" ? T.gold : T.line}`, background: dateMode === "custom" ? `${T.gold}18` : T.panel2, color: dateMode === "custom" ? T.goldDeep : T.sub, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: T.body }}>Custom</button>
              </div>
              {dateMode === "custom" && <input type="date" style={{ ...inputS, marginTop: 8 }} value={date} onChange={(e) => setDate(e.target.value)} />}
            </div>

            {/* Category — color chips */}
            {type !== "transfer" && (
              <div>
                <div style={fieldLabel}>Category</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {catSuggest.map((c) => {
                    const on = cat === c; const col = catColor(c);
                    return (
                      <button key={c} onClick={() => setCat(c)} className="lg-btn"
                        style={{ padding: "6px 12px", borderRadius: 99,
                          border: `1.5px solid ${on ? col : T.line}`,
                          background: on ? `${col}18` : "transparent",
                          color: on ? col : T.sub,
                          cursor: "pointer", fontSize: 12.5, fontFamily: T.body, fontWeight: on ? 700 : 500,
                          transition: "all .14s ease" }}>
                        {c}
                      </button>
                    );
                  })}
                </div>
                <input style={{ ...inputS, fontSize: 13 }} placeholder="Or type a custom category…" value={cat} onChange={(e) => setCat(e.target.value)} />
              </div>
            )}

            {/* Account */}
            {type === "transfer" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={fieldLabel}>From</div>
                  <select style={inputS} value={acct} onChange={(e) => setAcct(e.target.value)}>{accounts.map((a) => <option key={a.id} style={{ background: T.panelSolid }}>{a.name}</option>)}</select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={fieldLabel}>To</div>
                  <select style={inputS} value={toAcct} onChange={(e) => setToAcct(e.target.value)}>{accounts.map((a) => <option key={a.id} style={{ background: T.panelSolid }}>{a.name}</option>)}</select>
                </div>
              </div>
            ) : (
              <div>
                <div style={fieldLabel}>Account</div>
                <select style={inputS} value={acct} onChange={(e) => setAcct(e.target.value)}>{accounts.map((a) => <option key={a.id} style={{ background: T.panelSolid }}>{a.name}</option>)}</select>
              </div>
            )}

            <div>
              <div style={fieldLabel}>Note</div>
              <input style={inputS} placeholder={type === "income" ? "e.g. Client invoice #102" : type === "transfer" ? "e.g. Top up Jenius for groceries" : "e.g. Groceries at Superindo"} value={note} onChange={(e) => setNote(e.target.value)} />
              {(() => {
                if (!note || note.length < 3 || kind !== "txn" || type === "transfer" || !!initial) return null;
                const lower = note.toLowerCase();
                const matches = transactions.filter((t) => t.note && t.note.toLowerCase().includes(lower) && t.cat && t.cat !== cat);
                if (!matches.length) return null;
                const counts = {}; matches.forEach((t) => { counts[t.cat] = (counts[t.cat] || 0) + 1; });
                const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
                if (!top) return null;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12 }}>
                    <span style={{ color: T.faint }}>Suggest:</span>
                    <button onClick={() => setCat(top)} className="lg-btn"
                      style={{ background: `${T.gold}18`, border: `1px solid ${T.gold}35`, color: T.goldDeep, padding: "3px 9px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: T.body }}>
                      {top} ↵
                    </button>
                    <span style={{ color: T.faint, fontSize: 10.5 }}>based on past entries</span>
                  </div>
                );
              })()}
            </div>

            <div>
              <div style={fieldLabel}>Recurring</div>
              <div style={{ display: "flex", gap: 7 }}>
                {[{ k: null, l: "One-time" }, { k: "weekly", l: "Weekly" }, { k: "monthly", l: "Monthly" }].map(({ k, l }) => (
                  <button key={l} onClick={() => setRecurring(k)} className="lg-btn"
                    style={{ flex: 1, padding: "9px", borderRadius: 11, border: `1px solid ${recurring === k ? T.gold : T.line}`, background: recurring === k ? `${T.gold}1c` : T.panel2, color: recurring === k ? T.goldDeep : T.sub, cursor: "pointer", fontWeight: 600, fontSize: 12.5, fontFamily: T.body }}>{l}</button>
                ))}
              </div>
            </div>
          </>)}
          {kind === "sub" && (<>
            {/* Merchant name — big and central */}
            <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
              <input style={{ fontSize: 28, fontWeight: 800, fontFamily: T.display, letterSpacing: -0.8, width: "100%", textAlign: "center", background: "none", border: "none", outline: "none", color: T.ink }} placeholder="Service name…" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              <div style={{ height: 2, background: T.line, borderRadius: 1, margin: "6px auto 0", width: 60 }}>
                <div style={{ height: "100%", borderRadius: 1, background: T.gold, width: merchant ? "100%" : "0%", transition: "width .3s ease" }} />
              </div>
            </div>
            {/* Amount */}
            <div style={{ textAlign: "center", paddingBottom: 4 }}>
              <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Amount per cycle</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 400, color: T.faint, fontFamily: T.mono, alignSelf: "flex-start", paddingTop: 4 }}>Rp</span>
                <input inputMode="numeric" placeholder="0" value={amount ? (+amount).toLocaleString("id-ID") : ""} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  style={{ fontSize: 40, fontWeight: 800, fontFamily: T.display, letterSpacing: -1.5, width: "100%", maxWidth: 220, textAlign: "center", background: "none", border: "none", outline: "none", color: T.gold }} />
              </div>
            </div>
            {/* Cycle */}
            <div>
              <div style={fieldLabel}>Billing cycle</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["weekly", "monthly", "yearly"].map((cy) => {
                  const on = cycle === cy;
                  return (
                    <button key={cy} onClick={() => setCycle(cy)} className="lg-btn"
                      style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1.5px solid ${on ? T.gold : T.line}`, background: on ? `${T.gold}16` : "transparent", color: on ? T.gold : T.sub, cursor: "pointer", fontWeight: on ? 700 : 500, fontSize: 13, fontFamily: T.body, textTransform: "capitalize", transition: "all .15s ease" }}>{cy}</button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={fieldLabel}>Next renewal</div>
                <input type="date" style={inputS} value={nextRenewal} onChange={(e) => setNextRenewal(e.target.value)} />
              </div>
              <div>
                <div style={fieldLabel}>Account</div>
                <select style={inputS} value={acct} onChange={(e) => setAcct(e.target.value)}>{accounts.map((a) => <option key={a.id} style={{ background: T.panelSolid }}>{a.name}</option>)}</select>
              </div>
            </div>
          </>)}
          {kind === "goal" && (<>
            {/* Kind selector */}
            <div style={{ display: "flex", gap: 5, background: T.panel2, borderRadius: 13, padding: 4 }}>
              {[{ k: "save", l: "Save toward", icon: "↑" }, { k: "debt", l: "Pay off debt", icon: "↓" }].map(({ k, l, icon }) => {
                const on = goalKind === k;
                const col = k === "debt" ? T.red : T.greenDeep;
                return (
                  <button key={k} onClick={() => setGoalKind(k)} className="lg-btn"
                    style={{ flex: 1, padding: "10px", borderRadius: 9, border: "none", background: on ? col : "transparent", color: on ? "#fff" : T.faint, cursor: "pointer", fontWeight: on ? 700 : 500, fontSize: 13, fontFamily: T.body, transition: "all .15s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: on ? `0 4px 14px ${col}35` : "none" }}>
                    <span>{icon}</span>{l}
                  </button>
                );
              })}
            </div>
            <div>
              <div style={fieldLabel}>Goal name</div>
              <input style={inputS} placeholder={goalKind === "debt" ? "e.g. Pay off BCA credit card" : "e.g. Emergency fund · 6 months"} value={goalName} onChange={(e) => setGoalName(e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={fieldLabel}>Target</div>
                <input style={inputS} placeholder="Rp 0" inputMode="numeric" value={goalTarget ? (+goalTarget).toLocaleString("id-ID") : ""} onChange={(e) => setGoalTarget(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div>
                <div style={fieldLabel}>Current progress</div>
                <input style={inputS} placeholder="Rp 0" inputMode="numeric" value={goalCurrent ? (+goalCurrent).toLocaleString("id-ID") : ""} onChange={(e) => setGoalCurrent(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
            <div>
              <div style={fieldLabel}>Deadline</div>
              <input type="date" style={inputS} value={goalDeadline} onChange={(e) => setGoalDeadline(e.target.value)} />
            </div>
            <div>
              <div style={fieldLabel}>Track accounts <span style={{ textTransform: "none", color: T.faint, fontWeight: 500, letterSpacing: 0 }}>— progress auto-updates</span></div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {accounts.filter((a) => (goalKind === "debt" ? a.kind === "liability" : a.kind !== "liability")).map((a) => {
                  const on = goalLinks.includes(a.name);
                  const col = catColor(a.name);
                  return (
                    <button key={a.id} onClick={() => setGoalLinks(on ? goalLinks.filter((x) => x !== a.name) : [...goalLinks, a.name])} className="lg-btn"
                      style={{ padding: "6px 12px", borderRadius: 99, border: `1.5px solid ${on ? col : T.line}`, background: on ? `${col}18` : "transparent", color: on ? col : T.sub, cursor: "pointer", fontSize: 12.5, fontFamily: T.body, fontWeight: on ? 700 : 500, transition: "all .14s ease" }}>
                      {on && "✓ "}{a.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </>)}

          {kind === "budget" && (<>
            {/* Big amount display */}
            <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
              <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Monthly limit</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 400, color: T.faint, fontFamily: T.mono, alignSelf: "flex-start", paddingTop: 4 }}>Rp</span>
                <input inputMode="numeric" placeholder="0" value={amount ? (+amount).toLocaleString("id-ID") : ""} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  style={{ fontSize: 42, fontWeight: 800, fontFamily: T.display, letterSpacing: -1.5, width: "100%", maxWidth: 240, textAlign: "center", background: "none", border: "none", outline: "none", color: T.greenDeep }} />
              </div>
              <div style={{ fontSize: 10.5, color: T.faint, marginTop: 4 }}>per month</div>
            </div>
            <div>
              <div style={fieldLabel}>Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {[...new Set(pdata?.transactions?.filter((t) => t.type === "expense").map((t) => t.cat))].slice(0, 12).map((c) => {
                  const on = cat === c; const col = catColor(c);
                  return (
                    <button key={c} onClick={() => setCat(c)} className="lg-btn"
                      style={{ padding: "6px 12px", borderRadius: 99, border: `1.5px solid ${on ? col : T.line}`, background: on ? `${col}18` : "transparent", color: on ? col : T.sub, cursor: "pointer", fontSize: 12.5, fontFamily: T.body, fontWeight: on ? 700 : 500, transition: "all .14s ease" }}>
                      {c}
                    </button>
                  );
                })}
              </div>
              <input style={{ ...inputS, fontSize: 13 }} placeholder="Or type a category name…" value={cat} onChange={(e) => setCat(e.target.value)} />
            </div>
          </>)}

          {kind === "holdDetail" && initial && (() => {
            const h = initial;
            const val = h.qty * h.price, cost = h.qty * h.avg, pl = val - cost;
            const plPct = cost > 0 ? (pl / cost) * 100 : 0;
            const rate = h.ccy === "USD" ? USD_IDR : 1;
            const realizd = realizedByHolding[h.id] || 0;
            const hTrades = invTxns.filter((it) => it.holdingId === h.id).sort((a, b) => b.date.localeCompare(a.date));
            const typeCol = h.type === "crypto" ? "#f97316" : h.type === "stock" ? "#3b82f6" : h.type === "etf" ? "#8b5cf6" : "#10b981";
            const plUp = pl >= 0;
            return (<>
              {/* Hero P&L display */}
              <div style={{ background: `linear-gradient(145deg, ${T.panel2}, ${T.panel2}dd)`, border: `1px solid ${T.line}`, borderRadius: 16, padding: "18px 20px", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${typeCol}18`, border: `1.5px solid ${typeCol}30`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontFamily: T.mono, fontWeight: 800, fontSize: 13, color: typeCol }}>{h.ticker.slice(0,3)}</span>
                    <div style={{ width: 20, height: 2, borderRadius: 1, background: typeCol, marginTop: 2, opacity: 0.5 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontFamily: T.display, fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>{h.ticker}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: `${typeCol}18`, color: typeCol, textTransform: "uppercase" }}>{h.type || "equity"}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: T.faint, marginTop: 2 }}>{h.platform} · {h.qty} units @ {h.ccy === "USD" ? fmtUSD(h.avg) : fmtIDR(h.avg)}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
                  {[
                    { l: "Market value", v: fmtDisp(val * rate), bold: true },
                    { l: "Unrealized P&L", v: `${plUp ? "+" : "−"}${fmtDisp(Math.abs(pl * rate))}`, sub: `${plUp ? "+" : ""}${plPct.toFixed(1)}%`, col: plUp ? T.greenDeep : T.red },
                    { l: "Realized", v: `${realizd >= 0 ? "+" : "−"}${fmtDisp(Math.abs(realizd))}`, col: realizd >= 0 ? T.greenDeep : T.red, hide: realizd === 0 },
                  ].map(({ l, v, sub, col, bold, hide }) => hide ? null : (
                    <div key={l}>
                      <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, marginBottom: 3 }}>{l}</div>
                      <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: col || T.ink }}>{v}</div>
                      {sub && <div style={{ fontSize: 10.5, color: col || T.faint, fontFamily: T.mono, marginTop: 1 }}>{sub}</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Log trade CTA */}
              <button onClick={() => onOpenTrade && onOpenTrade(h)} className="lg-btn"
                style={{ width: "100%", padding: "12px", borderRadius: 12, background: `${T.gold}14`, border: `1.5px dashed ${T.gold}40`, color: T.gold, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: T.body, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .15s ease" }}>
                <Plus size={16} /> Log trade
              </button>

              {/* Trade history */}
              {hTrades.length > 0 && (
                <div>
                  <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Trade history</div>
                  <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${T.line}` }}>
                    {hTrades.map((it, idx) => {
                      const itCol = it.type === "buy" ? T.greenDeep : it.type === "sell" ? T.red : T.goldDeep;
                      return (
                        <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: idx < hTrades.length - 1 ? `1px solid ${T.line}` : "none" }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${itCol}18`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                            {it.type === "buy" ? <ArrowUpRight size={13} color={itCol} /> : it.type === "sell" ? <ArrowDownRight size={13} color={itCol} /> : <span style={{ fontSize: 10, fontWeight: 800, color: itCol }}>D</span>}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{it.type.charAt(0).toUpperCase() + it.type.slice(1)}{it.qty > 0 ? ` ${it.qty}` : ""} {it.type !== "dividend" ? `@ ${h.ccy === "USD" ? fmtUSD(it.price) : fmtIDR(it.price)}` : ""}</div>
                            <div style={{ fontSize: 10.5, color: T.faint, fontFamily: T.mono }}>{it.date}{it.note ? ` · ${it.note}` : ""}{it.fees > 0 ? ` · fee ${fmtIDR(it.fees)}` : ""}</div>
                          </div>
                          {it.type === "sell" && it.realized !== undefined && (
                            <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: it.realized >= 0 ? T.greenDeep : T.red, flexShrink: 0 }}>
                              {it.realized >= 0 ? "+" : ""}{fmtDisp(it.realized * rate)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {hTrades.length === 0 && <div style={{ fontSize: 12, color: T.faint, textAlign: "center", padding: "8px 0" }}>No trades yet — log your first trade above.</div>}
            </>);
          })()}

          {kind === "trade" && (<>
            <div style={{ fontSize: 11, color: T.faint, marginTop: -4, marginBottom: 4, fontFamily: T.mono }}>
              {initial ? `${initial.ticker} · ${initial.platform} · ${initial.qty} held @ avg ${initial.ccy === "USD" ? fmtUSD(initial.avg) : fmtIDR(initial.avg)}` : ""}
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              {[{ k: "buy", l: "Buy" }, { k: "sell", l: "Sell" }, { k: "dividend", l: "Dividend" }].map(({ k, l }) => (
                <button key={k} onClick={() => setTradeType(k)} className="lg-btn"
                  style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1px solid ${tradeType === k ? T.gold : T.line}`, background: tradeType === k ? `${T.gold}1c` : T.panel2, color: tradeType === k ? T.goldDeep : T.sub, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: T.body }}>{l}</button>
              ))}
            </div>
            {tradeType !== "dividend" && (
              <div>
                <div style={fieldLabel}>{tradeType === "buy" ? "Quantity" : `Quantity to sell`}{initial && tradeType === "sell" ? ` (max ${initial.qty})` : ""}</div>
                <input style={inputS} placeholder="0" inputMode="decimal" value={tradeQty} onChange={(e) => setTradeQty(e.target.value)} />
              </div>
            )}
            <div>
              <div style={fieldLabel}>{tradeType === "dividend" ? "Dividend amount" : "Price per unit"}</div>
              <input style={inputS} placeholder={initial?.ccy === "USD" ? "$0.00" : "Rp 0"} inputMode="decimal" value={tradePrice} onChange={(e) => setTradePrice(e.target.value)} />
            </div>
            {tradeType !== "dividend" && (
              <div>
                <div style={fieldLabel}>Fees (optional)</div>
                <input style={inputS} placeholder="Rp 0" inputMode="decimal" value={tradeFees} onChange={(e) => setTradeFees(e.target.value)} />
              </div>
            )}
            <div style={{ height: 1, background: T.line, margin: "4px 0" }} />

            <div>
              <label style={fieldLabel}>Date</label>
              <input type="date" style={inputS} value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} />
            </div>
            <div>
              <div style={fieldLabel}>Note (optional)</div>
              <input style={inputS} placeholder="e.g. DCA buy, stop-loss hit…" value={tradeNote} onChange={(e) => setTradeNote(e.target.value)} />
            </div>
            {tradeType === "sell" && tradeQty && tradePrice && initial && (
              <div style={{ background: T.panel2, borderRadius: 11, padding: "10px 14px", fontSize: 12.5, fontFamily: T.mono }}>
                <div style={{ color: T.sub, marginBottom: 3 }}>Estimated realized P&L</div>
                {(() => {
                  const realized = +tradeQty * (+tradePrice - initial.avg) - +(tradeFees || 0);
                  return <div style={{ fontWeight: 700, color: realized >= 0 ? T.greenDeep : T.red, fontSize: 14 }}>{realized >= 0 ? "+" : ""}{initial.ccy === "USD" ? fmtUSD(realized) : fmtIDR(realized)}</div>;
                })()}
              </div>
            )}
          </>)}

          {kind === "hold" && (<>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {[
                { pl: "Stockbit", sub: "IDX stocks" },
                { pl: "Bybit",    sub: "Crypto" },
                { pl: "Binance",  sub: "Crypto" },
                { pl: "Pluang",   sub: "US stocks · Gold" },
                { pl: "Bibit",    sub: "Reksa Dana" },
              ].map(({ pl, sub }) => (
                <button key={pl} onClick={() => setPlatform(pl)} className="lg-btn"
                  style={{ padding: "8px 13px", borderRadius: 11, border: `1px solid ${platform === pl ? T.gold : T.line}`, background: platform === pl ? `${T.gold}1c` : T.panel2, color: platform === pl ? T.gold : T.sub, cursor: "pointer", fontFamily: T.body, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{pl}</div>
                  <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 1 }}>{sub}</div>
                </button>
              ))}
            </div>
            <input style={inputS}
              placeholder={platform === "Bibit" ? "Fund (e.g. RDPU)" : platform === "Pluang" ? "Ticker (e.g. AAPL, GOLD)" : platform === "Stockbit" ? "Ticker (e.g. BBCA)" : "Ticker (e.g. BTC)"}
              value={ticker} onChange={(e) => setTicker(e.target.value)} />
            <input style={inputS} placeholder="Quantity" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
            <input style={inputS}
              placeholder={`Avg cost (${["Bybit", "Binance", "Pluang"].includes(platform) ? "USD" : "Rp"})`}
              inputMode="decimal" value={avg} onChange={(e) => setAvg(e.target.value)} />
          </>)}
          {kind !== "holdDetail" && (() => {
            const canSave = kind === "txn" ? +amount > 0
              : kind === "sub" ? (!!merchant && +amount > 0)
              : kind === "goal" ? (!!goalName && +goalTarget > 0)
              : kind === "budget" ? (!!cat && +amount > 0)
              : kind === "trade" ? (tradeType === "dividend" ? +tradePrice > 0 : +tradeQty > 0 && +tradePrice > 0)
              : true;
            return (
              <button onClick={submit} disabled={!canSave} className="lg-btn"
                style={{ marginTop: 4, padding: "14px", borderRadius: 12, background: canSave ? `linear-gradient(145deg, ${T.gold2}, ${T.gold} 55%, ${T.goldDeep})` : T.panel2, border: canSave ? "none" : `1px solid ${T.line}`, color: canSave ? "#ffffff" : T.faint, fontWeight: 700, fontSize: 14.5, cursor: canSave ? "pointer" : "not-allowed", fontFamily: T.body, transition: "all .15s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: canSave ? `0 4px 16px ${T.gold}40` : "none" }}>
                <span>{kind === "trade" ? "Log trade" : editing ? "Save changes" : "Save"}</span>
                {canSave && isDesktop && <kbd style={{ fontSize: 10.5, opacity: 0.6, background: "rgba(255,255,255,0.15)", borderRadius: 5, padding: "2px 6px", fontFamily: T.mono }}>⌘↵</kbd>}
              </button>
            );
          })()}
          {editing && onDelete && kind !== "holdDetail" && kind !== "trade" && (
            confirmDel ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setConfirmDel(false)} className="lg-btn" style={{ flex: 1, padding: "13px", borderRadius: 12, background: T.panel2, border: `1px solid ${T.line}`, color: T.sub, fontWeight: 600, fontSize: 14, fontFamily: T.body, cursor: "pointer" }}>Cancel</button>
                <button onClick={onDelete} className="lg-btn" style={{ flex: 1, padding: "13px", borderRadius: 12, background: T.red, border: "none", color: "#ffffff", fontWeight: 700, fontSize: 14, fontFamily: T.body, cursor: "pointer" }}>Confirm delete</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="lg-btn" style={{ padding: "12px", borderRadius: 12, background: "transparent", border: `1px solid ${T.line}`, color: T.red, fontWeight: 600, fontSize: 13.5, fontFamily: T.body, cursor: "pointer" }}>Delete</button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
