/* ============================ THEME ============================ */
export const lightTheme = {
  mode: "light",
  bg: "#f0edf8",
  panelA: "#ffffff", panelB: "#ffffff", panelSolid: "#ffffff",
  panel2: "#f3f0fb",
  line: "rgba(100,60,200,0.09)", lineSolid: "#e8e2f5",
  ink: "#1a1025", sub: "#6b5f80", faint: "#9d93b0",
  gold: "#7c3aed", gold2: "#a78bfa", goldDeep: "#5b21b6",
  green: "#22c55e", greenDeep: "#15a34a", red: "#f43f6e", pink: "#ec4899", orange: "#f59e0b",
  accent: "#7c3aed", accent2: "#a78bfa", accentDeep: "#5b21b6",
  shadow: "0 1px 3px rgba(100,60,200,0.07), 0 16px 32px -18px rgba(100,60,200,0.14)",
  shadowMd: "0 4px 16px rgba(100,60,200,0.1), 0 1px 4px rgba(100,60,200,0.06)",
  shadowLg: "0 20px 60px rgba(100,60,200,0.16), 0 4px 16px rgba(100,60,200,0.08)",
  navBg: "rgba(255,255,255,0.92)",
  glowPurple: null, glowOrange: null,
  sidebar: "#1a0d35", sidebarDeep: "#110826",
  sidebarLine: "rgba(255,255,255,0.07)", sidebarText: "rgba(255,255,255,0.48)", sidebarTextActive: "#ffffff",
  display: "'Bricolage Grotesque', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  body: "'Spline Sans', -apple-system, system-ui, sans-serif",
};
export const darkTheme = {
  mode: "dark",
  bg: "#0a0a0c",
  panelA: "#111114", panelB: "#111114", panelSolid: "#111114",
  panel2: "#1c1c20",
  line: "rgba(255,255,255,0.10)", lineSolid: "#2a2a2e",
  ink: "#f5f5f7", sub: "#a0a0a8", faint: "#606068",
  gold: "#a855f7", gold2: "#c084fc", goldDeep: "#7e22ce",
  green: "#34d27b", greenDeep: "#28b866", red: "#fb6b8e", pink: "#f472b6", orange: "#f97316",
  accent: "#f97316", accent2: "#fb923c", accentDeep: "#ea580c",
  shadow: "0 1px 4px rgba(0,0,0,0.7), 0 20px 48px -20px rgba(0,0,0,0.9)",
  shadowMd: "0 4px 20px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.35)",
  shadowLg: "0 24px 80px rgba(0,0,0,0.75), 0 6px 24px rgba(0,0,0,0.4)",
  navBg: "rgba(10,10,12,0.94)",
  glowWhite: "rgba(255,255,255,0.12)",
  sidebar: "#0a0a0c", sidebarDeep: "#060608",
  sidebarLine: "rgba(255,255,255,0.07)", sidebarText: "rgba(255,255,255,0.45)", sidebarTextActive: "#f5f5f7",
  display: "'Bricolage Grotesque', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  body: "'Spline Sans', -apple-system, system-ui, sans-serif",
};

export const PALETTE = ["#2f6bff", "#22c55e", "#ec4899", "#f59345", "#8b5cf6", "#06b6d4"];
export const GRAIN = "none";
// Category color — deterministic hash → 12-color palette
export const catColor = (cat) => {
  const p = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316","#a855f7","#06b6d4","#84cc16"];
  let h = 0; for (let i = 0; i < (cat || "").length; i++) h = (h * 31 + cat.charCodeAt(i)) & 0xffff;
  return p[h % p.length];
};

/* ============================ PROVIDER COLORS ============================ */
export const PROVIDER_COLORS = {
  BCA: "#1a6fff", Jenius: "#00c2d9", GoPay: "#00aed6", DANA: "#118eea",
  OVO: "#4c3494", Cash: "#f59345", Bibit: "#ff6b35", Pluang: "#3b6ef0",
  Binance: "#f3ba2f", Bybit: "#f7a600", Stockbit: "#e8463a", Shopee: "#ee4d2d",
};
export const providerColor = (name) => PROVIDER_COLORS[name] || "#6b7280";
