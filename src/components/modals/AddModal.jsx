import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';
import { T, DISPLAY, USD_IDR } from '../../globals.js';
import { fmtIDR, fmtUSD, fmtDisp } from '../../utils/format.js';
import { catColor } from '../../theme.js';

// Amount input helpers — IDR = integers only, USD = allow 2 decimal places
const parseAmt = (raw) => raw.replace(DISPLAY === "USD" ? /[^\d.]/g : /\D/g, "").replace(/^(\d*\.?\d{0,2}).*/, "$1");
const fmtAmt   = (val) => {
  if (!val) return "";
  const n = +val;
  if (isNaN(n)) return val;
  return DISPLAY === "USD"
    ? n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : n.toLocaleString("id-ID");
};
import { todayISO, daysFromNow } from '../../seed.js';

export default function AddModal({ kind, accounts, initial, isDesktop, invTxns = [], realizedByHolding = {}, transactions = [], categories = [], onOpenTrade, onClose, onSave, onDelete }) {
  const editing = !!initial;
  // All monetary values are stored in IDR — convert to USD when editing in USD mode
  const fromIDR = (n) => n ? (DISPLAY === "USD" ? String(+(n / USD_IDR).toFixed(2)) : String(n)) : "";

  const [type, setType] = useState(initial?.type || "expense");
  const [amount, setAmount] = useState(fromIDR(initial?.amount));
  const [cat, setCat] = useState(initial?.cat || "Food");
  const [acct, setAcct] = useState(initial?.acct || accounts[0]?.name || "");
  const [toAcct, setToAcct] = useState(initial?.toAcct || accounts[1]?.name || "");
  const [note, setNote] = useState(initial?.note || "");
  const [date, setDate] = useState(initial?.date || todayISO());
  const [dateMode, setDateMode] = useState(initial && initial.date !== todayISO() ? "custom" : "today");
  const [recurring, setRecurring] = useState(initial?.recurring || null);
  const [merchant, setMerchant] = useState(initial?.merchant || "");
  const [cycle, setCycle] = useState(initial?.cycle || "monthly");
  const [nextRenewal, setNextRenewal] = useState(initial?.next || daysFromNow(30));
  const [ticker, setTicker] = useState(initial?.ticker || "");
  const [platform, setPlatform] = useState(initial?.platform || "Stockbit");
  const [qty, setQty] = useState(initial?.qty ? String(initial.qty) : "");
  const [avg, setAvg] = useState(initial?.avg ? String(initial.avg) : "");
  const [totalSpent, setTotalSpent] = useState(initial?.qty && initial?.avg ? String(+(initial.qty * initial.avg).toFixed(2)) : "");
  const [holdLastEdited, setHoldLastEdited] = useState("qty");
  const platformCcy = (pl) => ["Bybit", "Binance", "Pluang"].includes(pl) ? "USD" : "IDR";
  const [holdCcy, setHoldCcy] = useState(initial?.ccy || platformCcy(initial?.platform || "Stockbit"));
  const [goalName, setGoalName] = useState(initial?.name || "");
  const [goalTarget, setGoalTarget] = useState(fromIDR(initial?.target));
  const [goalCurrent, setGoalCurrent] = useState(fromIDR(initial?.current));
  const [goalDeadline, setGoalDeadline] = useState(initial?.deadline || daysFromNow(180));
  const [goalKind, setGoalKind] = useState(initial?.kind || "save");
  const [goalLinks, setGoalLinks] = useState(initial?.linkedAccounts || []);
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

  const inputS = { width: "100%", background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 11, padding: "11px 13px", color: T.ink, fontSize: 14.5, fontFamily: T.body, outline: "none", transition: "border-color .15s ease, box-shadow .15s ease", colorScheme: T.mode || "light" };
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

  // All amounts are stored in IDR internally — convert if user is in USD mode
  const toIDR = (n) => DISPLAY === "USD" ? Math.round(+n * USD_IDR) : +n;

  const onHoldTotalChange = (val) => {
    setTotalSpent(val); setHoldLastEdited("total");
    if (+avg > 0 && +val > 0) setQty(String(+(+val / +avg).toFixed(8)));
    else setQty("");
  };
  const onHoldQtyChange = (val) => {
    setQty(val); setHoldLastEdited("qty");
    if (+avg > 0 && +val > 0) setTotalSpent(String(+(+val * +avg).toFixed(2)));
  };
  const onHoldAvgChange = (val) => {
    setAvg(val);
    if (+val > 0) {
      if (holdLastEdited === "total" && +totalSpent > 0) setQty(String(+(+totalSpent / +val).toFixed(8)));
      else if (holdLastEdited === "qty" && +qty > 0) setTotalSpent(String(+(+qty * +val).toFixed(2)));
    }
  };
  const onPlatformChange = (pl) => {
    setPlatform(pl);
    setHoldCcy(platformCcy(pl));
  };

  const submit = () => {
    if (kind === "txn") {
      if (!amount || +amount <= 0) return;
      if (type === "transfer") {
        if (!acct || !toAcct || acct === toAcct) return;
        onSave({ type: "transfer", amount: toIDR(amount), cat: "Transfer", acct, toAcct, note: note || `Transfer to ${toAcct}`, date: date || todayISO(), recurring });
      } else {
        onSave({ type, amount: toIDR(amount), cat: cat || (type === "income" ? "Income" : "Expense"), acct, note: note || cat, date: date || todayISO(), recurring });
      }
    }
    else if (kind === "sub") { if (!merchant || !amount || +amount <= 0) return; onSave({ merchant, amount: toIDR(amount), cycle, acct, next: nextRenewal || daysFromNow(30) }); }
    else if (kind === "goal") { if (!goalName || !goalTarget || +goalTarget <= 0) return; onSave({ name: goalName, target: toIDR(goalTarget), current: toIDR(goalCurrent || 0), deadline: goalDeadline || daysFromNow(180), kind: goalKind, linkedAccounts: goalLinks }); }
    else if (kind === "budget") { if (!cat || !amount || +amount <= 0) return; onSave({ cat, monthly: toIDR(amount), id: initial?.id || "b" + Date.now() }); }
    else if (kind === "trade") {
      if (tradeType !== "dividend" && (!tradeQty || +tradeQty <= 0 || !tradePrice || +tradePrice <= 0)) return;
      if (tradeType === "dividend" && (!tradePrice || +tradePrice <= 0)) return;
      onSave({ type: tradeType, qty: +(tradeQty || 0), price: +tradePrice, fees: +(tradeFees || 0), date: tradeDate || todayISO(), note: tradeNote });
    }
    else {
      if (!ticker || !qty) return;
      const derivedAvg = +avg > 0 ? +avg : (+totalSpent > 0 && +qty > 0 ? +(+totalSpent / +qty).toFixed(holdCcy === "USD" ? 8 : 0) : 0);
      if (!derivedAvg) return;
      const meta = {
        Stockbit: "stock", Bybit: "crypto", Binance: "crypto", Pluang: "stock", Bibit: "mutual_fund",
      };
      const assetType = meta[platform] || "stock";
      onSave({ platform, ticker: ticker.toUpperCase(), type: assetType, qty: +qty, avg: derivedAvg, price: derivedAvg, ccy: holdCcy });
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
            {/* Type selector */}
            <div style={{ display: "flex", gap: 5, background: T.panel2, borderRadius: 14, padding: "4px" }}>
              {[
                { k: "expense",  l: "Expense",  icon: <ArrowDownRight size={15} />, col: T.red },
                { k: "income",   l: "Income",   icon: <ArrowUpRight size={15} />,   col: T.greenDeep },
                { k: "transfer", l: "Transfer", icon: <ArrowLeftRight size={15} />, col: T.accent },
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
                  inputMode={DISPLAY === "USD" ? "decimal" : "numeric"} placeholder="0"
                  value={fmtAmt(amount)}
                  onChange={(e) => setAmount(parseAmt(e.target.value))}
                  style={{ fontSize: 48, fontWeight: 800, fontFamily: T.display, letterSpacing: -2,
                    width: "100%", maxWidth: 280, textAlign: "center", background: "none",
                    border: "none", outline: "none",
                    color: type === "income" ? T.greenDeep : type === "transfer" ? T.accent : T.ink }} />
              </div>
              <div style={{ height: 2, background: T.line, borderRadius: 1, margin: "6px auto 0", width: 80 }}>
                <div style={{ height: "100%", borderRadius: 1, background: type === "income" ? T.greenDeep : type === "transfer" ? T.accent : T.accent, transition: "width .3s ease", width: amount ? "100%" : "0%" }} />
              </div>
            </div>

            {/* Date */}
            <div>
              <div style={{ ...fieldLabel, display: "flex", justifyContent: "space-between" }}>
                <span>Date</span>
                <span style={{ color: T.accent, textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>{relLabel}</span>
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={() => { setDateMode("today"); setDate(todayISO()); }} className="lg-btn"
                  style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1px solid ${dateMode === "today" ? T.accent : T.line}`, background: dateMode === "today" ? `${T.accent}18` : T.panel2, color: dateMode === "today" ? T.accent : T.sub, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: T.body }}>Today</button>
                <button onClick={() => setDateMode("custom")} className="lg-btn"
                  style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1px solid ${dateMode === "custom" ? T.accent : T.line}`, background: dateMode === "custom" ? `${T.accent}18` : T.panel2, color: dateMode === "custom" ? T.accent : T.sub, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: T.body }}>Custom</button>
              </div>
              {dateMode === "custom" && <input type="date" style={{ ...inputS, marginTop: 8 }} value={date} onChange={(e) => setDate(e.target.value)} />}
            </div>

            {/* Category */}
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
                      style={{ background: `${T.accent}18`, border: `1px solid ${T.accent}35`, color: T.accent, padding: "3px 9px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: T.body }}>
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
                    style={{ flex: 1, padding: "9px", borderRadius: 11, border: `1px solid ${recurring === k ? T.accent : T.line}`, background: recurring === k ? `${T.accent}1c` : T.panel2, color: recurring === k ? T.accent : T.sub, cursor: "pointer", fontWeight: 600, fontSize: 12.5, fontFamily: T.body }}>{l}</button>
                ))}
              </div>
            </div>
          </>)}
          {kind === "sub" && (<>
            <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
              <input style={{ fontSize: 28, fontWeight: 800, fontFamily: T.display, letterSpacing: -0.8, width: "100%", textAlign: "center", background: "none", border: "none", outline: "none", color: T.ink }} placeholder="Service name…" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              <div style={{ height: 2, background: T.line, borderRadius: 1, margin: "6px auto 0", width: 60 }}>
                <div style={{ height: "100%", borderRadius: 1, background: T.accent, width: merchant ? "100%" : "0%", transition: "width .3s ease" }} />
              </div>
            </div>
            <div style={{ textAlign: "center", paddingBottom: 4 }}>
              <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Amount per cycle</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 400, color: T.faint, fontFamily: T.mono, alignSelf: "flex-start", paddingTop: 4 }}>{DISPLAY === "USD" ? "$" : "Rp"}</span>
                <input inputMode={DISPLAY === "USD" ? "decimal" : "numeric"} placeholder="0" value={fmtAmt(amount)} onChange={(e) => setAmount(parseAmt(e.target.value))}
                  style={{ fontSize: 40, fontWeight: 800, fontFamily: T.display, letterSpacing: -1.5, width: "100%", maxWidth: 220, textAlign: "center", background: "none", border: "none", outline: "none", color: T.accent }} />
              </div>
            </div>
            <div>
              <div style={fieldLabel}>Billing cycle</div>
              <div style={{ display: "flex", gap: 6 }}>
                {["weekly", "monthly", "yearly"].map((cy) => {
                  const on = cycle === cy;
                  return (
                    <button key={cy} onClick={() => setCycle(cy)} className="lg-btn"
                      style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1.5px solid ${on ? T.accent : T.line}`, background: on ? `${T.accent}16` : "transparent", color: on ? T.accent : T.sub, cursor: "pointer", fontWeight: on ? 700 : 500, fontSize: 13, fontFamily: T.body, textTransform: "capitalize", transition: "all .15s ease" }}>{cy}</button>
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
                <input style={inputS} placeholder={DISPLAY === "USD" ? "$ 0" : "Rp 0"} inputMode={DISPLAY === "USD" ? "decimal" : "numeric"} value={fmtAmt(goalTarget)} onChange={(e) => setGoalTarget(parseAmt(e.target.value))} />
              </div>
              <div>
                <div style={fieldLabel}>Current progress</div>
                <input style={inputS} placeholder={DISPLAY === "USD" ? "$ 0" : "Rp 0"} inputMode={DISPLAY === "USD" ? "decimal" : "numeric"} value={fmtAmt(goalCurrent)} onChange={(e) => setGoalCurrent(parseAmt(e.target.value))} />
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
            <div style={{ textAlign: "center", padding: "4px 0 8px" }}>
              <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Monthly limit</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 400, color: T.faint, fontFamily: T.mono, alignSelf: "flex-start", paddingTop: 4 }}>{DISPLAY === "USD" ? "$" : "Rp"}</span>
                <input inputMode={DISPLAY === "USD" ? "decimal" : "numeric"} placeholder="0" value={fmtAmt(amount)} onChange={(e) => setAmount(parseAmt(e.target.value))}
                  style={{ fontSize: 42, fontWeight: 800, fontFamily: T.display, letterSpacing: -1.5, width: "100%", maxWidth: 240, textAlign: "center", background: "none", border: "none", outline: "none", color: T.greenDeep }} />
              </div>
              <div style={{ fontSize: 10.5, color: T.faint, marginTop: 4 }}>per month</div>
            </div>
            <div>
              <div style={fieldLabel}>Category</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {[...new Set(transactions?.filter((t) => t.type === "expense").map((t) => t.cat))].slice(0, 12).map((c) => {
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

              <button onClick={() => onOpenTrade && onOpenTrade(h)} className="lg-btn"
                style={{ width: "100%", padding: "12px", borderRadius: 12, background: `${T.accent}10`, border: `1.5px dashed ${T.accent}40`, color: T.accent, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: T.body, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .15s ease" }}>
                <Plus size={16} /> Log trade
              </button>

              {hTrades.length > 0 && (
                <div>
                  <div style={{ fontSize: 9.5, color: T.faint, letterSpacing: 0.8, textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Trade history</div>
                  <div style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${T.line}` }}>
                    {hTrades.map((it, idx) => {
                      const itCol = it.type === "buy" ? T.greenDeep : it.type === "sell" ? T.red : T.accent;
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
                  style={{ flex: 1, padding: "10px", borderRadius: 11, border: `1px solid ${tradeType === k ? T.accent : T.line}`, background: tradeType === k ? `${T.accent}1c` : T.panel2, color: tradeType === k ? T.accent : T.sub, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: T.body }}>{l}</button>
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
                <button key={pl} onClick={() => onPlatformChange(pl)} className="lg-btn"
                  style={{ padding: "8px 13px", borderRadius: 11, border: `1px solid ${platform === pl ? T.accent : T.line}`, background: platform === pl ? `${T.accent}1c` : T.panel2, color: platform === pl ? T.accent : T.sub, cursor: "pointer", fontFamily: T.body, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{pl}</div>
                  <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 1 }}>{sub}</div>
                </button>
              ))}
            </div>
            {/* Currency override */}
            <div style={{ display: "flex", gap: 6 }}>
              {["IDR", "USD"].map((c) => (
                <button key={c} onClick={() => setHoldCcy(c)} className="lg-btn"
                  style={{ flex: 1, padding: "9px", borderRadius: 10, border: `1px solid ${holdCcy === c ? T.accent : T.line}`, background: holdCcy === c ? `${T.accent}14` : T.panel2, color: holdCcy === c ? T.accent : T.sub, fontWeight: 600, fontSize: 13, fontFamily: T.body, cursor: "pointer" }}>
                  {c === "IDR" ? "Rp — Rupiah" : "$ — Dollar"}
                </button>
              ))}
            </div>
            <input style={inputS}
              placeholder={platform === "Bibit" ? "Fund (e.g. RDPU)" : platform === "Pluang" ? "Ticker (e.g. AAPL, GOLD)" : platform === "Stockbit" ? "Ticker (e.g. BBCA)" : "Ticker (e.g. BTC)"}
              value={ticker} onChange={(e) => setTicker(e.target.value)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>
                  Total spent ({holdCcy === "USD" ? "USD" : "Rp"})
                </div>
                <input style={inputS} placeholder="0" inputMode="decimal" value={totalSpent}
                  onChange={(e) => onHoldTotalChange(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 5, display: "flex", justifyContent: "space-between" }}>
                  <span>Quantity</span>
                  {holdLastEdited === "total" && qty && <span style={{ color: T.accent, textTransform: "none", letterSpacing: 0 }}>auto</span>}
                </div>
                <input style={inputS} placeholder="0" inputMode="decimal" value={qty}
                  onChange={(e) => onHoldQtyChange(e.target.value)} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.faint, letterSpacing: 0.5, textTransform: "uppercase", fontWeight: 700, marginBottom: 5, display: "flex", justifyContent: "space-between" }}>
                <span>Avg / buy price ({holdCcy === "USD" ? "USD" : "Rp"})</span>
                {!avg && +totalSpent > 0 && +qty > 0 && <span style={{ color: T.accent, textTransform: "none", letterSpacing: 0 }}>auto from total ÷ qty</span>}
              </div>
              <input style={inputS} placeholder={`Optional if you filled total + qty`}
                inputMode="decimal" value={avg} onChange={(e) => onHoldAvgChange(e.target.value)} />
            </div>
          </>)}
          {kind !== "holdDetail" && (() => {
            const holdAvgOk = +avg > 0 || (+totalSpent > 0 && +qty > 0);
            const canSave = kind === "txn" ? +amount > 0
              : kind === "sub" ? (!!merchant && +amount > 0)
              : kind === "goal" ? (!!goalName && +goalTarget > 0)
              : kind === "budget" ? (!!cat && +amount > 0)
              : kind === "trade" ? (tradeType === "dividend" ? +tradePrice > 0 : +tradeQty > 0 && +tradePrice > 0)
              : kind === "hold" ? (!!ticker && +qty > 0 && holdAvgOk)
              : true;
            return (
              <button onClick={submit} disabled={!canSave} className="lg-btn"
                style={{ marginTop: 4, padding: "14px", borderRadius: 12, background: canSave ? T.accent : T.panel2, border: canSave ? "none" : `1px solid ${T.line}`, color: canSave ? "#ffffff" : T.faint, fontWeight: 700, fontSize: 14.5, cursor: canSave ? "pointer" : "not-allowed", fontFamily: T.body, transition: "all .15s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: canSave ? `0 4px 16px ${T.accent}50` : "none" }}>
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
