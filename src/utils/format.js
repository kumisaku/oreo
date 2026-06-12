import { T, USD_IDR, DISPLAY, PRIVATE } from '../globals.js';

export const fmtIDR = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
export const fmtUSD = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDisp = (idr) => PRIVATE ? "••••••" : (DISPLAY === "USD" ? fmtUSD(idr / USD_IDR) : fmtIDR(idr));
export const fmtDispBare = (idr) => PRIVATE ? "••••" : (DISPLAY === "USD" ? fmtUSD(idr / USD_IDR).replace("$", "") : fmtIDR(idr).replace("Rp ", ""));
export const fmtCompact = (idr) => {
  if (PRIVATE) return DISPLAY === "USD" ? "$••" : "Rp ••";
  if (DISPLAY === "USD") { const v = idr / USD_IDR; return "$" + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + "K" : v.toFixed(0)); }
  return "Rp " + (Math.abs(idr) >= 1e6 ? (idr / 1e6).toFixed(1) + "M" : Math.abs(idr) >= 1e3 ? Math.round(idr / 1e3) + "K" : "" + Math.round(idr));
};
