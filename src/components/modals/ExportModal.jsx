import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { X, Download, FileSpreadsheet, ChevronDown } from 'lucide-react';

const PRESETS = [
  { label: "All time",    value: "all" },
  { label: "This month",  value: "month" },
  { label: "This year",   value: "year" },
  { label: "Last year",   value: "lastyear" },
  { label: "Last 3 months", value: "3mo" },
  { label: "Last 6 months", value: "6mo" },
  { label: "Custom",      value: "custom" },
];

const SHEETS = [
  { id: "cover",      label: "Cover / Summary",     desc: "Net worth, totals, report info" },
  { id: "txn",        label: "Transactions",         desc: "Full ledger with running balance" },
  { id: "cat",        label: "Category Breakdown",   desc: "Spending & income by category" },
  { id: "monthly",    label: "Monthly P&L",          desc: "Income, expenses & savings rate by month" },
  { id: "accounts",   label: "Account Balances",     desc: "Current balance per account" },
  { id: "sub",        label: "Subscriptions",        desc: "Recurring charges & renewals" },
  { id: "inv",        label: "Investments",          desc: "Holdings, cost basis & P&L" },
  { id: "invtxn",     label: "Investment Transactions", desc: "Trade log (buy/sell/dividend)" },
  { id: "goals",      label: "Goals",                desc: "Savings & debt goals progress" },
  { id: "budgets",    label: "Budgets",              desc: "Budget vs actual by category" },
];

function presetRange(value) {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const startOf = (d) => { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; };
  if (value === "month") {
    return { from: iso(startOf(today)), to: iso(today) };
  }
  if (value === "year") {
    return { from: `${today.getFullYear()}-01-01`, to: iso(today) };
  }
  if (value === "lastyear") {
    const y = today.getFullYear() - 1;
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }
  if (value === "3mo") {
    const d = new Date(today); d.setMonth(d.getMonth() - 3);
    return { from: iso(d), to: iso(today) };
  }
  if (value === "6mo") {
    const d = new Date(today); d.setMonth(d.getMonth() - 6);
    return { from: iso(d), to: iso(today) };
  }
  return { from: "", to: "" }; // all / custom
}

