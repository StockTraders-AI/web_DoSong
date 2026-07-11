import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import branchLookup from "../data/branchLookup.json";
// ─────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────
const T = {
  bg:"#0A0D14", surf:"#111520", elev:"#171D2E", bdr:"#242E42", bdrs:"#1C2538",
  t1:"#F0F4FF", t2:"#A8B8D0", t3:"#5C7090", t4:"#3A4A60",
  G:"#3DD68C",  Gs:"rgba(61,214,140,.13)",  Gb:"rgba(61,214,140,.32)",
  MU:"#1A8A4A", MUs:"rgba(26,138,74,.15)",  MUb:"rgba(26,138,74,.35)",
  B:"#7C3AED",  Bs:"rgba(124,58,237,.13)",  Bb:"rgba(124,58,237,.30)",
  A:"#FF9F0A",  As:"rgba(255,159,10,.12)",  Ab:"rgba(255,159,10,.30)",
  R:"#FF2D55",  Rs:"rgba(255,45,85,.10)",   Rb:"rgba(255,45,85,.26)",
  P:"#C084FC",  Ps:"rgba(192,132,252,.10)", Pb:"rgba(192,132,252,.28)",
};

// ─────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────
const STOCK_WAVE_CURRENT_URL = import.meta.env.VITE_STOCK_WAVE_CURRENT_URL || "/api/stock-wave-current";
const STOCK_WAVE_HISTORY_URL = import.meta.env.VITE_STOCK_WAVE_HISTORY_URL || "/api/stock-wave-history";
const STOCK_WAVE_TICKERS_URL = import.meta.env.VITE_STOCK_WAVE_TICKERS_URL || "/api/stock-wave-tickers";
const WAVE_BOTTOM_CONFIRM_PAIRS_URL = import.meta.env.VITE_WAVE_BOTTOM_CONFIRM_PAIRS_URL || "/api/wave-bottom-confirm-pairs";
const REALTIME_WAVE_URL =
  import.meta.env.VITE_REALTIME_WAVE_URL ||
  import.meta.env.VITE_REALTIME_URL ||
  "http://112.213.91.235:3005/realtime";
const WAVE_CHANNEL = "wave";
const EMPTY_WAVE = {
  rawDate:"",
  date:"--/--/----",
  dow:"",
  cm:0,
  mu:0,
  cb:0,
  ba:0,
  total:0,
  tc:0,
  today:false,
  tickerB:[],
  tickerS:[],
  tickerWB:[],
  tickerWS:[],
};


const LOG = [
  { time:"15:30", icon:"ti-trending-up", color:T.G,  bg:"rgba(61,214,140,.15)",  txt:"Số lượng mã Chờ mua tăng mạnh lên 163 mã (40.5%). Khả năng tạo đáy cao – Chờ xác nhận chân sóng." },
  { time:"13:45", icon:"ti-trending-up", color:T.G,  bg:"rgba(61,214,140,.12)",  txt:"Dòng tiền bắt đầu quay lại nhóm Chứng khoán, Ngân hàng. Khuyến nghị giải ngân thăm dò 30%." },
  { time:"10:20", icon:"ti-alert-circle",color:T.A,  bg:"rgba(255,159,10,.12)",  txt:"Thị trường đang trong vùng đỡ đáy. Theo dõi sát số lượng mã Chờ mua." },
  { time:"09:15", icon:"ti-info-circle", color:T.B,  bg:"rgba(124,58,237,.12)",  txt:"VNINDEX giảm về vùng hỗ trợ mạnh 1.210 – 1.220 điểm. Khả năng xuất hiện nhịp hồi kỹ thuật." },
];

const TAB_CFG = {
  cm: { label:"Chờ mua", countKey:"cm", rowsKey:"tickerWB", bg:T.Gs, border:T.Gb, color:T.G },
  mu: { label:"Mua",     countKey:"mu", rowsKey:"tickerB",  bg:T.MUs,border:T.MUb,color:T.MU },
  cb: { label:"Chờ bán", countKey:"cb", rowsKey:"tickerWS", bg:T.As, border:T.Ab, color:T.A },
  ba: { label:"Bán",     countKey:"ba", rowsKey:"tickerS",  bg:T.Rs, border:T.Rb, color:T.R },
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWaveDate(value) {
  const date = toDate(value);
  if (!date) return "--/--/----";
  return new Intl.DateTimeFormat("vi-VN", {
    day:"2-digit",
    month:"2-digit",
    year:"numeric",
  }).format(date);
}

function formatWaveDow(value) {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", { weekday:"long" }).format(date);
}

function isToday(value) {
  const date = toDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
}

function getPreviousCalendarDate(value) {
  const date = toDate(value);
  if (!date) return "";
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}



function normalizeWaveRow(row) {
  if (!row || typeof row !== "object") return null;
  const cm = toNumber(row.waitbuy ?? row.waitBuy ?? row.wait_buy);
  const mu = toNumber(row.buy);
  const cb = toNumber(row.waitsell ?? row.waitSell ?? row.wait_sell);
  const ba = toNumber(row.sell);
  const total = toNumber(row.total) || cm + mu + cb + ba;
  const rawDate = String(row.date || row.tradingDate || row.ngay || "");

  return {
    rawDate,
    date:formatWaveDate(rawDate),
    dow:formatWaveDow(rawDate),
    cm,
    mu,
    cb,
    ba,
    total,
    tc:Math.max(0, Math.min(100, toNumber(row.reliability ?? row.tc))),
    today:isToday(rawDate),
    tickerB:Array.isArray(row.tickerB) ? row.tickerB : [],
    tickerS:Array.isArray(row.tickerS) ? row.tickerS : [],
    tickerWB:Array.isArray(row.tickerWB) ? row.tickerWB : [],
    tickerWS:Array.isArray(row.tickerwWS) ? row.tickerwWS : Array.isArray(row.tickerWS) ? row.tickerWS : Array.isArray(row.tickerWWS) ? row.tickerWWS : [],
  };
}

function formatTickerNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits:2 }).format(number);
}

function formatTickerVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits:0 }).format(number);
}

function formatVnindex(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return "-";
  return new Intl.NumberFormat("vi-VN", { minimumFractionDigits:2, maximumFractionDigits:2 }).format(number);
}

function formatSessions(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "-";
  return `${number} phiên`;
}

function getTickerBranch(item) {
  const ticker = String(item?.ticker || item?.ma || "").toUpperCase();
  return item?.branch || item?.nganh || branchLookup[ticker] || "Khác";
}

function normalizeTickerRows(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ma:item.ticker || item.ma || "-",
    nganh:getTickerBranch(item),
    gia:formatTickerNumber(item.close ?? item.gia ?? item.price),
    vol:formatTickerVolume(item.vol ?? item.volume),
    tc:Math.max(0, Math.min(100, toNumber(item.reliability ?? item.tc))),
  }));
}

function getWaveRows(payload) {
  const root = payload?.StockWaveRequest ?? payload;
  const waves = root?.stockWaves ?? root?.data?.stockWaves ?? root?.data ?? root;
  const rows = payload?.allRows ?? waves?.waveDatas ?? waves?.waveData ?? waves?.rows ?? waves?.history ?? waves?.stockWaves?.waveDatas ?? waves;
  if (Array.isArray(rows)) return rows;
  if (rows && typeof rows === "object" && (rows.date || rows.buy !== undefined)) return [rows];
  return [];
}

function normalizeWavePayload(payload) {
  return getWaveRows(payload)
    .map(normalizeWaveRow)
    .filter(Boolean)
    .sort((a, b) => String(b.rawDate).localeCompare(String(a.rawDate)))
    .map((item, index) => ({ ...item, today:index === 0 ? item.today : false }));
}

function getPreviousWaveSessions(rows, referenceDate) {
  return rows
    .filter((item) => item.rawDate && item.rawDate < referenceDate)
    .slice(0, 3)
    .map((item) => ({ ...item, today:false }));
}

function getWaveSessionOnOrBefore(rows, referenceDate) {
  if (!referenceDate) return null;
  return rows.find((item) => item.rawDate && item.rawDate <= referenceDate) || null;
}


function getSocketWaveData(payload) {
  if (payload?.channel && payload.channel !== WAVE_CHANNEL) return null;
  return payload?.data ?? payload;
}

function fetchStockWaveCurrent() {
  return fetch(STOCK_WAVE_CURRENT_URL)
    .then((response) => {
      if (!response.ok) return null;
      return response.json();
    })
    .then((payload) => {
      if (!payload) return null;
      return normalizeWavePayload(payload.data ?? payload)[0] || null;
    });
}

const stockWaveHistoryRequests = new Map();
const stockWaveTickerRequests = new Map();
let waveBottomConfirmPairsRequest = null;

function getHistoryUrl(referenceDate) {
  const url = new URL(STOCK_WAVE_HISTORY_URL, window.location.origin);
  url.searchParams.set("before", referenceDate);
  return url.toString();
}

