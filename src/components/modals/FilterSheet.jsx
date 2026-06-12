import React, { useRef } from 'react';
import { X, ArrowLeftRight, Calendar, Tag, Wallet, Building2, ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import { T } from '../../globals.js';

export default function FilterSheet({ tab, f, setF, cats, accts, onClose, onReset }) {
  const isDesk = typeof window !== "undefined" && window.innerWidth >= 900;
  const inputS = { flex: 1, background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 11, padding: "10px 13px", color: T.ink, fontSize: 14, fontFamily: T.body, outline: "none", width: "100%", colorScheme: T.mode || "light" };
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
      border: `1px solid ${on ? (color || T.accent) + "55" : T.line}`,
      background: on ? `${color || T.accent}18` : T.panel2,
      color: on ? (color || T.accent) : T.sub,
      transition: "all .15s",
    }}>{children}</button>
  );

  const sortIcons = { newest: "↓ Newest", oldest: "↑ Oldest", high: "↑ Highest", low: "↓ Lowest" };

  const sheetContent = (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${T.accent}18`, border: `1px solid ${T.accent}30`, display: "grid", placeItems: "center" }}>
            <SlidersHorizontal size={15} color={T.accent} strokeWidth={2} />
          </div>
          <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 800 }}>Filters</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onReset} className="lg-btn" style={{ background: "none", border: `1px solid ${T.line}`, borderRadius: 9, padding: "6px 12px", cursor: "pointer", color: T.sub, fontSize: 12.5, fontFamily: T.body, fontWeight: 500 }}>Reset all</button>
          <button onClick={onClose} className="lg-btn" style={{ background: T.panel2, border: "none", borderRadius: 9, padding: 8, cursor: "pointer", color: T.sub, display: "grid", placeItems: "center" }}><X size={16} /></button>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${T.line}`, marginBottom: 20 }} />

      {/* ─── TRANSACTION FILTERS ─── */}
      {tab === "txn" && (<>
        <Section label="Transaction type" icon={<ArrowLeftRight size={13} />}>
          {[
            { v: "all", l: "All types" },
            { v: "income",   l: "Income",   col: T.greenDeep,  bg: T.green },
            { v: "expense",  l: "Expense",  col: T.red,        bg: T.red },
            { v: "transfer", l: "Transfer", col: T.accent,   bg: T.accent },
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
          style={{ width: "100%", padding: "14px", borderRadius: 13, background: T.accent, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: T.body, boxShadow: `0 4px 16px ${T.accent}50` }}>
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
