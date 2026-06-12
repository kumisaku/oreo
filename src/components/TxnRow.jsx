import React from 'react';
import { ArrowLeftRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { T } from '../globals.js';
import { fmtDisp } from '../utils/format.js';
import { catColor } from '../theme.js';
import { Money } from './ui.jsx';

export function Header({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: T.display, fontSize: 25, fontWeight: 800, letterSpacing: -0.6 }}>{title}</div>
      <div style={{ fontSize: 13, color: T.sub, marginTop: 2 }}>{sub}</div>
    </div>
  );
}

export function TxnRow({ t, full, onClick }) {
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
