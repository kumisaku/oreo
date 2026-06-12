import React, { useState } from 'react';
import { ChevronDown, Wallet, X, Plus } from 'lucide-react';
import { T, DISPLAY, USD_IDR } from '../../globals.js';
import { fmtIDR } from '../../utils/format.js';
import { providerColor } from '../../theme.js';

export default function AccountManager({ accounts, onClose, onSave }) {
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
                    <div style={{ fontSize: 10.5, color: T.faint }}>{a.provider} · {a.kind === "liability" ? "Liability" : "Asset"} · Opening: {DISPLAY === "USD" ? `$${+(( a.opening || 0) / USD_IDR).toFixed(2)}` : fmtIDR(a.opening || 0)}</div>
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
                      <div><div style={{ fontSize: 10, color: T.faint, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Opening balance ({DISPLAY === "USD" ? "USD" : "IDR"})</div>
                        <input style={inputS} inputMode={DISPLAY === "USD" ? "decimal" : "numeric"}
                          value={a.opening ? (DISPLAY === "USD" ? +(a.opening / USD_IDR).toFixed(2) : Number(a.opening).toLocaleString("id-ID")) : ""}
                          placeholder="0"
                          onChange={(e) => {
                            const raw = e.target.value.replace(DISPLAY === "USD" ? /[^\d.]/g : /\D/g, "");
                            const inIDR = DISPLAY === "USD" ? Math.round(+raw * USD_IDR) : +raw;
                            setList(list.map((x, j) => j === i ? { ...x, opening: inIDR } : x));
                          }} /></div>
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

        <button onClick={() => onSave(list)} className="lg-btn" style={{ width: "100%", padding: 14, borderRadius: 13, background: T.accent, border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: T.body, boxShadow: `0 4px 16px ${T.accent}50` }}>Save accounts</button>
      </div>
    </div>
  );
}