export default function ExportModal({ onClose, pdata, profile, accountBalances, invValue, invCost, totalRealized, subTotal, netWorth, USD_IDR, T }) {
  const [preset, setPreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sheets, setSheets] = useState(new Set(SHEETS.map((s) => s.id)));
  const [ccy, setCcy] = useState("both"); // "idr" | "usd" | "both"
  const [includeTransfers, setIncludeTransfers] = useState(false);
  const [exporting, setExporting] = useState(false);

  const range = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  const filteredTx = useMemo(() => {
    let tx = pdata.transactions;
    if (!includeTransfers) tx = tx.filter((t) => t.type !== "transfer");
    if (range.from) tx = tx.filter((t) => t.date >= range.from);
    if (range.to)   tx = tx.filter((t) => t.date <= range.to);
    return tx.sort((a, b) => a.date.localeCompare(b.date));
  }, [pdata.transactions, range, includeTransfers]);

  const txCount = filteredTx.length;

  const toggleSheet = (id) => setSheets((s) => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const doExport = () => {
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const now = new Date();
      const stamp = now.toISOString().slice(0, 10);
      const genStamp = now.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

      const rnd  = (n) => Math.round(n);
      const usd2 = (n) => +n.toFixed(2);
      const cap  = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
      const monthLabel = (iso) => iso ? new Date(iso + "T00:00:00").toLocaleString("en", { month: "short", year: "numeric" }) : "";
      const dParts = (iso) => {
        const d = new Date(iso + "T00:00:00");
        return {
          weekday: d.toLocaleString("en", { weekday: "long" }),
          month:   d.toLocaleString("en", { month: "long" }),
          quarter: "Q" + (Math.floor(d.getMonth() / 3) + 1),
          year:    d.getFullYear(),
        };
      };
      const applyFmt = (ws, col, r1, r2, z) => {
        for (let r = r1; r <= r2; r++) {
          const addr = XLSX.utils.encode_cell({ r, c: col });
          if (ws[addr]) ws[addr].z = z;
        }
      };
      const af = (ws, nCols, nRows) => {
        ws["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(nCols - 1)}${nRows}` };
      };
      const showIDR = ccy === "idr" || ccy === "both";
      const showUSD = ccy === "usd" || ccy === "both";

      const totalInc = filteredTx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
      const totalExp = filteredTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
      const invPL    = invValue - invCost;

      const periodLabel = range.from && range.to
        ? `${range.from}  to  ${range.to}`
        : range.from ? `From ${range.from}` : range.to ? `Up to ${range.to}` : "All time";

      /* ── COVER ───────────────────────────────────── */
      if (sheets.has("cover")) {
        const rows = [
          ["OREO — FINANCIAL REPORT", ""],
          ["", ""],
          ["Profile", profile.name],
          ["Workspace type", profile.type === "business" ? "Business" : "Personal"],
          ["Generated on", genStamp],
          ["Reporting period", periodLabel],
          ["Transactions included", txCount],
          ["Transfers included", includeTransfers ? "Yes" : "No"],
          ["Base currency", "IDR (Rupiah)"],
          ["USD/IDR rate applied", `1 USD = Rp ${USD_IDR.toLocaleString("id-ID")}`],
          ["", ""],
          ["INCOME & EXPENSES", ""],
          ["Total income (Rp)", rnd(totalInc)],
          ["Total expenses (Rp)", rnd(totalExp)],
          ["Net profit/loss (Rp)", rnd(totalInc - totalExp)],
          ["Savings rate", totalInc ? (totalInc - totalExp) / totalInc : 0],
          ["", ""],
          ["SUBSCRIPTIONS", ""],
          ["Active subscriptions", pdata.subscriptions.length],
          ["Monthly recurring cost (Rp)", rnd(subTotal)],
          ["Annual recurring cost (Rp)", rnd(subTotal * 12)],
          ["", ""],
          ["INVESTMENTS", ""],
          ["Holdings", pdata.holdings.length],
          ["Market value (Rp)", rnd(invValue)],
          ["Cost basis (Rp)", rnd(invCost)],
          ["Unrealised P&L (Rp)", rnd(invPL)],
          ["Unrealised return", invCost ? invPL / invCost : 0],
          ["Realised P&L (Rp)", rnd(totalRealized)],
          ["Market value (USD)", usd2(invValue / USD_IDR)],
          ["", ""],
          ["NET WORTH (Rp)", rnd(netWorth)],
          ["NET WORTH (USD)", usd2(netWorth / USD_IDR)],
          ["", ""],
          ["SHEETS IN THIS WORKBOOK", ""],
          ...SHEETS.filter((s) => sheets.has(s.id)).map((s, i) => [`${i + 1}. ${s.label}`, s.desc]),
          ["", ""],
          ["Note", "Figures are as recorded in Oreo. Verify against bank/broker statements before filing."],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [{ wch: 36 }, { wch: 46 }];
        applyFmt(ws, 1, 12, 14, "#,##0");
        applyFmt(ws, 1, 15, 15, "0.00%");
        applyFmt(ws, 1, 19, 21, "#,##0");
        applyFmt(ws, 1, 24, 28, "#,##0");
        applyFmt(ws, 1, 28, 28, "0.00%");
        applyFmt(ws, 1, 30, 30, "$#,##0.00");
        applyFmt(ws, 1, 32, 32, "#,##0");
        applyFmt(ws, 1, 33, 33, "$#,##0.00");
        XLSX.utils.book_append_sheet(wb, ws, "Cover");
      }

      /* ── TRANSACTIONS ────────────────────────────── */
      if (sheets.has("txn")) {
        let bal = 0;
        const rows = filteredTx.map((t, i) => {
          const inAmt  = t.type === "income" ? t.amount : 0;
          const outAmt = t.type === "expense" ? t.amount : 0;
          const xfer   = t.type === "transfer" ? t.amount : 0;
          bal += inAmt - outAmt - (t.type === "transfer" ? (t.fee || 0) : 0);
          const p = dParts(t.date);
          const row = {
            "No.":         i + 1,
            "Date":        t.date,
            "Day":         p.weekday,
            "Month":       p.month,
            "Quarter":     p.quarter,
            "Year":        p.year,
            "Txn ID":      t.id || "",
            "Type":        cap(t.type),
            "Category":    t.cat,
            "Description": t.note || "",
            "Account":     t.acct,
          };
          if (t.type === "transfer") { row["To Account"] = t.toAcct || ""; row["Fee (Rp)"] = t.fee ? rnd(t.fee) : ""; }
          if (showIDR) {
            row["Money In (Rp)"]        = inAmt  ? rnd(inAmt)  : "";
            row["Money Out (Rp)"]       = outAmt ? rnd(outAmt) : "";
            row["Transfer (Rp)"]        = xfer   ? rnd(xfer)   : "";
            row["Net (Rp)"]             = rnd(inAmt - outAmt);
            row["Running Balance (Rp)"] = rnd(bal);
          }
          if (showUSD) {
            row["Net (USD)"] = usd2((inAmt - outAmt) / USD_IDR);
          }
          return row;
        });
        if (rows.length) {
          const blank = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, ""]));
          rows.push(
            { ...blank },
            { ...blank, Date: "TOTALS",
              ...(showIDR ? { "Money In (Rp)": rnd(totalInc), "Money Out (Rp)": rnd(totalExp), "Net (Rp)": rnd(totalInc - totalExp), "Running Balance (Rp)": rnd(bal) } : {}),
              ...(showUSD ? { "Net (USD)": usd2((totalInc - totalExp) / USD_IDR) } : {}),
            },
          );
        }
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No transactions in selected range" }]);
        ws["!freeze"] = { xSplit: 0, ySplit: 1 };
        af(ws, Object.keys(rows[0] || {}).length, rows.length);
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      }

      /* ── CATEGORY BREAKDOWN ──────────────────────── */
      if (sheets.has("cat")) {
        const catMap = {};
        filteredTx.forEach((t) => {
          const key = t.type + "|" + t.cat;
          if (!catMap[key]) catMap[key] = { cat: t.cat, type: t.type, count: 0, total: 0, min: Infinity, max: -Infinity };
          catMap[key].count++;
          catMap[key].total += t.amount;
          catMap[key].min = Math.min(catMap[key].min, t.amount);
          catMap[key].max = Math.max(catMap[key].max, t.amount);
        });
        const rows = Object.values(catMap)
          .sort((a, b) => a.type === b.type ? b.total - a.total : a.type === "income" ? -1 : 1)
          .map((c) => ({
            "Category":       c.cat,
            "Type":           cap(c.type),
            "Transactions":   c.count,
            ...(showIDR ? {
              "Total (Rp)":   rnd(c.total),
              "Avg / Txn (Rp)": rnd(c.total / c.count),
              "Min (Rp)":     rnd(c.min === Infinity ? 0 : c.min),
              "Max (Rp)":     rnd(c.max === -Infinity ? 0 : c.max),
            } : {}),
            "% of Type":      c.type === "income" ? (totalInc ? c.total / totalInc : 0) : (totalExp ? c.total / totalExp : 0),
            ...(showUSD ? { "Total (USD)": usd2(c.total / USD_IDR) } : {}),
          }));
        if (rows.length) {
          const blank = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, ""]));
          rows.push(
            { ...blank },
            { ...blank, Category: "Total income",   ...(showIDR ? { "Total (Rp)": rnd(totalInc) } : {}), ...(showUSD ? { "Total (USD)": usd2(totalInc / USD_IDR) } : {}) },
            { ...blank, Category: "Total expenses",  ...(showIDR ? { "Total (Rp)": rnd(totalExp) } : {}), ...(showUSD ? { "Total (USD)": usd2(totalExp / USD_IDR) } : {}) },
            { ...blank, Category: "Net",             ...(showIDR ? { "Total (Rp)": rnd(totalInc - totalExp) } : {}), ...(showUSD ? { "Total (USD)": usd2((totalInc - totalExp) / USD_IDR) } : {}) },
          );
        }
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No data" }]);
        ws["!freeze"] = { xSplit: 0, ySplit: 1 };
        af(ws, Object.keys(rows[0] || {}).length, rows.length);
        XLSX.utils.book_append_sheet(wb, ws, "Category Breakdown");
      }

      /* ── MONTHLY P&L ─────────────────────────────── */
      if (sheets.has("monthly")) {
        let history = pdata.history;
        if (range.from) history = history.filter((h) => h.date >= range.from.slice(0, 7));
        if (range.to)   history = history.filter((h) => h.date <= range.to.slice(0, 7));
        const rows = history.map((h) => {
          const net = h.income - h.expense;
          return {
            "Period":          monthLabel(h.date),
            "Month (ISO)":     h.date,
            ...(showIDR ? {
              "Income (Rp)":   rnd(h.income),
              "Expenses (Rp)": rnd(h.expense),
              "Net (Rp)":      rnd(net),
            } : {}),
            "Savings Rate":    h.income ? net / h.income : 0,
            ...(showUSD ? {
              "Income (USD)":  usd2(h.income / USD_IDR),
              "Expenses (USD)":usd2(h.expense / USD_IDR),
              "Net (USD)":     usd2(net / USD_IDR),
            } : {}),
          };
        });
        const sumInc = history.reduce((a, h) => a + h.income, 0);
        const sumExp = history.reduce((a, h) => a + h.expense, 0);
        if (rows.length) {
          const blank = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, ""]));
          rows.push(
            { ...blank },
            { ...blank, Period: "TOTAL",
              ...(showIDR ? { "Income (Rp)": rnd(sumInc), "Expenses (Rp)": rnd(sumExp), "Net (Rp)": rnd(sumInc - sumExp) } : {}),
              "Savings Rate": sumInc ? (sumInc - sumExp) / sumInc : 0,
              ...(showUSD ? { "Income (USD)": usd2(sumInc / USD_IDR), "Expenses (USD)": usd2(sumExp / USD_IDR), "Net (USD)": usd2((sumInc - sumExp) / USD_IDR) } : {}),
            },
            { ...blank, Period: "MONTHLY AVG",
              ...(showIDR ? { "Income (Rp)": rnd(sumInc / (history.length || 1)), "Expenses (Rp)": rnd(sumExp / (history.length || 1)), "Net (Rp)": rnd((sumInc - sumExp) / (history.length || 1)) } : {}),
            },
          );
        }
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No monthly history in range" }]);
        ws["!freeze"] = { xSplit: 0, ySplit: 1 };
        af(ws, Object.keys(rows[0] || {}).length, rows.length);
        XLSX.utils.book_append_sheet(wb, ws, "Monthly P&L");
      }

      /* ── ACCOUNT BALANCES ────────────────────────── */
      if (sheets.has("accounts")) {
        const rows = (accountBalances || []).map((a) => ({
          "Account":         a.name,
          "Provider":        a.provider || "",
          "Kind":            a.kind === "asset" ? "Asset" : "Liability",
          "Opening Bal (Rp)":rnd(a.opening || 0),
          ...(showIDR ? { "Current Balance (Rp)": rnd(a.balance) } : {}),
          ...(showUSD ? { "Current Balance (USD)": usd2(a.balance / USD_IDR) } : {}),
        }));
        const totalAssets = (accountBalances || []).filter((a) => a.kind === "asset").reduce((s, a) => s + a.balance, 0);
        const totalLiab   = (accountBalances || []).filter((a) => a.kind === "liability").reduce((s, a) => s + a.balance, 0);
        if (rows.length) {
          const blank = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, ""]));
          rows.push(
            { ...blank },
            { ...blank, Account: "Total Assets",      ...(showIDR ? { "Current Balance (Rp)": rnd(totalAssets) } : {}), ...(showUSD ? { "Current Balance (USD)": usd2(totalAssets / USD_IDR) } : {}) },
            { ...blank, Account: "Total Liabilities", ...(showIDR ? { "Current Balance (Rp)": rnd(totalLiab) } : {}),   ...(showUSD ? { "Current Balance (USD)": usd2(totalLiab / USD_IDR) } : {}) },
            { ...blank, Account: "Net (Assets - Liab)", ...(showIDR ? { "Current Balance (Rp)": rnd(totalAssets - totalLiab) } : {}), ...(showUSD ? { "Current Balance (USD)": usd2((totalAssets - totalLiab) / USD_IDR) } : {}) },
          );
        }
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No accounts" }]);
        ws["!freeze"] = { xSplit: 0, ySplit: 1 };
        XLSX.utils.book_append_sheet(wb, ws, "Account Balances");
      }

      /* ── SUBSCRIPTIONS ───────────────────────────── */
      if (sheets.has("sub")) {
        const subSorted = [...pdata.subscriptions].sort((a, b) => a.next.localeCompare(b.next));
        const rows = subSorted.map((s) => {
          const mo  = s.cycle === "yearly" ? s.amount / 12 : s.cycle === "weekly" ? s.amount * 4.33 : s.amount;
          const yr  = s.cycle === "monthly" ? s.amount * 12 : s.cycle === "weekly" ? s.amount * 52 : s.amount;
          const daysUntil = Math.round((new Date(s.next + "T00:00:00") - now) / 864e5);
          return {
            "Merchant":           s.merchant,
            "Billing Cycle":      cap(s.cycle),
            "Next Renewal":       s.next,
            "Days Until Renewal": daysUntil,
            "Account":            s.acct,
            ...(showIDR ? {
              "Amount / Cycle (Rp)": rnd(s.amount),
              "Monthly (Rp)":       rnd(mo),
              "Yearly (Rp)":        rnd(yr),
            } : {}),
            ...(showUSD ? {
              "Monthly (USD)":      usd2(mo / USD_IDR),
              "Yearly (USD)":       usd2(yr / USD_IDR),
            } : {}),
          };
        });
        const moBurn = subSorted.reduce((a, s) => {
          const mo = s.cycle === "yearly" ? s.amount / 12 : s.cycle === "weekly" ? s.amount * 4.33 : s.amount;
          return a + mo;
        }, 0);
        if (rows.length) {
          const blank = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, ""]));
          rows.push(
            { ...blank },
            { ...blank, Merchant: "TOTAL MONTHLY",
              ...(showIDR ? { "Monthly (Rp)": rnd(moBurn), "Yearly (Rp)": rnd(moBurn * 12) } : {}),
              ...(showUSD ? { "Monthly (USD)": usd2(moBurn / USD_IDR), "Yearly (USD)": usd2(moBurn * 12 / USD_IDR) } : {}),
            },
          );
        }
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No subscriptions" }]);
        ws["!freeze"] = { xSplit: 0, ySplit: 1 };
        af(ws, Object.keys(rows[0] || {}).length, rows.length);
        XLSX.utils.book_append_sheet(wb, ws, "Subscriptions");
      }

      /* ── INVESTMENTS ─────────────────────────────── */
      if (sheets.has("inv")) {
        const holdSorted = [...pdata.holdings].sort((a, b) => {
          const va = a.qty * a.price * (a.ccy === "USD" ? USD_IDR : 1);
          const vb = b.qty * b.price * (b.ccy === "USD" ? USD_IDR : 1);
          return vb - va;
        });
        const rows = holdSorted.map((h) => {
          const valIDR  = h.qty * h.price * (h.ccy === "USD" ? USD_IDR : 1);
          const costIDR = h.qty * h.avg   * (h.ccy === "USD" ? USD_IDR : 1);
          const pl      = valIDR - costIDR;
          return {
            "Platform":   h.platform,
            "Ticker":     h.ticker,
            "Asset Type": h.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            "Quantity":   h.qty,
            "Avg Cost":   h.avg,
            "Current Price": h.price,
            "Price Currency": h.ccy,
            ...(showIDR ? {
              "Market Value (Rp)":    rnd(valIDR),
              "Cost Basis (Rp)":      rnd(costIDR),
              "Unrealised P&L (Rp)":  rnd(pl),
            } : {}),
            "Return %":              costIDR ? pl / costIDR : 0,
            "% of Portfolio":        invValue ? valIDR / invValue : 0,
            ...(showUSD ? {
              "Market Value (USD)":   usd2(valIDR / USD_IDR),
              "Cost Basis (USD)":     usd2(costIDR / USD_IDR),
              "Unrealised P&L (USD)": usd2(pl / USD_IDR),
            } : {}),
          };
        });
        if (rows.length) {
          const blank = Object.fromEntries(Object.keys(rows[0]).map((k) => [k, ""]));
          rows.push(
            { ...blank },
            { ...blank, Platform: "TOTAL",
              ...(showIDR ? { "Market Value (Rp)": rnd(invValue), "Cost Basis (Rp)": rnd(invCost), "Unrealised P&L (Rp)": rnd(invPL) } : {}),
              "Return %": invCost ? invPL / invCost : 0,
              "% of Portfolio": 1,
              ...(showUSD ? { "Market Value (USD)": usd2(invValue / USD_IDR), "Cost Basis (USD)": usd2(invCost / USD_IDR), "Unrealised P&L (USD)": usd2(invPL / USD_IDR) } : {}),
            },
          );
        }
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No holdings" }]);
        ws["!freeze"] = { xSplit: 0, ySplit: 1 };
        af(ws, Object.keys(rows[0] || {}).length, rows.length);
        XLSX.utils.book_append_sheet(wb, ws, "Investments");
      }

      /* ── INVESTMENT TRANSACTIONS ─────────────────── */
      if (sheets.has("invtxn")) {
        const holdMap = Object.fromEntries(pdata.holdings.map((h) => [h.id, h]));
        let invTxns = [...pdata.investmentTransactions].sort((a, b) => a.date.localeCompare(b.date));
        if (range.from) invTxns = invTxns.filter((t) => t.date >= range.from);
        if (range.to)   invTxns = invTxns.filter((t) => t.date <= range.to);
        const rows = invTxns.map((t, i) => {
          const h = holdMap[t.holdingId] || {};
          const gross = t.qty * t.price;
          const net   = t.type === "buy" ? gross + (t.fees || 0) : gross - (t.fees || 0);
          return {
            "No.":           i + 1,
            "Date":          t.date,
            "Ticker":        h.ticker || t.holdingId,
            "Platform":      h.platform || "",
            "Asset Type":    h.type ? h.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "",
            "Trade Type":    cap(t.type),
            "Quantity":      t.qty || "",
            "Price":         t.price || "",
            "Currency":      h.ccy || "",
            "Fees":          t.fees || 0,
            ...(showIDR ? {
              "Gross (Rp)":  rnd(gross * (h.ccy === "USD" ? USD_IDR : 1)),
              "Net (Rp)":    rnd(net   * (h.ccy === "USD" ? USD_IDR : 1)),
              ...(t.realized ? { "Realised P&L (Rp)": rnd(t.realized * (h.ccy === "USD" ? USD_IDR : 1)) } : {}),
            } : {}),
            ...(showUSD ? {
              "Gross (USD)": usd2(gross * (h.ccy === "USD" ? 1 : 1 / USD_IDR)),
              "Net (USD)":   usd2(net   * (h.ccy === "USD" ? 1 : 1 / USD_IDR)),
            } : {}),
            "Note": t.note || "",
          };
        });
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No investment transactions in range" }]);
        ws["!freeze"] = { xSplit: 0, ySplit: 1 };
        af(ws, Object.keys(rows[0] || {}).length, rows.length);
        XLSX.utils.book_append_sheet(wb, ws, "Investment Transactions");
      }

      /* ── GOALS ───────────────────────────────────── */
      if (sheets.has("goals")) {
        const rows = pdata.goals.map((g) => {
          const pct  = g.target ? Math.min(g.current / g.target, 1) : 0;
          const days = g.deadline ? Math.round((new Date(g.deadline + "T00:00:00") - now) / 864e5) : null;
          return {
            "Goal":               g.name,
            "Kind":               g.kind === "debt" ? "Debt payoff" : "Savings",
            "Deadline":           g.deadline || "",
            "Days Remaining":     days ?? "",
            "Linked Accounts":    (g.linkedAccounts || []).join(", "),
            ...(showIDR ? {
              "Target (Rp)":      rnd(g.target),
              "Current (Rp)":     rnd(g.current),
              "Remaining (Rp)":   rnd(Math.max(0, g.target - g.current)),
            } : {}),
            "Progress %":         pct,
            ...(showUSD ? {
              "Target (USD)":     usd2(g.target / USD_IDR),
              "Current (USD)":    usd2(g.current / USD_IDR),
            } : {}),
          };
        });
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No goals" }]);
        ws["!freeze"] = { xSplit: 0, ySplit: 1 };
        XLSX.utils.book_append_sheet(wb, ws, "Goals");
      }

      /* ── BUDGETS ─────────────────────────────────── */
      if (sheets.has("budgets")) {
        const rows = pdata.budgets.map((b) => {
          const spent = filteredTx.filter((t) => t.type === "expense" && t.cat === b.cat).reduce((a, t) => a + t.amount, 0);
          const over  = Math.max(0, spent - b.monthly);
          return {
            "Category":        b.cat,
            ...(showIDR ? {
              "Monthly Budget (Rp)": rnd(b.monthly),
              "Spent in Period (Rp)": rnd(spent),
              "Remaining (Rp)":      rnd(Math.max(0, b.monthly - spent)),
              "Over Budget (Rp)":    rnd(over),
            } : {}),
            "Used %":          b.monthly ? Math.min(spent / b.monthly, 9.99) : 0,
            "Status":          spent > b.monthly ? "OVER" : spent > b.monthly * 0.8 ? "Near limit" : "OK",
            ...(showUSD ? {
              "Budget (USD)":  usd2(b.monthly / USD_IDR),
              "Spent (USD)":   usd2(spent / USD_IDR),
            } : {}),
          };
        });
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No budgets" }]);
        ws["!freeze"] = { xSplit: 0, ySplit: 1 };
        XLSX.utils.book_append_sheet(wb, ws, "Budgets");
      }

      /* ── DOWNLOAD ────────────────────────────────── */
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const rangeSlug = range.from && range.to ? `_${range.from}_${range.to}` : "";
      a.download = `Oreo_${profile.name.replace(/\s+/g, "_")}${rangeSlug}_${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (e) {
      console.error(e);
    }
    setExporting(false);
  };

  const Toggle = ({ on, onClick }) => (
    <button onClick={onClick} className="lg-btn"
      style={{ width: 40, height: 24, borderRadius: 12, border: "none", cursor: "pointer", position: "relative",
        background: on ? T.gold : T.panel2, transition: "background .2s ease", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 20, height: 20, borderRadius: 10,
        background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.2)", transition: "left .2s ease" }} />
    </button>
  );

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: T.faint, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div className="lg-modal" style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,.45)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: T.panelSolid, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 560, maxHeight: "92dvh",
        display: "flex", flexDirection: "column", boxShadow: T.shadowLg, border: `1px solid ${T.line}` }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 16px", borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileSpreadsheet size={18} color={T.greenDeep} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, letterSpacing: -0.3 }}>Export to Excel</div>
              <div style={{ fontSize: 12, color: T.faint, marginTop: 1 }}>{txCount} transaction{txCount !== 1 ? "s" : ""} in selected range</div>
            </div>
          </div>
          <button onClick={onClose} className="lg-btn" style={{ background: T.panel2, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "grid", placeItems: "center" }}>
            <X size={15} color={T.sub} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "20px 20px 0", flex: 1 }}>

          {/* Date range */}
          <Section title="Date range">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: preset === "custom" ? 10 : 0 }}>
              {PRESETS.map((p) => (
                <button key={p.value} onClick={() => setPreset(p.value)} className="lg-btn"
                  style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${preset === p.value ? T.gold : T.line}`,
                    background: preset === p.value ? `${T.gold}18` : "transparent",
                    color: preset === p.value ? T.gold : T.sub, fontSize: 12, fontWeight: preset === p.value ? 700 : 400,
                    cursor: "pointer", fontFamily: T.body }}>
                  {p.label}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                {[["From", customFrom, setCustomFrom], ["To", customTo, setCustomTo]].map(([label, val, set]) => (
                  <div key={label} style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>{label}</div>
                    <input type="date" value={val} onChange={(e) => set(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: `1px solid ${T.line}`,
                        background: T.panel2, color: T.ink, fontSize: 13, fontFamily: T.mono, outline: "none", boxSizing: "border-box", colorScheme: T.mode || "light" }} />
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Currency */}
          <Section title="Currency columns">
            <div style={{ display: "flex", gap: 6 }}>
              {[["idr", "IDR only"], ["usd", "USD only"], ["both", "Both IDR + USD"]].map(([v, l]) => (
                <button key={v} onClick={() => setCcy(v)} className="lg-btn"
                  style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1px solid ${ccy === v ? T.gold : T.line}`,
                    background: ccy === v ? `${T.gold}18` : "transparent",
                    color: ccy === v ? T.gold : T.sub, fontSize: 12, fontWeight: ccy === v ? 700 : 400,
                    cursor: "pointer", fontFamily: T.body }}>
                  {l}
                </button>
              ))}
            </div>
          </Section>

          {/* Options */}
          <Section title="Options">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: T.panel2, borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>Include transfer transactions</div>
                <div style={{ fontSize: 11, color: T.faint, marginTop: 1 }}>Internal moves between your own accounts</div>
              </div>
              <Toggle on={includeTransfers} onClick={() => setIncludeTransfers((v) => !v)} />
            </div>
          </Section>

          {/* Sheets */}
          <Section title="Sheets to include">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {SHEETS.map((s) => (
                <button key={s.id} onClick={() => toggleSheet(s.id)} className="lg-btn"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10,
                    border: "none", background: sheets.has(s.id) ? `${T.gold}0d` : "transparent", cursor: "pointer", textAlign: "left", width: "100%" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: sheets.has(s.id) ? T.ink : T.faint }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: T.faint, marginTop: 1 }}>{s.desc}</div>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${sheets.has(s.id) ? T.gold : T.line}`,
                    background: sheets.has(s.id) ? T.gold : "transparent", display: "grid", placeItems: "center", flexShrink: 0, marginLeft: 12, transition: "all .15s" }}>
                    {sheets.has(s.id) && <svg width="10" height="8" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                </button>
              ))}
            </div>
          </Section>

          <div style={{ height: 8 }} />
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.line}`, flexShrink: 0, display: "flex", gap: 10 }}>
          <button onClick={onClose} className="lg-btn"
            style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${T.line}`, background: "transparent",
              color: T.sub, cursor: "pointer", fontSize: 14, fontFamily: T.body, fontWeight: 500 }}>
            Cancel
          </button>
          <button onClick={doExport} disabled={exporting || sheets.size === 0} className="lg-btn"
            style={{ flex: 2, padding: "12px 0", borderRadius: 12, border: "none",
              background: sheets.size === 0 ? T.panel2 : T.accent,
              color: sheets.size === 0 ? T.faint : "#fff", cursor: sheets.size === 0 ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 700, fontFamily: T.body, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: sheets.size > 0 ? `0 4px 16px ${T.accent}50` : "none" }}>
            <Download size={15} />
            {exporting ? "Exporting…" : `Export ${sheets.size} sheet${sheets.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