function fetchStockWaveHistory(referenceDate) {
  if (!stockWaveHistoryRequests.has(referenceDate)) {
    const request = fetch(getHistoryUrl(referenceDate))
      .then((response) => {
        if (!response.ok) throw new Error(`Stock wave history failed: ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        const allRows = normalizeWavePayload(payload.allRows ?? payload);
        return {
          rows:getPreviousWaveSessions(allRows, referenceDate),
          allRows,
        };
      })
      .catch((error) => {
        stockWaveHistoryRequests.delete(referenceDate);
        throw error;
      });

    stockWaveHistoryRequests.set(referenceDate, request);
  }

  return stockWaveHistoryRequests.get(referenceDate);
}

function getTickersUrl(date) {
  const url = new URL(STOCK_WAVE_TICKERS_URL, window.location.origin);
  url.searchParams.set("date", date);
  return url.toString();
}

function fetchStockWaveTickers(date) {
  if (!stockWaveTickerRequests.has(date)) {
    const request = fetch(getTickersUrl(date))
      .then((response) => {
        if (!response.ok) throw new Error(`Stock wave tickers failed: ${response.status}`);
        return response.json();
      })
      .then((payload) => normalizeWavePayload(payload)[0] || null)
      .catch((error) => {
        stockWaveTickerRequests.delete(date);
        throw error;
      });

    stockWaveTickerRequests.set(date, request);
  }

  return stockWaveTickerRequests.get(date);
}

function fetchWaveBottomConfirmPairs() {
  if (!waveBottomConfirmPairsRequest) {
    waveBottomConfirmPairsRequest = fetch(WAVE_BOTTOM_CONFIRM_PAIRS_URL, { method: "POST" })
      .then((response) => {
        if (!response.ok) throw new Error(`Wave bottom confirm pairs failed: ${response.status}`);
        return response.json();
      })
      .then((payload) => Array.isArray(payload?.rows) ? payload.rows : [])
      .catch((error) => {
        waveBottomConfirmPairsRequest = null;
        throw error;
      });
  }

  return waveBottomConfirmPairsRequest;
}


// ─────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────
function Card({ children, style }) {
  return (
    <div style={{
      background: T.surf, border: `0.5px solid ${T.bdr}`,
      borderRadius: 12, padding: "14px 15px", ...style
    }}>
      {children}
    </div>
  );
}

function CardHeader({ icon, title, meta, right, mb = 12 }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:mb }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, fontWeight:700, color:T.t1 }}>
        <i className={`ti ${icon}`} style={{ fontSize:15, color:T.t3 }} />
        {title}
        {meta && <span style={{ fontSize:10, color:T.t4, fontWeight:400 }}>{meta}</span>}
      </div>
      {right}
    </div>
  );
}

function Clink({ children, onClick }) {
  return (
    <span onClick={onClick} style={{ fontSize:12, color:T.B, cursor:"pointer", fontWeight:600 }}>
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// AI ICON SVG
// ─────────────────────────────────────────────────────────────
function AIIconSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="10" stroke="rgba(255,255,255,.25)" strokeWidth="1"/>
      <circle cx="11" cy="11" r="5.5" fill="white" opacity="0.95"/>
      {[[11,5.5,11,2],[11,16.5,11,20],[5.5,11,2,11],[16.5,11,20,11]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
      ))}
      {[[7.1,7.1,4.5,4.5],[14.9,7.1,17.5,4.5],[7.1,14.9,4.5,17.5],[14.9,14.9,17.5,17.5]].map(([x1,y1,x2,y2],i)=>(
        <line key={i+4} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
      ))}
      <circle cx="11" cy="11" r="2.5" fill="#7C3AED"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN DONUT
// ─────────────────────────────────────────────────────────────
function MainDonut({ d = EMPTY_WAVE, meta = "", selectedDate = "", onDateChange }) {
  const data = { cm:d.cm, mu:d.mu, cb:d.cb, ba:d.ba };
  const total = d.total || data.cm + data.mu + data.cb + data.ba;
  const trust = Math.max(0, Math.min(100, toNumber(d.tc)));
  const order = ["cm", "mu", "cb", "ba"];
  const colors = { cm:"#1baf7a", mu:"#0ca30c", cb:"#eda100", ba:"#e34948" };
  const labels = {
    cm:"Ch\u1edd mua",
    mu:"Mua",
    cb:"Ch\u1edd b\u00e1n",
    ba:"B\u00e1n",
  };
  const boxStyles = {
    cm:{ bg:"#0A2318", border:"#0F3D22", label:T.G, num:T.G, pct:T.G },
    mu:{ bg:"#0F3D1A", border:"#1A6628", label:"#52E88A", num:T.t1, pct:"rgba(255,255,255,.65)" },
    cb:{ bg:"#2B1800", border:"#4A2E00", label:T.A, num:T.A, pct:T.A },
    ba:{ bg:"#200A0E", border:"#3D1018", label:T.R, num:T.R, pct:T.R },
  };
  const cx = 110, cy = 110, r = 95, sw = 22, gap = 5;
  const signalTotal = order.reduce((sum, key) => sum + data[key], 0);
  const drawableDeg = 360 - order.length * gap;
  const trustStyle = trust >= 70
    ? { bg:"#0D2B1A", border:"#1A5C2A", color:T.G }
    : { bg:"#2B1800", border:"#4A2E00", color:T.A };

  const pointAt = (deg) => {
    const angle = (deg - 90) * Math.PI / 180;
    return { x:cx + r * Math.cos(angle), y:cy + r * Math.sin(angle) };
  };
  const arcPath = (startDeg, endDeg) => {
    const start = pointAt(startDeg);
    const end = pointAt(endDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M${start.x.toFixed(2)} ${start.y.toFixed(2)}A${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  };

  let currentDeg = 0;
  const segments = order.map((key) => {
    if (!data[key] || !signalTotal) {
      currentDeg += gap;
      return { key, d:null, badge:null };
    }
    const span = data[key] / signalTotal * drawableDeg;
    const startDeg = currentDeg + gap / 2;
    const endDeg = startDeg + span;
    const midDeg = (startDeg + endDeg) / 2;
    currentDeg += span + gap;
    let badge = null;
    if (span > 15) {
      const point = pointAt(midDeg);
      badge = {
        x:Math.max(17, Math.min(203, point.x)),
        y:Math.max(17, Math.min(203, point.y)),
        fs:data[key] >= 100 ? 10 : data[key] >= 10 ? 13 : 15,
      };
    }
    return { key, d:arcPath(startDeg, endDeg), badge };
  });

  return (
    <div style={waveCircleStyle.card}>
      <div style={waveCircleStyle.header}>
        <div style={waveCircleStyle.title}>
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="8" fill="none" stroke={T.t3} strokeWidth="1.5" />
            <circle cx="10" cy="10" r="4" fill="none" stroke={T.t3} strokeWidth="1.5" />
            <line x1="10" y1="2" x2="10" y2="6" stroke={T.t3} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 2 A8 8 0 0 1 17 6.5" stroke={T.G} strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
          <span>{"V\u00f2ng tr\u00f2n d\u00f2 s\u00f3ng"}</span>
          {meta && <span style={waveCircleStyle.meta}>{meta}</span>}
        </div>
        <div style={waveCircleStyle.headerTools}>
          {onDateChange && (
            <label title="Ch\u1ecdn ng\u00e0y" style={waveCircleStyle.calendarButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ pointerEvents:"none" }}>
                <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                aria-label="Ch\u1ecdn ng\u00e0y v\u00f2ng tr\u00f2n d\u00f2 s\u00f3ng"
                type="date"
                value={selectedDate}
                onChange={(event) => onDateChange(event.target.value)}
                style={waveCircleStyle.calendarInput}
              />
            </label>
          )}
          {selectedDate && onDateChange && (
            <button type="button" title="Xem realtime" onClick={() => onDateChange("")} style={waveCircleStyle.clearDateButton}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <div style={{ ...waveCircleStyle.trust, background:trustStyle.bg, border:`1px solid ${trustStyle.border}`, color:trustStyle.color }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3L4 7v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7L12 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
              <polyline points="9,12 11,14 15,10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {"Tin c\u1eady"} {trust}%
          </div>
        </div>
      </div>

      <div style={waveCircleStyle.body}>
        <svg
          width="280" height="280" viewBox="0 0 220 220" style={waveCircleStyle.donut}
          role="img"
          aria-label={`V\u00f2ng tr\u00f2n d\u00f2 s\u00f3ng: t\u1ed5ng ${total} m\u00e3 theo d\u00f5i, ${signalTotal} m\u00e3 c\u00f3 t\u00edn hi\u1ec7u`}
        >
          <circle cx={cx} cy={cy} r={r} fill={T.elev} stroke={T.bdr} strokeWidth="0.5" />
          {segments.map((segment) => segment.d ? (
            <path key={segment.key} d={segment.d} stroke={colors[segment.key]} strokeWidth={sw} fill="none" strokeLinecap="round" />
          ) : null)}
          <circle cx={cx} cy={cy} r="57" fill={T.surf} stroke={T.bdr} strokeWidth="0.5" />
          {segments.map((segment) => segment.badge ? (
            <g key={`badge-${segment.key}`}>
              <circle cx={segment.badge.x.toFixed(1)} cy={segment.badge.y.toFixed(1)} r="15" fill={colors[segment.key]} />
              <text
                x={segment.badge.x.toFixed(1)} y={(segment.badge.y + 5).toFixed(1)} textAnchor="middle"
                fill="#fff" fontSize={segment.badge.fs} fontWeight="500" fontFamily="inherit"
              >
                {data[segment.key]}
              </text>
            </g>
          ) : null)}
          <text x={cx} y={cy + 11} textAnchor="middle" fill={T.t1} fontSize="30" fontWeight="700" fontFamily="inherit">
            {total}
          </text>
        </svg>

        <div style={waveCircleStyle.boxes}>
          {order.map((key) => {
            const box = boxStyles[key];
            return (
              <div key={key} style={{ ...waveCircleStyle.box, background:box.bg, border:`1px solid ${box.border}` }}>
                <div style={{ ...waveCircleStyle.boxLabel, color:box.label }}>{labels[key]}</div>
                <div style={{ ...waveCircleStyle.boxNumber, color:box.num }}>{data[key]}</div>
                <div style={{ ...waveCircleStyle.boxPercent, color:box.pct }}>
                  {total ? (data[key] / total * 100).toFixed(1) : "0.0"}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const waveCircleStyle = {
  card:{ background:T.surf, border:`0.5px solid ${T.bdr}`, borderRadius:16, padding:"22px 24px", color:T.t1, transition:"background .2s" },
  header:{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, marginBottom:20, flexWrap:"wrap" },
  title:{ display:"flex", alignItems:"center", gap:9, fontSize:17, fontWeight:700, color:T.t1 },
  meta:{ fontSize:13, color:T.t4, fontWeight:400, marginLeft:2 },
  trust:{ display:"flex", alignItems:"center", gap:7, borderRadius:30, padding:"9px 18px", fontSize:15, fontWeight:700, cursor:"pointer" },
  headerTools:{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" },
  calendarButton:{ position:"relative", width:38, height:38, borderRadius:11, border:`1px solid ${T.bdr}`, background:T.elev, display:"inline-flex", alignItems:"center", justifyContent:"center", color:T.t2, cursor:"pointer", overflow:"hidden" },
  calendarInput:{ position:"absolute", inset:0, opacity:0, cursor:"pointer", colorScheme:"dark" },
  clearDateButton:{ width:38, height:38, borderRadius:11, border:`1px solid ${T.bdr}`, background:T.elev, color:T.t2, cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center", padding:0 },
  body:{ display:"flex", alignItems:"center", gap:28, flexWrap:"wrap" },
  donut:{ flexShrink:0 },
  boxes:{ flex:1, minWidth:280, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  box:{ borderRadius:14, padding:"18px 20px", cursor:"pointer", transition:"opacity .15s" },
  boxLabel:{ fontSize:12, fontWeight:800, textTransform:"uppercase", letterSpacing:".1em", marginBottom:8 },
  boxNumber:{ fontSize:40, fontWeight:800, lineHeight:1, letterSpacing:-1 },
  boxPercent:{ fontSize:13, marginTop:6, opacity:.75 },
};
// ─────────────────────────────────────────────────────────────
// HIST DONUT CARD (single)
// ─────────────────────────────────────────────────────────────
const HIST_ORDER = ["cm", "mu", "cb", "ba"];
const HIST_LABELS = { cm:"C.MUA", mu:"MUA", cb:"C.BAN", ba:"BAN" };
const HIST_COLORS = { cm:"#1baf7a", mu:"#0ca30c", cb:"#eda100", ba:"#e34948" };
const HIST_TILES = {
  cm: { bg:"#0A2318", bd:"#0F3D22", lab:T.G, num:T.G },
  mu: { bg:"#0F3D1A", bd:"#1A6628", lab:"#52E88A", num:T.t1 },
  cb: { bg:"#2B1800", bd:"#4A2E00", lab:T.A, num:T.A },
  ba: { bg:"#200A0E", bd:"#3D1018", lab:T.R, num:T.R },
};
const HIST_GEOM = { cx:80, cy:80, r:68, sw:18, gap:5, inner:41 };

function historyPointAt(deg) {
  const angle = (deg - 90) * Math.PI / 180;
  return {
    x:HIST_GEOM.cx + HIST_GEOM.r * Math.cos(angle),
    y:HIST_GEOM.cy + HIST_GEOM.r * Math.sin(angle),
  };
}

function historyArcPath(startDeg, endDeg) {
  const start = historyPointAt(startDeg);
  const end = historyPointAt(endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M${start.x.toFixed(2)} ${start.y.toFixed(2)}A${HIST_GEOM.r} ${HIST_GEOM.r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function MiniHistoryDonut({ d, dayBg }) {
  const total = d.total || d.cm + d.mu + d.cb + d.ba;
  const signalTotal = HIST_ORDER.reduce((sum, key) => sum + d[key], 0);
  const drawableDeg = 360 - HIST_ORDER.length * HIST_GEOM.gap;
  let currentDeg = 0;
  const segments = HIST_ORDER.map((key) => {
    if (!d[key] || !signalTotal) {
      currentDeg += HIST_GEOM.gap;
      return { key, d:null, badge:null };
    }
    const span = d[key] / signalTotal * drawableDeg;
    const startDeg = currentDeg + HIST_GEOM.gap / 2;
    const endDeg = startDeg + span;
    const midDeg = (startDeg + endDeg) / 2;
    currentDeg += span + HIST_GEOM.gap;
    let badge = null;
    if (span > 12) {
      const point = historyPointAt(midDeg);
      badge = {
        x:Math.max(13, Math.min(147, point.x)),
        y:Math.max(13, Math.min(147, point.y)),
      };
    }
    return { key, d:historyArcPath(startDeg, endDeg), badge };
  });

  return (
    <svg
      width="176"
      height="176"
      viewBox="0 0 160 160"
      style={{ display:"block", margin:"10px auto 6px" }}
      role="img"
      aria-label={`Ngay ${d.date}: tong ${total} ma`}
    >
      <circle cx={HIST_GEOM.cx} cy={HIST_GEOM.cy} r={HIST_GEOM.r} fill={T.surf} stroke={T.bdr} strokeWidth="0.5" />
      {segments.map((segment) => segment.d ? (
        <path key={segment.key} d={segment.d} stroke={HIST_COLORS[segment.key]} strokeWidth={HIST_GEOM.sw} fill="none" strokeLinecap="round" />
      ) : null)}
      <circle cx={HIST_GEOM.cx} cy={HIST_GEOM.cy} r={HIST_GEOM.inner} fill={dayBg} stroke={T.bdr} strokeWidth="0.5" />
      {segments.map((segment) => segment.badge ? (
        <g key={`b-${segment.key}`}>
          <circle cx={segment.badge.x.toFixed(1)} cy={segment.badge.y.toFixed(1)} r="12" fill={HIST_COLORS[segment.key]} />
          <text
            x={segment.badge.x.toFixed(1)} y={(segment.badge.y + 4).toFixed(1)} textAnchor="middle"
            fill="#fff" fontSize="11" fontWeight="500" fontFamily="inherit"
          >
            {d[segment.key]}
          </text>
        </g>
      ) : null)}
      <text x={HIST_GEOM.cx} y={HIST_GEOM.cy + 8} textAnchor="middle" fill={T.t1} fontSize="22" fontWeight="700" fontFamily="inherit">
        {total}
      </text>
    </svg>
  );
}

function HistDonutCard({ d, active }) {
  const trust = Math.max(0, Math.min(100, toNumber(d.tc)));
  const trustColor = trust >= 70 ? T.G : T.A;
  const dayBg = active ? "#1A1230" : "#141926";

  return (
    <div style={{
      background:dayBg,
      border:`1px solid ${active ? "#4A2E8A" : T.bdr}`,
      borderRadius:14,
      padding:"16px 14px",
      textAlign:"center",
      color:T.t1,
    }}>
      <div style={{
        fontSize:15,
        fontWeight:700,
        color:active ? "#C9B8F0" : T.t2,
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        gap:8,
      }}>
        {d.date}
        {d.today && <span style={{ fontSize:11, fontWeight:700, color:"#B788FF", background:"#2E1B52", borderRadius:6, padding:"3px 8px" }}>{"H\u00f4m nay"}</span>}
      </div>
      <div style={{ fontSize:12, color:T.t4, marginTop:3 }}>{d.dow}</div>

      <MiniHistoryDonut d={d} dayBg={dayBg} />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, margin:"8px 0 12px" }}>
        {HIST_ORDER.map((key) => {
          const tile = HIST_TILES[key];
          return (
            <div key={key} style={{
              display:"flex",
              alignItems:"center",
              justifyContent:"space-between",
              gap:8,
              borderRadius:9,
              padding:"7px 11px",
              background:tile.bg,
              border:`1px solid ${tile.bd}`,
            }}>
              <span style={{ fontSize:10, fontWeight:800, letterSpacing:".07em", textTransform:"uppercase", color:tile.lab }}>{HIST_LABELS[key]}</span>
              <span style={{ fontSize:17, fontWeight:800, lineHeight:1, color:tile.num, fontFamily:'"JetBrains Mono",ui-monospace,monospace' }}>{d[key]}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:9, padding:"0 4px" }}>
        <span style={{ fontSize:12, color:T.t4, fontWeight:700 }}>TC</span>
        <div style={{ flex:1, height:5, borderRadius:3, background:T.bdr, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${trust}%`, borderRadius:3, background:trustColor }} />
        </div>
        <span style={{ fontSize:14, fontWeight:800, color:trustColor }}>{trust}%</span>
      </div>
    </div>
  );
}

function HistNavigator({ data }) {
  const [page, setPage] = useState(1);
  const perPage = 3;
  const totalDays = data.length;
  const pageCount = Math.max(1, Math.ceil(totalDays / perPage));
  const safePage = Math.min(page, pageCount);
  const from = totalDays ? (safePage - 1) * perPage + 1 : 0;
  const to = Math.min(safePage * perPage, totalDays);
  const slice = data.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => {
    setPage(1);
  }, [data]);

  const pageButton = (disabled, onClick, label, points) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      style={{
        width:38,
        height:38,
        borderRadius:11,
        background:T.elev,
        border:`1px solid ${T.bdr}`,
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        cursor:disabled ? "default" : "pointer",
        color:T.t1,
        opacity:disabled ? .35 : 1,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points={points} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );

  return (
    <Card style={{ borderRadius:16, padding:"22px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, fontSize:17, fontWeight:700, color:T.t1 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke={T.t3} strokeWidth="1.8" />
            <polyline points="12,7 12,12 15.5,14" stroke={T.t3} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {"L\u1ecbch s\u1eed d\u00f2 s\u00f3ng"}
          <span style={{ fontSize:15, color:T.t3, fontWeight:400, marginLeft:2 }}>{`(${perPage} ng\u00e0y g\u1ea7n nh\u1ea5t)`}</span>
        </div>
        {totalDays > perPage && (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {pageButton(safePage <= 1, () => setPage((value) => Math.max(1, value - 1)), "Trang truoc", "15,6 9,12 15,18")}
            <span style={{ fontSize:14, color:T.t3 }}>{from}-{to}/{totalDays}</span>
            {pageButton(safePage >= pageCount, () => setPage((value) => Math.min(pageCount, value + 1)), "Trang sau", "9,6 15,12 9,18")}
          </div>
        )}
      </div>

      {slice.length ? (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))", gap:14 }}>
            {slice.map((d, i) => (
              <HistDonutCard key={d.rawDate || d.date} d={d} active={safePage === 1 && i === 0} />
            ))}
          </div>
          {pageCount > 1 && (
            <div style={{ display:"flex", justifyContent:"center", gap:9, marginTop:16 }}>
              {Array.from({ length:pageCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Trang ${index + 1}`}
                  onClick={() => setPage(index + 1)}
                  style={{
                    width:9,
                    height:9,
                    borderRadius:"50%",
                    border:0,
                    padding:0,
                    background:index + 1 === safePage ? T.B : T.bdr,
                    cursor:"pointer",
                  }}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ color:T.t3, fontSize:12, padding:"18px 0", textAlign:"center" }}>
          {"\u0110ang ch\u1edd d\u1eef li\u1ec7u d\u00f2 s\u00f3ng..."}
        </div>
      )}
    </Card>
  );
}function DanhMucDoSong({ wave = EMPTY_WAVE }) {
  const [tab, setTab] = useState("cm");
  const [showAll, setShowAll] = useState(false);
  const cfg = TAB_CFG[tab];
  const rows = normalizeTickerRows(wave[cfg.rowsKey]);
  const count = wave[cfg.countKey] || rows.length;
  const visibleRows = showAll ? rows : rows.slice(0, 5);

  useEffect(() => {
    setShowAll(false);
  }, [tab]);

  const tdStyle = { padding:"9px 9px", borderBottom:`0.5px solid ${T.bdrs}`, whiteSpace:"nowrap" };

  return (
    <Card>
      <CardHeader
        icon="ti-list"
        title="Danh mục dò sóng"
        right={<Clink onClick={() => setShowAll((value) => !value)}>{showAll ? "Thu gọn" : "Xem tất cả →"}</Clink>}
      />
      {/* Tab buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:12 }}>
        {Object.entries(TAB_CFG).map(([key, c]) => {
          const active = key === tab;
          const tabCount = wave[c.countKey] || normalizeTickerRows(wave[c.rowsKey]).length;
          return (
            <button key={key} onClick={() => setTab(key)} style={{
              textAlign:"center", padding:"8px 4px", borderRadius:8, cursor:"pointer",
              background: active ? c.bg : T.elev,
              border: `0.5px solid ${active ? c.border : T.bdr}`,
              fontFamily:"inherit",
            }}>
              <div style={{ fontSize:13, fontWeight: active ? 700 : 500, color: active ? c.color : T.t2 }}>{c.label}</div>
              <div style={{ fontSize:11, color: active ? c.color : T.t4, opacity: active ? .8 : 1 }}>({tabCount})</div>
            </button>
          );
        })}
      </div>
      {/* Table */}
      <div style={{ maxHeight:showAll ? 260 : "none", overflowY:showAll ? "auto" : "visible", overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr>
            {["Mã","Ngành","Giá","Độ tin cậy"].map((h,i) => (
              <th key={h} style={{
                fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase",
                letterSpacing:".07em", padding:"7px 9px", borderBottom:`0.5px solid ${T.bdr}`,
                textAlign: i >= 2 ? "right" : "left", background:T.elev, whiteSpace:"nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((r, idx) => {
            const isLast = idx === visibleRows.length - 1;
            const barColor = r.tc >= 70 ? T.G : r.tc >= 55 ? T.A : T.R;
            return (
              <tr key={`${r.ma}-${idx}`} style={{ borderBottom: isLast ? "none" : `0.5px solid ${T.bdrs}` }}>
                <td style={{ ...tdStyle, fontWeight:700, color:T.B, fontSize:13 }}>{r.ma}</td>
                <td style={{ ...tdStyle, fontSize:11, color:T.t3, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis" }}>{r.nganh}</td>
                <td style={{ ...tdStyle, textAlign:"right", fontWeight:700, color:T.t1 }}>{r.gia}</td>
                <td style={{ ...tdStyle, textAlign:"right" }}>
                  <span style={{ fontWeight:700, color:barColor }}>{r.tc}%</span>
                  <span style={{ display:"inline-block", width:40, height:3, background:T.bdr,
                    borderRadius:2, overflow:"hidden", verticalAlign:"middle", marginLeft:6 }}>
                    <span style={{ display:"block", height:"100%", width:`${r.tc}%`, background:barColor, borderRadius:2 }} />
                  </span>
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={4} style={{ padding:"18px 8px", textAlign:"center", color:T.t3, fontSize:12 }}>
                Chưa có danh sách mã cho nhóm {cfg.label.toLowerCase()}.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <div
        onClick={() => setShowAll((value) => !value)}
        style={{ marginTop:10, fontSize:12, color:T.B, fontWeight:600, cursor:"pointer" }}
      >
        {showAll ? "Thu gọn" : `Xem tất cả ${count} mã ${cfg.label.toLowerCase()} →`}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// LỊCH SỬ CHÂN SÓNG
// ─────────────────────────────────────────────────────────────
function ChanSong({ data = [] }) {
  const tdStyle = { padding:"9px 9px", borderBottom:`0.5px solid ${T.bdrs}`, whiteSpace:"nowrap", fontSize:12, color:T.t2 };
  return (
    <Card>
      <CardHeader icon="ti-history" title="Lịch sử chân sóng tiêu biểu" right={<Clink>Xem tất cả →</Clink>} />
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:620 }}>
          <thead>
            <tr>
              {["Ngày xác nhận","VNINDEX","Tăng điểm","Độ dài","Độ tin cậy","Loại sóng"].map((h,i) => (
                <th key={h} style={{
                  fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase",
                  letterSpacing:".07em", padding:"7px 9px", borderBottom:`0.5px solid ${T.bdr}`,
                  textAlign: i >= 1 ? "right" : "left", background:T.elev, whiteSpace:"nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((r, idx) => {
              const reliability = toNumber(r.reliability);
              const tcC = reliability >= 70 ? T.G : reliability >= 55 ? T.A : T.R;
              const isLast = idx === data.length - 1;
              return (
                <tr key={`${r.confirm_wave_date}-${idx}`} style={{ borderBottom: isLast ? "none" : `0.5px solid ${T.bdrs}` }}>
                  <td style={tdStyle}>{formatWaveDate(r.confirm_wave_date)}</td>
                  <td style={{ ...tdStyle, textAlign:"right", fontWeight:700, color:T.t1 }}>{formatVnindex(r.vnindex)}</td>
                  <td style={{ ...tdStyle, textAlign:"right", fontWeight:700, color:T.G }}>{formatVnindex(r.increase_points)}</td>
                  <td style={{ ...tdStyle, textAlign:"right" }}>{formatSessions(r.duration_sessions)}</td>
                  <td style={{ ...tdStyle, textAlign:"right", color:tcC, fontWeight:600 }}>{reliability}%</td>
                  <td style={{ ...tdStyle, textAlign:"right" }}>
                    <span style={{
                      display:"inline-flex", alignItems:"center", fontSize:11, padding:"3px 8px",
                      borderRadius:20, border:".5px solid", fontWeight:600,
                      background: reliability >= 70 ? T.Gs : T.Bs,
                      borderColor: reliability >= 70 ? T.Gb : T.Bb,
                      color: reliability >= 70 ? T.G : T.B,
                    }}>
                      {reliability >= 70 ? "Sóng lớn" : "Sóng hồi"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!data.length && (
              <tr>
                <td colSpan={6} style={{ padding:"18px 8px", textAlign:"center", color:T.t3, fontSize:12 }}>
                  Đang chờ dữ liệu chân sóng...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:10, fontSize:12, color:T.B, fontWeight:600, cursor:"pointer" }}>
        Xem tất cả lịch sử chân sóng →
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// RIGHT PANEL: AI
// ─────────────────────────────────────────────────────────────
function AIPanel() {
  return (
    <div style={{ background:"#1C1040", border:"1px solid #5B21B6", borderRadius:12, padding:14 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, display:"flex",
          alignItems:"center", justifyContent:"center",
          background:"linear-gradient(135deg,#7C3AED,#4F46E5)" }}>
          <AIIconSvg />
        </div>
        <div style={{ fontSize:11, fontWeight:800, color:"#C4B5FD", textTransform:"uppercase", letterSpacing:".07em" }}>
          Khuyến nghị từ AI
        </div>
        {/* Pulse icon */}
        <div style={{ marginLeft:"auto", width:48, height:48, borderRadius:"50%",
          background:"rgba(61,214,140,.12)", border:"1.5px solid rgba(61,214,140,.3)",
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <polyline points="2,12 5,12 7.5,5 10.5,19 13,9 15.5,15 18,12 22,12"
              stroke={T.G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:7, lineHeight:1.35 }}>
        Khả năng tạo đáy cao – Chờ xác nhận !
      </div>
      <div style={{ fontSize:12, color:"#E9D5FF", lineHeight:1.65 }}>
        Số lượng mã Chờ mua đang chiếm tỷ trọng cao 40.5% trên tổng số 402 mã. Dòng tiền bắt đầu quay lại, thị trường đang ở vùng đỡ đáy.
      </div>
      <div style={{ background:"rgba(0,0,0,.25)", border:"1px solid rgba(255,255,255,.12)",
        borderRadius:8, padding:"9px 11px", marginTop:10, fontSize:12, fontWeight:600,
        color:"#DDD6FE", display:"flex", gap:7, alignItems:"flex-start", lineHeight:1.5 }}>
        <i className="ti ti-info-circle" style={{ fontSize:14, flexShrink:0, marginTop:1 }} />
        <span>Khuyến nghị: Giải ngân thăm dò 30% và chờ xác nhận chân sóng.</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RIGHT PANEL: Tình huống tương tự
// ─────────────────────────────────────────────────────────────
function TinhHuong() {
  return (
    <div style={{ background:T.elev, border:`0.5px solid ${T.Pb}`, borderRadius:12, padding:14 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        marginBottom:9, gap:8 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.t1, textTransform:"uppercase",
          letterSpacing:".05em", lineHeight:1.4 }}>
          Xem lại tình huống tương tự trong quá khứ
        </div>
        <button style={{ background:T.B, border:"none", borderRadius:7, padding:"5px 9px",
          fontSize:11, fontWeight:700, color:"#fff", cursor:"pointer", whiteSpace:"nowrap",
          flexShrink:0, fontFamily:"inherit" }}>
          ✦ Đề xuất
        </button>
      </div>
      <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
        <div style={{ width:40, height:40, borderRadius:9, background:T.Ps, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <i className="ti ti-trending-up" style={{ fontSize:20, color:T.P }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, color:T.t2, lineHeight:1.6 }}>
            Hệ thống đã ghi nhận 3 tình huống tương tự trước đây với tỷ lệ thành công cao. Các thị trường đều bật tăng mạnh sau khi xác nhận chân sóng.
          </div>
          <div style={{ fontSize:15, fontWeight:800, color:T.G, marginTop:7 }}>
            +217 điểm (82% thành công)
          </div>
        </div>
        <button style={{ background:T.P, border:"none", borderRadius:8, padding:"7px 11px",
          fontSize:11, fontWeight:700, color:"#fff", cursor:"pointer", whiteSpace:"nowrap",
          flexShrink:0, fontFamily:"inherit" }}>
          Xem ngay →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RIGHT PANEL: Nhật ký tín hiệu
// ─────────────────────────────────────────────────────────────
function NhatKy() {
  return (
    <Card>
      <CardHeader icon="ti-notes" title="Nhật ký tín hiệu"
        meta="19/06/2026"
        right={<Clink>Xem tất cả →</Clink>}
        mb={10}
      />
      <div>
        {LOG.map((l, idx) => (
          <div key={l.time} style={{
            display:"flex", gap:9, padding:"8px 0",
            borderBottom: idx < LOG.length - 1 ? `0.5px solid ${T.bdrs}` : "none",
          }}>
            <span style={{ fontSize:10, color:T.t4, width:36, flexShrink:0, marginTop:3, fontWeight:600 }}>
              {l.time}
            </span>
            <div style={{ width:26, height:26, borderRadius:"50%", background:l.bg,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <i className={`ti ${l.icon}`} style={{ fontSize:13, color:l.color }} />
            </div>
            <div style={{ fontSize:12, color:T.t2, lineHeight:1.55 }}>
              <strong style={{ color:T.t1 }}>AI:</strong> {l.txt}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────
export default function DoSongThiTruong() {
  const [latestWave, setLatestWave] = useState(EMPTY_WAVE);
  const [waveStatus, setWaveStatus] = useState("loading");
  const [historyWaves, setHistoryWaves] = useState([]);
  const [historyAllWaves, setHistoryAllWaves] = useState([]);
  const [selectedRealtimeDate, setSelectedRealtimeDate] = useState("");
  const [chanSongRows, setChanSongRows] = useState([]);
  const [tickerWave, setTickerWave] = useState(EMPTY_WAVE);
  const selectedRealtimeWave = selectedRealtimeDate
    ? getWaveSessionOnOrBefore(historyAllWaves, selectedRealtimeDate) || (latestWave.rawDate && latestWave.rawDate <= selectedRealtimeDate ? latestWave : EMPTY_WAVE)
    : latestWave;
  const latestTotal = selectedRealtimeWave.total || selectedRealtimeWave.cm + selectedRealtimeWave.mu + selectedRealtimeWave.cb + selectedRealtimeWave.ba;
  const tickerReferenceDate = getPreviousCalendarDate(latestWave.rawDate);
  const danhMucWave = tickerWave.rawDate
    ? { ...latestWave, ...tickerWave }
    : latestWave;
  const waveMeta = selectedRealtimeWave.rawDate
    ? `· ${latestTotal} mã · ${selectedRealtimeWave.date}${selectedRealtimeWave.dow ? ` (${selectedRealtimeWave.dow})` : ""}`
    : waveStatus === "loading"
      ? "· đang chờ realtime"
      : "· chưa có dữ liệu";

  useEffect(() => {
    let active = true;

    fetchStockWaveCurrent()
      .then((row) => {
        if (!active || !row) return;
        setLatestWave(row);
        setWaveStatus("cached");
      })
      .catch((error) => {
        console.error("Load stock wave current cache failed", error);
      });

    const socket = io(REALTIME_WAVE_URL, {
      transports:["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("message", {
        action:"subscribe",
        channels:[WAVE_CHANNEL],
      });
    });

    socket.on("message", (payload) => {
      const data = getSocketWaveData(payload);
      if (!data) return;

      const rows = normalizeWavePayload(data);
      if (!rows.length) return;

      setLatestWave(rows[0]);
      setWaveStatus("live");
    });

    socket.on("connect_error", (error) => {
      console.error("Realtime wave socket failed", error);
      setWaveStatus((current) => current === "loading" ? "error" : current);
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetchWaveBottomConfirmPairs()
      .then((rows) => {
        if (active) setChanSongRows(rows);
      })
      .catch((error) => {
        console.error("Load wave bottom confirm pairs failed", error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!latestWave.rawDate) return;

    let active = true;

    fetchStockWaveHistory(latestWave.rawDate)
      .then(({ rows, allRows }) => {
        if (!active) return;
        setHistoryWaves(rows);
        setHistoryAllWaves(allRows?.length ? allRows : rows);
      })
      .catch((error) => {
        console.error("Load stock wave history failed", error);
      });

    return () => {
      active = false;
    };
  }, [latestWave.rawDate]);


  useEffect(() => {
    if (!tickerReferenceDate) return;

    let active = true;

    fetchStockWaveTickers(tickerReferenceDate)
      .then((row) => {
        if (!active) return;
        setTickerWave(row || EMPTY_WAVE);
      })
      .catch((error) => {
        console.error("Load stock wave ticker list failed", error);
      });

    return () => {
      active = false;
    };
  }, [tickerReferenceDate]);

  return (
    <>
      <style>{`
        @import url('https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/3.19.0/iconfont/tabler-icons.min.css');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased}
        body{background:${T.bg};color:${T.t1};font-family:-apple-system,"Inter","Segoe UI",sans-serif;font-size:13px}
        button{font-family:inherit}
        ::-webkit-scrollbar{width:5px;height:4px}
        ::-webkit-scrollbar-thumb{background:${T.bdr};border-radius:3px}
      `}</style>

      <div style={{
        background: T.bg, color: T.t1,
        fontFamily: '-apple-system,"Inter","Segoe UI",sans-serif',
        fontSize: 13, padding: "18px 22px 32px",
        minHeight: "100vh",
      }}>
        {/* 2-column equal layout */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

          {/* ── CỘT TRÁI ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Vòng tròn dò sóng */}
            <MainDonut
              d={selectedRealtimeWave}
              meta={waveMeta}
              selectedDate={selectedRealtimeDate}
              onDateChange={setSelectedRealtimeDate}
            />

            {/* Lịch sử dò sóng */}
            <HistNavigator data={historyAllWaves.length ? historyAllWaves : historyWaves} />

            {/* Lịch sử chân sóng */}
            <ChanSong data={chanSongRows} />
          </div>

          {/* ── CỘT PHẢI ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <AIPanel />
            <TinhHuong />
            <DanhMucDoSong wave={danhMucWave} />
            <NhatKy />
          </div>
        </div>
      </div>
    </>
  );
}
