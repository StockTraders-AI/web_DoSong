import { useEffect, useState } from "react";
import { io } from "socket.io-client";
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

const CHAN_SONG = [
  { ngay:"09/04/2026", vi:"1,073.61", tc:82, tang:"+300.36", doi:"21 phiên", big:true },
  { ngay:"20/02/2026", vi:"1,202.57", tc:76, tang:"+250.68", doi:"17 phiên", big:true },
  { ngay:"10/01/2026", vi:"1,158.23", tc:71, tang:"+185.44", doi:"15 phiên", big:false },
  { ngay:"12/11/2025", vi:"1,198.47", tc:73, tang:"+182.12", doi:"18 phiên", big:false },
  { ngay:"19/09/2025", vi:"1,265.11", tc:68, tang:"+215.29", doi:"13 phiên", big:false },
];

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

function normalizeTickerRows(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({
    ma:item.ticker || item.ma || "-",
    gia:formatTickerNumber(item.close ?? item.gia ?? item.price),
    vol:formatTickerVolume(item.vol ?? item.volume),
    tc:Math.max(0, Math.min(100, toNumber(item.reliability ?? item.tc))),
  }));
}
function getWaveRows(payload) {
  const root = payload?.StockWaveRequest ?? payload;
  const waves = root?.stockWaves ?? root?.data?.stockWaves ?? root?.data ?? root;
  const rows = waves?.waveDatas ?? waves?.waveData ?? waves?.rows ?? waves?.history ?? waves?.stockWaves?.waveDatas ?? waves;
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
      .then((payload) => getPreviousWaveSessions(normalizeWavePayload(payload), referenceDate))
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

function arcPath(cx, cy, r, sw, pct, color, off) {
  const c = 2 * Math.PI * r, d = c * pct / 100, g = c - d;
  return (
    <circle key={`${color}-${off}`}
      cx={cx} cy={cy} r={r} fill="none"
      stroke={color} strokeWidth={sw}
      strokeDasharray={`${d.toFixed(1)} ${g.toFixed(1)}`}
      strokeDashoffset={`${(-c * off / 100).toFixed(1)}`}
      strokeLinecap="butt"
      style={{ transform:`rotate(-90deg)`, transformOrigin:`${cx}px ${cy}px` }}
    />
  );
}

function tcColor(tc) {
  return tc >= 70 ? T.G : tc >= 55 ? T.MU : T.t3;
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
function MainDonut({ d = EMPTY_WAVE }) {
  const { cm, mu, cb, ba } = d;
  const tot = d.total || cm + mu + cb + ba;
  const denom = Math.max(tot, cm + mu + cb + ba, 1);
  const pC = cm / denom * 100, pM = mu / denom * 100, pCb = cb / denom * 100, pB = ba / denom * 100;

  const corners = [
    { val:cm,  pct:(pC).toFixed(1),  color:T.G,  pos:{ top:2, left:2 }, align:"left" },
    { val:mu,  pct:(pM).toFixed(1),  color:T.MU, pos:{ top:2, right:2 }, align:"right" },
    { val:ba,  pct:(pB).toFixed(1),  color:T.R,  pos:{ bottom:2, left:2 }, align:"left" },
    { val:cb,  pct:(pCb).toFixed(1), color:T.A,  pos:{ bottom:2, right:2 }, align:"right" },
  ];

  return (
    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
      {/* Info boxes */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, width:120, flexShrink:0 }}>
        <div style={{ background:T.elev, border:`0.5px solid ${T.bdr}`, borderRadius:9, padding:"10px 12px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:T.t3, marginBottom:5 }}>
            <i className="ti ti-calendar" style={{ fontSize:12 }} />Ngày gần nhất
          </div>
          <div style={{ fontSize:15, fontWeight:800, color:T.t1, lineHeight:1.2 }}>{d.date}</div>
          {d.dow && <div style={{ fontSize:10, color:T.t3, marginTop:2 }}>({d.dow})</div>}
        </div>
        <div style={{ background:T.elev, border:`0.5px solid ${T.bdr}`, borderRadius:9, padding:"10px 12px" }}>
          <div style={{ fontSize:10, color:T.t3, marginBottom:4, lineHeight:1.4 }}>Tổng số mã hệ thống</div>
          <div style={{ fontSize:22, fontWeight:800, color:T.t1, lineHeight:1 }}>{tot}</div>
          <div style={{ fontSize:10, color:T.t3, marginTop:2 }}>mã cổ phiếu</div>
        </div>
        {/* Legend */}
        <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:2 }}>
          {[["Chờ mua",T.G],["Mua",T.MU],["Chờ bán",T.A],["Bán",T.R]].map(([n,c])=>(
            <div key={n} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ width:9, height:9, borderRadius:"50%", background:c, flexShrink:0 }} />
              <span style={{ fontSize:11, color:T.t2 }}>{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Donut + corner numbers */}
      <div style={{ flex:1, position:"relative", display:"flex", alignItems:"center", justifyContent:"center", minHeight:190 }}>
        <svg width="190" height="190" viewBox="0 0 190 190"
          role="img" aria-label={`Vòng tròn dò sóng: ${cm} Chờ mua, ${mu} Mua, ${cb} Chờ bán, ${ba} Bán`}>
          <circle cx="95" cy="95" r="72" fill="none" stroke={T.bdr} strokeWidth="24"/>
          {arcPath(95,95,72,24,pC,T.G,0)}
          {arcPath(95,95,72,24,pM,T.MU,pC)}
          {arcPath(95,95,72,24,pCb,T.A,pC+pM)}
          {arcPath(95,95,72,24,pB,T.R,pC+pM+pCb)}
          <text x="95" y="88" textAnchor="middle" fill={T.t1} fontSize="34" fontWeight="800" fontFamily="system-ui">{tot}</text>
        </svg>
        {corners.map((c,i) => (
          <div key={i} style={{ position:"absolute", textAlign:c.align, ...c.pos }}>
            <div style={{ fontSize:18, fontWeight:800, color:c.color, lineHeight:1 }}>{c.val}</div>
            <div style={{ fontSize:10, color:c.color, opacity:.8 }}>{c.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────
// HIST DONUT CARD (single)
// ─────────────────────────────────────────────────────────────
function HistDonutCard({ d, active }) {
  const tot = d.total || d.cm + d.mu + d.cb + d.ba;
  const denom = Math.max(tot, d.cm + d.mu + d.cb + d.ba, 1);
  const pC = d.cm/denom*100, pM = d.mu/denom*100, pCb = d.cb/denom*100, pB = d.ba/denom*100;
  const tc = tcColor(d.tc);

  return (
    <div style={{
      background: active ? T.Bs : T.elev,
      border: `0.5px solid ${active ? T.Bb : T.bdr}`,
      borderRadius:10, padding:"11px 9px",
      display:"flex", flexDirection:"column", gap:0,
    }}>
      {/* Date header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <span style={{ fontSize:11, fontWeight:600, color:T.t2 }}>{d.date}</span>
        {d.today && (
          <span style={{ fontSize:9, background:`rgba(124,58,237,.25)`, color:"#C4B5FD",
            borderRadius:4, padding:"2px 5px", fontWeight:600 }}>Hôm nay</span>
        )}
      </div>
      <div style={{ fontSize:10, color:T.t3, marginBottom:8 }}>{d.dow}</div>

      {/* Donut */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
        <svg width="96" height="96" viewBox="0 0 96 96"
          role="img" aria-label={`Donut ${d.date}: ${d.cm} Chờ mua, ${d.mu} Mua, ${d.cb} Chờ bán, ${d.ba} Bán`}>
          <circle cx="48" cy="48" r="36" fill="none" stroke={T.bdr} strokeWidth="13"/>
          {arcPath(48,48,36,13,pC,T.G,0)}
          {arcPath(48,48,36,13,pM,T.MU,pC)}
          {arcPath(48,48,36,13,pCb,T.A,pC+pM)}
          {arcPath(48,48,36,13,pB,T.R,pC+pM+pCb)}
          <text x="48" y="43" textAnchor="middle" fill={T.t1} fontSize="17" fontWeight="800" fontFamily="system-ui">{tot}</text>
          <text x="48" y="56" textAnchor="middle" fill={T.t3} fontSize="9" fontFamily="system-ui">mã</text>
        </svg>
      </div>

      {/* 4 numbers 2x2 */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 0", marginBottom:8 }}>
        {[
          [d.cm, pC, T.G,  "C.MUA", "left"],
          [d.mu, pM, T.MU, "MUA",   "right"],
          [d.ba, pB, T.R,  "BÁN",   "left"],
          [d.cb, pCb,T.A,  "C.BÁN", "right"],
        ].map(([v, p, c, lbl, align]) => (
          <div key={lbl} style={{ textAlign:align }}>
            <div style={{ fontSize:15, fontWeight:800, color:c, lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:8, color:T.t4, textTransform:"uppercase", letterSpacing:".04em" }}>
              {p.toFixed(1)}% {lbl}
            </div>
          </div>
        ))}
      </div>

      {/* Trust bar */}
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:10, color:T.t4 }}>Độ tin cậy:</span>
        <div style={{ flex:1, height:3, background:T.bdr, borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${d.tc}%`, background:tc, borderRadius:2 }} />
        </div>
        <span style={{ fontSize:11, fontWeight:700, color:tc }}>{d.tc}%</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HIST NAVIGATOR
// ─────────────────────────────────────────────────────────────
function HistNavigator({ data }) {
  const slice = data.slice(0, 3);

  return (
    <Card>
      <CardHeader icon="ti-clock" title="Lịch sử dò sóng" meta="(3 ngày gần nhất)" />
      {slice.length ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:9 }}>
          {slice.map((d, i) => (
            <HistDonutCard key={d.rawDate || d.date} d={d} active={i === 0} />
          ))}
        </div>
      ) : (
        <div style={{ color:T.t3, fontSize:12, padding:"18px 0", textAlign:"center" }}>
          Đang chờ dữ liệu dò sóng...
        </div>
      )}
    </Card>
  );
}
// ─────────────────────────────────────────────────────────────
// DANH MỤC DÒ SÓNG
// ─────────────────────────────────────────────────────────────
function DanhMucDoSong({ wave = EMPTY_WAVE }) {
  const [tab, setTab] = useState("cm");
  const [showAll, setShowAll] = useState(false);
  const cfg = TAB_CFG[tab];
  const rows = normalizeTickerRows(wave[cfg.rowsKey]);
  const count = wave[cfg.countKey] || rows.length;
  const visibleRows = showAll ? rows : rows.slice(0, 5);

  useEffect(() => {
    setShowAll(false);
  }, [tab]);

  const tdStyle = { padding:"8px 8px", borderBottom:`0.5px solid ${T.bdrs}`, whiteSpace:"nowrap" };

  return (
    <Card>
      <CardHeader
        icon="ti-list"
        title="Danh mục dò sóng"
        right={<Clink onClick={() => setShowAll((value) => !value)}>{showAll ? "Thu gọn" : "Xem tất cả →"}</Clink>}
      />
      {/* Tab buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:5, marginBottom:11 }}>
        {Object.entries(TAB_CFG).map(([key, c]) => {
          const active = key === tab;
          const tabCount = wave[c.countKey] || normalizeTickerRows(wave[c.rowsKey]).length;
          return (
            <button key={key} onClick={() => setTab(key)} style={{
              textAlign:"center", padding:"7px 3px", borderRadius:8, cursor:"pointer",
              background: active ? c.bg : T.elev,
              border: `0.5px solid ${active ? c.border : T.bdr}`,
              fontFamily:"inherit",
            }}>
              <div style={{ fontSize:12, fontWeight: active ? 700 : 500, color: active ? c.color : T.t2 }}>{c.label}</div>
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
            {["Mã","Giá","KL","Độ tin cậy"].map((h,i) => (
              <th key={h} style={{
                fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase",
                letterSpacing:".06em", padding:"7px 8px", borderBottom:`0.5px solid ${T.bdr}`,
                textAlign: i >= 1 ? "right" : "left", background:T.elev, whiteSpace:"nowrap",
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
                <td style={{ ...tdStyle, textAlign:"right", fontWeight:700, color:T.t1 }}>{r.gia}</td>
                <td style={{ ...tdStyle, textAlign:"right", fontSize:11, color:T.t3 }}>{r.vol}</td>
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
function ChanSong() {
  const tdStyle = { padding:"8px 8px", borderBottom:`0.5px solid ${T.bdrs}`, whiteSpace:"nowrap", fontSize:12, color:T.t2 };
  return (
    <Card>
      <CardHeader icon="ti-history" title="Lịch sử chân sóng tiêu biểu" right={<Clink>Xem tất cả →</Clink>} />
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:440 }}>
          <thead>
            <tr>
              {["Ngày tạo đáy","VNINDEX đáy","Độ tin cậy","Tăng điểm","Độ dài","Loại sóng"].map((h,i) => (
                <th key={h} style={{
                  fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase",
                  letterSpacing:".06em", padding:"7px 8px", borderBottom:`0.5px solid ${T.bdr}`,
                  textAlign: i >= 1 && i <= 4 ? "right" : "left", background:T.elev, whiteSpace:"nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHAN_SONG.map((r, idx) => {
              const tcC = r.tc >= 70 ? T.G : T.A;
              const isLast = idx === CHAN_SONG.length - 1;
              return (
                <tr key={r.ngay} style={{ borderBottom: isLast ? "none" : `0.5px solid ${T.bdrs}` }}>
                  <td style={tdStyle}>{r.ngay}</td>
                  <td style={{ ...tdStyle, textAlign:"right" }}>{r.vi}</td>
                  <td style={{ ...tdStyle, textAlign:"right", color:tcC, fontWeight:600 }}>{r.tc}%</td>
                  <td style={{ ...tdStyle, textAlign:"right", color:T.G, fontWeight:700 }}>{r.tang}đ</td>
                  <td style={{ ...tdStyle, textAlign:"right", color:T.t3 }}>{r.doi}</td>
                  <td style={{ ...tdStyle }}>
                    <span style={{
                      display:"inline-flex", alignItems:"center", fontSize:11, padding:"3px 8px",
                      borderRadius:20, border:".5px solid", fontWeight:600,
                      background: r.big ? T.Gs : T.Bs,
                      borderColor: r.big ? T.Gb : T.Bb,
                      color: r.big ? T.G : T.B,
                    }}>
                      {r.big ? "Sóng lớn" : "Sóng hồi"}
                    </span>
                  </td>
                </tr>
              );
            })}
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
    <div style={{ background:T.elev, border:`0.5px solid ${T.Pb}`, borderRadius:12, padding:13 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
        marginBottom:9, gap:8 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.t1, textTransform:"uppercase",
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
          <div style={{ fontSize:14, fontWeight:800, color:T.G, marginTop:6 }}>
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
  const [tickerWave, setTickerWave] = useState(EMPTY_WAVE);
  const latestTotal = latestWave.total || latestWave.cm + latestWave.mu + latestWave.cb + latestWave.ba;
  const tickerReferenceDate = getPreviousCalendarDate(latestWave.rawDate);
  const danhMucWave = tickerWave.rawDate
    ? { ...latestWave, ...tickerWave }
    : latestWave;
  const waveMeta = latestWave.rawDate
    ? `· ${latestTotal} mã · ${latestWave.date}${latestWave.dow ? ` (${latestWave.dow})` : ""}`
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
    if (!latestWave.rawDate) return;

    let active = true;

    fetchStockWaveHistory(latestWave.rawDate)
      .then((rows) => {
        if (active) setHistoryWaves(rows);
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
            <Card>
              <CardHeader icon="ti-chart-donut" title="Vòng tròn dò sóng" meta={waveMeta} />
              <MainDonut d={latestWave} />
            </Card>

            {/* Lịch sử dò sóng */}
            <HistNavigator data={historyWaves} />

            {/* Lịch sử chân sóng */}
            <ChanSong />
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
