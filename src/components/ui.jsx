import React from 'react';
import { ChevronDown, Inbox } from 'lucide-react';
import { T, DISPLAY } from '../globals.js';
import { fmtDisp } from '../utils/format.js';

/* ============================ PRIMITIVES ============================ */
export const Money = ({ v, sign = false, color }) => {
  const txt = fmtDisp(Math.abs(v));
  const pre = sign ? (v >= 0 ? "+" : "−") : v < 0 ? "−" : "";
  return <span style={{ fontFamily: T.mono, color: color || T.ink, fontVariantNumeric: "tabular-nums" }}>{pre}{txt}</span>;
};

export function CcyToggle({ disp, setDisp }) {
  return (
    <div style={{ display: "flex", background: T.panel2, borderRadius: 9, padding: 3, gap: 2, border: `1px solid ${T.line}` }}>
      {["IDR", "USD"].map((c) => (
        <button key={c} onClick={() => setDisp(c)} className="lg-btn"
          style={{ padding: "4px 11px", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: T.mono, fontSize: 11, fontWeight: 600, background: disp === c ? T.accent : "transparent", color: disp === c ? "#ffffff" : T.sub }}>
          {c}
        </button>
      ))}
    </div>
  );
}

export function Card({ children, style, glow, onClick }) {
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

export function Label({ children, style }) {
  return <div style={{ fontFamily: T.body, color: T.faint, fontSize: 10.5, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 600, ...style }}>{children}</div>;
}

export function Empty({ icon, message = "Nothing here", sub = "Try adjusting your filters" }) {
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
export function ShowMoreBar({ total, limit, shown, onToggle }) {
  if (total <= limit) return null;
  const hidden = total - limit;
  return (
    <button onClick={onToggle} className="lg-btn"
      style={{ width: "100%", marginTop: 6, padding: "5px 0", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.faint, fontFamily: T.body, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
      {shown ? <><ChevronDown size={11} style={{ transform: "rotate(180deg)" }} /> Show less</> : <><ChevronDown size={11} /> +{hidden} more</>}
    </button>
  );
}

export function MobileSection({ sectionKey, label, icon, children, alwaysShow, collapsed, onToggle }) {
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
