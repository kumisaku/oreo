import React from 'react';
import { T } from '../globals.js';

export function ChartRangeBar({ range, setRange, from, setFrom, to, setTo, opts, isDesktop, centered }) {
  const iS = {
    width: "100%", background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 10,
    padding: isDesktop ? "9px 12px" : "13px 14px",
    color: T.ink, fontSize: isDesktop ? 13 : 15, fontFamily: T.body, outline: "none",
    colorScheme: T.mode || "light",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: centered ? "center" : "stretch", gap: 10 }}>
      {/* Button strip — scrollable on mobile */}
      <div style={{
        display: "flex", gap: 4, padding: "4px",
        background: T.panel2, borderRadius: 14,
        border: `1px solid ${T.line}`,
        boxShadow: `0 1px 3px rgba(0,0,0,0.06)`,
        overflowX: "auto", scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        {opts.map((o) => {
          const on = range === o.k;
          return (
            <button key={o.k} onClick={() => setRange(o.k)} className="lg-btn"
              style={{
                padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                fontFamily: T.body, fontSize: 12, fontWeight: on ? 700 : 400,
                background: on ? T.accent : "transparent",
                color: on ? "#fff" : T.faint,
                boxShadow: on ? `0 1px 4px ${T.accent}50` : "none",
                transition: "all .18s ease",
                letterSpacing: on ? 0 : 0.1,
                whiteSpace: "nowrap", flexShrink: 0,
              }}>
              {o.l}
            </button>
          );
        })}
      </div>

      {range === "custom" && (
        <div className="lg-pop" style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", gap: 10, width: "100%" }}>
          {[["From", from, setFrom, undefined, to], ["To", to, setTo, from, undefined]].map(([label, val, set, min, max]) => (
            <div key={label} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: T.faint, marginBottom: 6, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
              <input type="date" style={iS} value={val} min={min} max={max} onChange={(e) => set(e.target.value)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Chip({ on, onClick, children }) {
  return (
    <button onClick={onClick} className="lg-btn"
      style={{ padding: "7px 14px", borderRadius: 99, border: `1px solid ${on ? T.accent + "60" : T.line}`,
        background: on ? `${T.accent}18` : "transparent", color: on ? T.accent : T.sub,
        cursor: "pointer", fontWeight: on ? 600 : 500, fontSize: 12.5, fontFamily: T.body,
        textTransform: "capitalize", letterSpacing: 0.1,
        boxShadow: on ? `0 0 12px ${T.accent}20` : "none", transition: "all .15s ease" }}>
      {children}
    </button>
  );
}
