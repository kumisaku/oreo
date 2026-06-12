import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { T } from '../../globals.js';
import { fmtCompact } from '../../utils/format.js';
import { todayISO } from '../../seed.js';

export default function CSVImport({ accounts, categories, onClose, onImport }) {
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
    const cleaned = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
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
              <label style={{ background: T.accent, color: "#fff", padding: "10px 22px", borderRadius: 11, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: T.body, boxShadow: `0 4px 14px ${T.accent}45` }}>
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
                <button onClick={() => setUseDebitCredit(false)} className="lg-btn" style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${!useDebitCredit ? T.accent : T.line}`, background: !useDebitCredit ? `${T.accent}18` : "transparent", color: !useDebitCredit ? T.accent : T.sub, cursor: "pointer", fontFamily: T.body, fontSize: 12 }}>Single amount column</button>
                <button onClick={() => setUseDebitCredit(true)} className="lg-btn" style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${useDebitCredit ? T.accent : T.line}`, background: useDebitCredit ? `${T.accent}18` : "transparent", color: useDebitCredit ? T.accent : T.sub, cursor: "pointer", fontFamily: T.body, fontSize: 12 }}>Debit / Credit columns</button>
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
                style={{ flex: 2, padding: 13, borderRadius: 12, background: total ? T.accent : T.panel2, border: "none", color: total ? "#fff" : T.faint, cursor: total ? "pointer" : "not-allowed", fontFamily: T.body, fontWeight: 700, fontSize: 14, boxShadow: total ? `0 4px 16px ${T.accent}50` : "none" }}>
                Import {total} transactions
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
