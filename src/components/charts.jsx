import React, { useState, useRef, useEffect } from 'react';
import { T } from '../globals.js';
import { fmtCompact } from '../utils/format.js';
// Note: DISPLAY, USD_IDR, PRIVATE are accessed via live bindings through globals.js
import { DISPLAY, USD_IDR, PRIVATE } from '../globals.js';

/* ============================ CHARTS ============================ */
export function Sparkline({ points, w = 96, h = 30, color = T.accent }) {
  if (!points || points.length < 2) return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} />;
  const max = Math.max(...points), min = Math.min(...points);
  const rng = max - min || 1;
  const step = w / (points.length - 1);
  const pts = points.map((p, i) => [i * step, h - ((p - min) / rng) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = d + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" style={{ animation: "fadeIn 1s ease both" }} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "drawLine 1s cubic-bezier(.4,0,.2,1) forwards" }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} style={{ transformBox: "fill-box", transformOrigin: "center", animation: "dotPop .4s ease .9s both" }} />
    </svg>
  );
}

export function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export function GrowthChart({ data, invested = [], chartId = "main" }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const W = 340, H = 188, padT = 28, padL = 20, padR = 58, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const hasInvested = invested.length > 0 && invested.some((d) => d.value > 0);

  if (!data || data.length === 0) {
    return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <text x={(W - padR) / 2} y={H / 2 - 8} textAnchor="middle" fill={T.faint} style={{ fontFamily: T.body, fontSize: 13 }}>No data yet</text>
      <text x={(W - padR) / 2} y={H / 2 + 10} textAnchor="middle" fill={T.faint} style={{ fontFamily: T.body, fontSize: 10 }}>Add transactions to see trends</text>
    </svg>;
  }
  if (data.length < 3) {
    const lastVal = data[data.length - 1]?.value || 0;
    const dispVal = PRIVATE ? (DISPLAY === "USD" ? "$••" : "Rp ••") : fmtCompact(lastVal);
    return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <circle cx={(W - padR) / 2} cy={H / 2 - 18} r="24" fill={`${T.accent}14`} />
      <text x={(W - padR) / 2} y={H / 2 - 13} textAnchor="middle" fill={T.accent} style={{ fontFamily: T.mono, fontWeight: 700, fontSize: 14 }}>{dispVal}</text>
      <text x={(W - padR) / 2} y={H / 2 + 8} textAnchor="middle" fill={T.faint} style={{ fontFamily: T.body, fontSize: 10 }}>Not enough history for a trend line</text>
    </svg>;
  }

  // Y scale: encompass both series
  const allVals = [...data.map((d) => d.value), ...(hasInvested ? invested.map((d) => d.value) : [])];
  const dataMin = Math.min(...allVals), dataMax = Math.max(...allVals);
  const rough = Math.max((dataMax - dataMin) / 3, Math.abs(dataMax) * 0.05, 1);
  const exp = Math.floor(Math.log10(rough));
  const base = Math.pow(10, exp);
  const step = [1, 2, 5, 10].map((s) => s * base).find((s) => s >= rough) || base;
  const yMin = Math.floor(dataMin / step) * step;
  const yMax = Math.ceil(dataMax / step) * step;
  const ticks = []; for (let v = yMin; v <= yMax + step * 0.001; v += step) ticks.push(Math.round(v));

  const fmtAxis = (v) => {
    if (PRIVATE) return "••";
    const val = DISPLAY === "USD" ? v / USD_IDR : v;
    const pfx = DISPLAY === "USD" ? "$" : "Rp ";
    if (val === 0) return pfx + "0";
    if (Math.abs(val) >= 1e9) return pfx + (val / 1e9).toFixed(1) + "B";
    if (Math.abs(val) >= 1e6) return pfx + (val / 1e6).toFixed(1) + "M";
    if (Math.abs(val) >= 1000) return pfx + (val / 1e3).toFixed(1) + "K";
    return pfx + Math.round(val);
  };

  const range = yMax - yMin || 1;
  const denom = Math.max(1, data.length - 1);
  const x = (i) => padL + (i / denom) * plotW;
  const yv = (v) => padT + plotH - ((v - yMin) / range) * plotH;
  const pts = data.map((d, i) => [x(i), yv(d.value)]);
  const iPts = hasInvested ? invested.map((d, i) => [x(i), yv(d.value)]) : [];

  const lineD = data.length === 1
    ? `M ${x(0)} ${pts[0][1]} L ${padL + plotW} ${pts[0][1]}`
    : pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const areaD = lineD + ` L ${pts[pts.length - 1][0].toFixed(1)} ${yv(yMin).toFixed(1)} L ${pts[0][0].toFixed(1)} ${yv(yMin).toFixed(1)} Z`;
  const invD = hasInvested && iPts.length > 1
    ? iPts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") : "";

  const last = pts[pts.length - 1];
  const nLab = Math.min(data.length, 6);
  const showIdx = new Set();
  for (let j = 0; j < nLab; j++) showIdx.add(Math.round((j * (data.length - 1)) / Math.max(1, nLab - 1)));

  const pick = (clientX) => {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let nearest = 0, best = Infinity;
    for (let i = 0; i < data.length; i++) { const dd = Math.abs(x(i) - px); if (dd < best) { best = dd; nearest = i; } }
    setHover(nearest);
  };

  const INVESTED_COLOR = "#8b5cf6"; // purple

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
      onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)}
      onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)} onTouchEnd={() => setHover(null)}>
      <defs>
        <linearGradient id={`gGrow_${chartId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={T.accent}  stopOpacity="0.65" />
          <stop offset="40%"  stopColor={T.accent}  stopOpacity="0.25" />
          <stop offset="100%" stopColor={T.accent}  stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`gGrowLine_${chartId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={T.accentDeep || T.goldDeep} />
          <stop offset="50%" stopColor={T.accent} />
          <stop offset="100%" stopColor={T.accent2 || T.gold2} />
        </linearGradient>
        <filter id={`glow_${chartId}`} x="-20%" y="-60%" width="140%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Mini legend top-left */}
      {hasInvested && (<>
        <circle cx={padL + 6} cy={padT - 14} r="3.5" fill={T.accent} />
        <text x={padL + 13} y={padT - 10} fill={T.sub} fontSize="8" fontFamily={T.mono}>Net worth</text>
        <circle cx={padL + 68} cy={padT - 14} r="3.5" fill={INVESTED_COLOR} opacity="0.75" />
        <text x={padL + 75} y={padT - 10} fill={T.sub} fontSize="8" fontFamily={T.mono}>Invested capital</text>
      </>)}

      {/* Y-axis gridlines */}
      {ticks.map((v, i) => {
        const yy = yv(v);
        if (yy < padT - 2 || yy > padT + plotH + 2) return null;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke={T.line} strokeWidth={1} strokeDasharray="2 4" />
            <line x1={W - padR} x2={W - padR + 4} y1={yy} y2={yy} stroke={T.faint} strokeWidth={1} />
            <text x={W - padR + 11} y={yy + 3.5} textAnchor="start" fill={T.sub} fontSize="7" fontFamily={T.mono}>{fmtAxis(v)}</text>
          </g>
        );
      })}

      {/* Invested capital line (behind net worth) */}
      {invD && <>
        <path d={invD} fill="none" stroke={INVESTED_COLOR} strokeWidth="1.5" strokeDasharray="5 3"
          opacity="0.6" pathLength="1" style={{ strokeDasharray: "5 3", animation: "drawLine 1.4s cubic-bezier(.4,0,.2,1) .1s forwards" }} />
      </>}

      {/* Net worth area + line */}
      <path d={areaD} fill={`url(#gGrow_${chartId})`} style={{ animation: "fadeIn 1.1s ease both" }} />
      {/* Glow layer — blurred copy of the line underneath */}
      <path d={lineD} fill="none" stroke={T.accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
        opacity="0.3" filter={`url(#glow_${chartId})`}
        pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "drawLine 1.2s cubic-bezier(.4,0,.2,1) forwards" }} />
      <path d={lineD} fill="none" stroke={`url(#gGrowLine_${chartId})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "drawLine 1.2s cubic-bezier(.4,0,.2,1) forwards" }} />

      {/* End dot with glow ring */}
      <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: "dotPop .5s cubic-bezier(.2,.8,.3,1) 1s both" }}>
        <circle cx={last[0]} cy={last[1]} r="10" fill={T.accent} opacity="0.10" />
        <circle cx={last[0]} cy={last[1]} r="5.5" fill={T.accent} opacity="0.22" />
        <circle cx={last[0]} cy={last[1]} r="2.8" fill={T.accent2 || T.gold2} />
      </g>

      {/* X-axis labels */}
      {data.map((d, i) => {
        if (!showIdx.has(i)) return null;
        return <text key={i} x={x(i)} y={padT + plotH + 16} textAnchor="middle" fill={T.sub}
          style={{ fontFamily: T.mono, fontSize: 8 }}>{d.label}</text>;
      })}

      {/* Hover crosshair + dual tooltip */}
      {hover !== null && data[hover] && (() => {
        const hx = x(hover), hy = yv(data[hover].value);
        const iVal = hasInvested && invested[hover] ? invested[hover].value : null;
        const dateLabel = data[hover].full || data[hover].label;
        const nwLabel = fmtAxis(data[hover].value);
        const invLabel = iVal !== null ? fmtAxis(iVal) : null;
        const tipW = Math.max(72, dateLabel.length * 4.5 + 16, nwLabel.length * 6 + 20);
        const tipH = iVal !== null ? 44 : 30;
        let tipX = hx - tipW / 2;
        tipX = Math.max(padL, Math.min(tipX, W - padR - tipW));
        const tipY = Math.max(padT, hy - tipH - 10);
        return (
          <g style={{ pointerEvents: "none" }}>
            <line x1={hx} x2={hx} y1={padT} y2={padT + plotH} stroke={T.faint} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
            <circle cx={hx} cy={hy} r="5.5" fill={T.accent} opacity={0.2} />
            <circle cx={hx} cy={hy} r="3.5" fill={T.accent} stroke={T.panelSolid} strokeWidth="1.5" />
            {iVal !== null && (() => { const iy = yv(iVal); return <><circle cx={hx} cy={iy} r="3" fill={INVESTED_COLOR} stroke={T.panelSolid} strokeWidth="1.5" opacity="0.8" /></>; })()}
            <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={6} fill={T.panelSolid} stroke={T.lineSolid} strokeWidth={1} style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.18))" }} />
            <text x={tipX + tipW / 2} y={tipY + 11} textAnchor="middle" fill={T.faint} fontSize="7.5" fontFamily={T.mono}>{dateLabel}</text>
            <circle cx={tipX + 10} cy={tipY + 22} r="2.5" fill={T.accent} />
            <text x={tipX + 15} y={tipY + 25} fill={T.ink} fontSize="9.5" fontWeight="700" fontFamily={T.mono}>{nwLabel}</text>
            {invLabel && <>
              <circle cx={tipX + 10} cy={tipY + 36} r="2.5" fill={INVESTED_COLOR} opacity="0.8" />
              <text x={tipX + 15} y={tipY + 39} fill={T.sub} fontSize="9" fontFamily={T.mono}>{invLabel}</text>
            </>}
          </g>
        );
      })()}
    </svg>
  );
}

export function CashFlowChart({ data }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const W = 320, H = 156, padTop = 16;
  const padX = 16;
  const padBot = 28;

  if (!data || data.length === 0) {
    return <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <text x={W / 2} y={H / 2} textAnchor="middle" fill={T.faint} style={{ fontFamily: T.body, fontSize: 12 }}>No transactions in this range</text>
    </svg>;
  }

  const hasRealized = data.some((d) => d.realized && d.realized !== 0);
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense, Math.abs(d.realized || 0)]), 1);
  const plotH = H - padTop - padBot;
  const groupW = (W - padX * 2) / data.length;
  const bw = Math.max(2, Math.min(Math.floor(groupW * (hasRealized ? 0.26 : 0.38)), 18));
  const gap = Math.max(1, Math.min(3, Math.floor(groupW * 0.08)));
  const y = (v) => padTop + plotH - (v / max) * plotH;
  const gx = (i) => padX + groupW * i + groupW / 2;

  const nLab = Math.min(data.length, 6);
  const showIdx = new Set();
  for (let j = 0; j < nLab; j++) showIdx.add(Math.round((j * (data.length - 1)) / Math.max(1, nLab - 1)));

  const pick = (clientX) => {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let n = 0, best = Infinity;
    for (let i = 0; i < data.length; i++) { const dd = Math.abs(gx(i) - px); if (dd < best) { best = dd; n = i; } }
    setHover(n);
  };

  const fmt = (v) => fmtCompact(v);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
      onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)}
      onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)} onTouchEnd={() => setHover(null)}>
      <defs>
        <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#86efac" /><stop offset="100%" stopColor={T.greenDeep} />
        </linearGradient>
        <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f9a8c4" /><stop offset="100%" stopColor={T.red} />
        </linearGradient>
        <pattern id="hatchIn" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="url(#gIn)" /><line x1="0" y1="0" x2="0" y2="5" stroke="#ffffff" strokeWidth="1.6" opacity="0.45" />
        </pattern>
        <pattern id="hatchOut" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="url(#gOut)" /><line x1="0" y1="0" x2="0" y2="5" stroke="#ffffff" strokeWidth="1.6" opacity="0.5" />
        </pattern>
        <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" /><stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {[0.5, 1].map((g, i) => {
        const yy = padTop + plotH - g * plotH;
        return (
          <g key={i}>
            <line x1={padX} x2={W - padX} y1={yy} y2={yy} stroke={T.line} strokeWidth={1} strokeDasharray="2 4" />
            {g === 1 && <text x={padX} y={yy - 3} textAnchor="start" fill={T.faint} fontSize="7" fontFamily={T.mono}>{fmt(max)}</text>}
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = gx(i);
        const lbl = d.label || d.m;
        const dim = hover !== null && hover !== i ? 0.35 : 1;
        return (
          <g key={i} style={{ opacity: dim, transition: "opacity .12s ease" }}>
            {hasRealized ? (<>
              <rect x={cx - bw * 1.5 - gap} y={y(d.income)} width={bw} height={padTop + plotH - y(d.income)} rx={2} fill="url(#hatchIn)"
                style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `growBar .55s cubic-bezier(.2,.8,.3,1) ${i * 0.05}s both` }} />
              {(d.realized || 0) !== 0
                ? <rect x={cx - bw / 2} y={y(Math.abs(d.realized))} width={bw} height={padTop + plotH - y(Math.abs(d.realized))} rx={2}
                    fill={d.realized >= 0 ? "url(#gReal)" : T.red} opacity={0.85}
                    style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `growBar .55s cubic-bezier(.2,.8,.3,1) ${i * 0.05 + 0.02}s both` }} />
                : <line x1={cx} x2={cx} y1={padTop + 4} y2={padTop + plotH} stroke="#d97706" strokeWidth={1} strokeDasharray="2 3" opacity={0.15} />
              }
              <rect x={cx + gap + bw / 2} y={y(d.expense)} width={bw} height={padTop + plotH - y(d.expense)} rx={2} fill="url(#hatchOut)"
                style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `growBar .55s cubic-bezier(.2,.8,.3,1) ${i * 0.05 + 0.04}s both` }} />
            </>) : (<>
              <rect x={cx - bw - gap / 2} y={y(d.income)} width={bw} height={padTop + plotH - y(d.income)} rx={2} fill="url(#hatchIn)"
                style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `growBar .55s cubic-bezier(.2,.8,.3,1) ${i * 0.05}s both` }} />
              <rect x={cx + gap / 2} y={y(d.expense)} width={bw} height={padTop + plotH - y(d.expense)} rx={2} fill="url(#hatchOut)"
                style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `growBar .55s cubic-bezier(.2,.8,.3,1) ${i * 0.05 + 0.03}s both` }} />
            </>)}
            {showIdx.has(i) && hover === null && (
              <text x={cx} y={H - 9} textAnchor="middle"
                fill={T.faint} style={{ fontFamily: T.mono, fontSize: 8 }}>{lbl}</text>
            )}
          </g>
        );
      })}

      {/* Hover tooltip */}
      {hover !== null && data[hover] && (() => {
        const d = data[hover];
        const cx = gx(hover);
        const showReal = hasRealized && (d.realized || 0) !== 0;
        const tipW = 102, tipH = showReal ? 63 : 50;
        let tipX = cx - tipW / 2;
        tipX = Math.max(padX, Math.min(tipX, W - padX - tipW));
        return (
          <g style={{ pointerEvents: "none" }}>
            <rect x={tipX} y={2} width={tipW} height={tipH} rx={7} fill={T.panelSolid} stroke={T.lineSolid} strokeWidth={1} style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.18))" }} />
            <text x={tipX + tipW / 2} y={14} textAnchor="middle" fill={T.sub} fontSize="7.5" fontWeight="700" fontFamily={T.mono}>{d.label || d.m}</text>
            <line x1={tipX + 8} x2={tipX + tipW - 8} y1={18} y2={18} stroke={T.line} strokeWidth={0.8} />
            <circle cx={tipX + 11} cy={29} r={2.6} fill={T.greenDeep} />
            <text x={tipX + 18} y={32} textAnchor="start" fill={T.sub} fontSize="8" fontFamily={T.mono}>In</text>
            <text x={tipX + tipW - 9} y={32} textAnchor="end" fill={T.greenDeep} fontSize="8.5" fontWeight="700" fontFamily={T.mono}>+{fmt(d.income)}</text>
            <circle cx={tipX + 11} cy={42} r={2.6} fill={T.red} />
            <text x={tipX + 18} y={45} textAnchor="start" fill={T.sub} fontSize="8" fontFamily={T.mono}>Out</text>
            <text x={tipX + tipW - 9} y={45} textAnchor="end" fill={T.red} fontSize="8.5" fontWeight="700" fontFamily={T.mono}>−{fmt(d.expense)}</text>
            {showReal && <>
              <circle cx={tipX + 11} cy={55} r={2.6} fill="#d97706" />
              <text x={tipX + 18} y={58} textAnchor="start" fill={T.sub} fontSize="8" fontFamily={T.mono}>P&amp;L</text>
              <text x={tipX + tipW - 9} y={58} textAnchor="end" fill={d.realized >= 0 ? "#d97706" : T.red} fontSize="8.5" fontWeight="700" fontFamily={T.mono}>{d.realized >= 0 ? "+" : "−"}{fmt(Math.abs(d.realized))}</text>
            </>}
          </g>
        );
      })()}
    </svg>
  );
}

export function Donut({ segments, size = 130, thickness = 19, centerTop, centerBot, onSegmentClick }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const [on, setOn] = useState(false);
  const [hovSeg, setHovSeg] = useState(null);
  useEffect(() => { const id = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(id); }, []);
  let acc = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, flexShrink: 0, filter: "drop-shadow(0 4px 10px rgba(17,24,39,0.12))", cursor: onSegmentClick ? "pointer" : "default" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.lineSolid} strokeWidth={thickness} opacity={0.5} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((s, i) => {
          const raw = (s.value / total) * c;
          const len = Math.max(0, raw - 3);
          const isHov = hovSeg === i;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={isHov ? thickness + 3 : thickness}
              strokeDasharray={`${on ? len : 0.001} ${c}`} strokeDashoffset={-acc} strokeLinecap="round"
              style={{ transition: `stroke-dasharray .8s cubic-bezier(.3,.85,.3,1) ${i * 0.12}s, stroke-width .15s ease`, cursor: onSegmentClick ? "pointer" : "default" }}
              onMouseEnter={() => setHovSeg(i)} onMouseLeave={() => setHovSeg(null)}
              onClick={() => onSegmentClick && onSegmentClick(s.label)} />
          );
          acc += raw;
          return el;
        })}
      </g>
      {centerTop && <text x={size / 2} y={size / 2 - 1} textAnchor="middle" fill={T.ink} style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 600, animation: "fadeIn .6s ease .5s both" }}>{centerTop}</text>}
      {centerBot && <text x={size / 2} y={size / 2 + 15} textAnchor="middle" fill={T.faint} style={{ fontFamily: T.body, fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", animation: "fadeIn .6s ease .5s both" }}>{centerBot}</text>}
      {hovSeg !== null && segments[hovSeg] && (
        <text x={size / 2} y={size / 2 + 32} textAnchor="middle" fill={T.sub} style={{ fontFamily: T.body, fontSize: 8.5, pointerEvents: "none" }}>{onSegmentClick ? "click to filter" : ""}</text>
      )}
    </svg>
  );
}

export function Legend({ segments }) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 0 }}>
      {segments.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 9, height: 9, borderRadius: 3, background: s.color, flexShrink: 0, boxShadow: `0 0 8px ${s.color}88` }} />
          <span style={{ fontSize: 12.5, color: T.sub, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
          <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.ink }}>{Math.round((s.value / total) * 100)}%</span>
        </div>
      ))}
    </div>
  );
}
