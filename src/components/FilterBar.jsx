import React from 'react';
import { Search, X, Download, SlidersHorizontal, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { T } from '../globals.js';

export default function FilterBar({ q, setQ, f, setF, onFilter, count, chips, onClearAll, onExport, placeholder }) {
  const isDesk = typeof window !== "undefined" && window.innerWidth >= 900;
  const typeOpts = [
    { k: "all",      l: "All",      icon: null,              active: { bg: T.ink,              color: T.bg,      border: T.ink } },
    { k: "income",   l: "Income",   icon: <ArrowUpRight size={13} />,  active: { bg: `${T.green}1a`,    color: T.greenDeep, border: `${T.green}40` } },
    { k: "expense",  l: "Expense",  icon: <ArrowDownRight size={13} />, active: { bg: `${T.red}16`,     color: T.red,       border: `${T.red}40` } },
    { k: "transfer", l: "Transfer", icon: <ArrowLeftRight size={13} />, active: { bg: `${T.accent}18`, color: T.accent,    border: `${T.accent}45` } },
  ];
  const hasActive = count > 0;

  return (
    <div style={{ marginBottom: 18 }}>

      {/* Row 1: Search + Export */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", gap: 10,
          background: T.panelSolid, border: `1px solid ${q ? T.accent + "60" : T.line}`,
          borderRadius: 13, padding: "0 14px",
          boxShadow: q ? `0 0 0 3px ${T.accent}16` : "0 1px 3px rgba(17,24,39,0.05)",
          transition: "border-color .15s, box-shadow .15s",
        }}>
          <Search size={16} color={q ? T.accent : T.faint} />
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
              border: hasActive ? `1.5px solid ${T.accent}` : `1px solid ${T.line}`,
              background: hasActive ? `${T.accent}14` : T.panelSolid,
              color: hasActive ? T.accent : T.sub,
              boxShadow: hasActive ? `0 0 0 3px ${T.accent}16` : "none",
              transition: "all .18s ease",
            }}>
            <SlidersHorizontal size={14} strokeWidth={hasActive ? 2.2 : 1.8} />
            {isDesk ? "Filters" : ""}
            {count > 0 && (
              <span style={{
                background: T.accent, color: "#fff", borderRadius: 20,
                fontSize: 10.5, fontWeight: 700, padding: "1px 6px", lineHeight: 1.5,
                boxShadow: `0 0 8px ${T.accent}40`,
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
                background: `${T.accent}12`, border: `1px solid ${T.accent}35`,
                color: T.accent, borderRadius: 8, padding: "4px 9px",
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
