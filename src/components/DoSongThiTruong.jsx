import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import branchLookup from "../data/branchLookup.json";
import VongTronDoSong from "./VongTronDoSong.jsx";
import DateTimeTravel from "./DateTimeTravel.jsx";
import LichSuDoSong from "./LichSuDoSong.jsx";
import KhuyenNghiTuVanAI from "./KhuyenNghiTuVanAI.jsx";
import TuVanAiCard from "./TuVanAiCard.jsx";
import Sidebar from "../layouts/Sidebar.jsx";
// ─────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────
const DARK_T = {
  bg:"#0A0D14", surf:"#111520", elev:"#171D2E", bdr:"#242E42", bdrs:"#1C2538",
  t1:"#F0F4FF", t2:"#A8B8D0", t3:"#5C7090", t4:"#3A4A60",
  G:"#3DD68C",  Gs:"rgba(61,214,140,.13)",  Gb:"rgba(61,214,140,.32)",
  MU:"#1A8A4A", MUs:"rgba(26,138,74,.15)",  MUb:"rgba(26,138,74,.35)",
  B:"#7C3AED",  Bs:"rgba(124,58,237,.13)",  Bb:"rgba(124,58,237,.30)",
  A:"#FF9F0A",  As:"rgba(255,159,10,.12)",  Ab:"rgba(255,159,10,.30)",
  R:"#FF2D55",  Rs:"rgba(255,45,85,.10)",   Rb:"rgba(255,45,85,.26)",
  P:"#C084FC",  Ps:"rgba(192,132,252,.10)", Pb:"rgba(192,132,252,.28)",
};

const LIGHT_T = {
  bg:"#F0EFF5", surf:"#FFFFFF", elev:"#F7F6FC", bdr:"#E0DEEA", bdrs:"#ECEAF4",
  t1:"#0A0A0A", t2:"#3A4250", t3:"#6B737F", t4:"#9FA5AE",
  G:"#16A34A",  Gs:"rgba(22,163,74,.10)",   Gb:"rgba(22,163,74,.28)",
  MU:"#15803D", MUs:"rgba(21,128,61,.12)",  MUb:"rgba(21,128,61,.28)",
  B:"#6D28D9",  Bs:"rgba(109,40,217,.10)",  Bb:"rgba(109,40,217,.25)",
  A:"#D97706",  As:"rgba(217,119,6,.10)",   Ab:"rgba(217,119,6,.28)",
  R:"#E11D48",  Rs:"rgba(225,29,72,.10)",   Rb:"rgba(225,29,72,.25)",
  P:"#7C3AED",  Ps:"rgba(124,58,237,.10)",  Pb:"rgba(124,58,237,.24)",
};

let T = DARK_T;

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

function getTabCfg() {
  return {
  cm: { label:"Chờ mua", countKey:"cm", rowsKey:"tickerWB", bg:T.Gs, border:T.Gb, color:T.G },
  mu: { label:"Mua",     countKey:"mu", rowsKey:"tickerB",  bg:T.MUs,border:T.MUb,color:T.MU },
  cb: { label:"Chờ bán", countKey:"cb", rowsKey:"tickerWS", bg:T.As, border:T.Ab, color:T.A },
  ba: { label:"Bán",     countKey:"ba", rowsKey:"tickerS",  bg:T.Rs, border:T.Rb, color:T.R },
  };
}


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

function formatDateKey(date) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWaveDate(value) {
  const date = toDate(value);
  if (!date) return "--/--/----";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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
    hasReliability:row.reliability !== undefined || row.tc !== undefined,
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

function getPayloadReliability(payload) {
  const root = payload?.StockWaveRequest ?? payload;
  const waves = root?.stockWaves ?? root?.data?.stockWaves ?? root?.data ?? root;
  const value = waves?.reliability ?? root?.reliability ?? payload?.reliability;
  return value === undefined || value === null ? undefined : value;
}

function normalizeWavePayload(payload) {
  const payloadReliability = getPayloadReliability(payload);
  return getWaveRows(payload)
    .map((row) => normalizeWaveRow(
      row?.reliability === undefined && payloadReliability !== undefined
        ? { ...row, reliability:payloadReliability }
        : row
    ))
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
  return payload?.data?.data ?? payload?.data?.payload ?? payload?.data ?? payload?.payload ?? payload;
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

const tableScrollStyle = {
  overflowX:"auto",
  WebkitOverflowScrolling:"touch",
};

const noWrapTableStyle = {
  width:"max-content",
  minWidth:"100%",
  borderCollapse:"collapse",
  tableLayout:"auto",
  whiteSpace:"nowrap",
};

const noWrapCellStyle = {
  whiteSpace:"nowrap",
  overflowWrap:"normal",
  wordBreak:"keep-all",
};

// ─────────────────────────────────────────────────────────────
// MAIN DONUT
// ─────────────────────────────────────────────────────────────
function formatSampleDate(value) {
  const date = toDate(value);
  if (!date) return "--/--";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function formatSampleWeek(value) {
  const date = toDate(value);
  if (!date) return "";
  const day = date.getDay();
  if (day === 0) return "CN";
  return `T.${day + 1}`;
}

function MainDonut({ d = EMPTY_WAVE, theme = "dark", dateControl = null }) {
  const data = { cm:d.cm, mu:d.mu, cb:d.cb, ba:d.ba };
  const total = d.total || d.cm + d.mu + d.cb + d.ba;
  return (
    <VongTronDoSong
      data={data}
      total={total}
      trust={Math.max(0, Math.min(100, toNumber(d.tc)))}
      date={d.rawDate ? formatWaveDate(d.rawDate) : d.date}
      dateControl={dateControl}
      theme={theme}
    />
  );
}

function toHistorySampleDay(row) {
  return {
    date:formatSampleDate(row.rawDate),
    week:formatSampleWeek(row.rawDate),
    today:isToday(row.rawDate),
    total:row.total || row.cm + row.mu + row.cb + row.ba,
    trust:Math.max(0, Math.min(100, toNumber(row.tc))),
    data:{ cm:row.cm, mu:row.mu, cb:row.cb, ba:row.ba },
  };
}

function HistNavigator({ data, totalDays: apiTotalDays, theme = "dark", loading = false }) {
  const [page, setPage] = useState(1);
  const perPage = 3;
  const totalDays = apiTotalDays || data.length;
  const pageCount = Math.max(1, Math.ceil(totalDays / perPage));
  const safePage = Math.min(page, pageCount);
  const days = data
    .slice((safePage - 1) * perPage, safePage * perPage)
    .map((row) => toHistorySampleDay(row));

  useEffect(() => {
    setPage(1);
  }, [data]);

  return (
    <LichSuDoSong
      days={days}
      page={safePage}
      totalDays={totalDays || days.length}
      pageCount={pageCount}
      onPage={setPage}
      theme={theme}
      loading={loading}
    />
  );
}
function DanhMucDoSong({ wave = EMPTY_WAVE }) {
  const [tab, setTab] = useState("cm");
  const [showAll, setShowAll] = useState(false);
  const tabCfg = getTabCfg();
  const cfg = tabCfg[tab];
  const rows = normalizeTickerRows(wave[cfg.rowsKey]);
  const count = wave[cfg.countKey] || rows.length;
  const visibleRows = showAll ? rows : rows.slice(0, 5);
  const showReliability = tab === "mu";

  useEffect(() => {
    setShowAll(false);
  }, [tab]);

  const tdStyle = { padding:"8px 5px", borderBottom:`0.5px solid ${T.bdrs}`, ...noWrapCellStyle };

  return (
    <Card style={{ padding:"16px 17px" }}>
      <CardHeader
        icon="ti-list"
        title="Danh mục dò sóng"
        right={<Clink onClick={() => setShowAll((value) => !value)}>{showAll ? "Thu gọn" : "Xem tất cả →"}</Clink>}
      />
      {/* Tab buttons */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
        {Object.entries(tabCfg).map(([key, c]) => {
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
      <div style={{ ...tableScrollStyle, maxHeight:showAll ? 260 : "none", overflowY:showAll ? "auto" : "visible" }}>
      <table style={{ ...noWrapTableStyle, width:"100%", minWidth:"100%", tableLayout:"fixed" }}>
        <colgroup>
          <col style={{ width:44 }} />
          <col />
          <col style={{ width:52 }} />
          <col style={{ width:88 }} />
          {showReliability && <col style={{ width:94 }} />}
        </colgroup>
        <thead>
          <tr>
            {["Mã","Ngành","Giá","Khối lượng", ...(showReliability ? ["Độ tin cậy"] : [])].map((h,i) => (
              <th key={h} style={{
                fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase",
                letterSpacing:".07em", padding:"7px 5px", borderBottom:`0.5px solid ${T.bdr}`,
                textAlign: i >= 2 ? "right" : "left", background:T.elev, ...noWrapCellStyle,
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
                <td style={{ ...tdStyle, fontSize:11, color:T.t3, overflow:"hidden", textOverflow:"ellipsis" }}>{r.nganh}</td>
                <td style={{ ...tdStyle, textAlign:"right", fontWeight:700, color:T.t1 }}>{r.gia}</td>
                <td style={{ ...tdStyle, textAlign:"right", fontWeight:600, color:T.t2 }}>{r.vol}</td>
                {showReliability && (
                  <td style={{ ...tdStyle, textAlign:"right" }}>
                    <span style={{ fontWeight:700, color:barColor }}>{r.tc}%</span>
                    <span style={{ display:"inline-block", width:40, height:3, background:T.bdr,
                      borderRadius:2, overflow:"hidden", verticalAlign:"middle", marginLeft:6 }}>
                      <span style={{ display:"block", height:"100%", width:`${r.tc}%`, background:barColor, borderRadius:2 }} />
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={showReliability ? 5 : 4} style={{ padding:"18px 8px", textAlign:"center", color:T.t3, fontSize:12 }}>
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
  const [showAll, setShowAll] = useState(false);
  const sortedRows = [...data].sort((a, b) => String(b.confirm_wave_date || "").localeCompare(String(a.confirm_wave_date || "")));
  const visibleRows = showAll ? sortedRows : sortedRows.slice(0, 5);
  const canToggle = sortedRows.length > 5;
  const toggleLabel = showAll ? "Thu gọn" : "Xem tất cả →";
  const tdStyle = { padding:"9px 9px", borderBottom:`0.5px solid ${T.bdrs}`, ...noWrapCellStyle, fontSize:12, color:T.t2 };
  return (
    <Card>
      <CardHeader
        icon="ti-history"
        title="Lịch sử chân sóng tiêu biểu"
        right={canToggle ? <Clink onClick={() => setShowAll((value) => !value)}>{toggleLabel}</Clink> : null}
      />
      <div style={tableScrollStyle}>
        <table style={{ ...noWrapTableStyle, minWidth:"max(100%, 620px)" }}>
          <thead>
            <tr>
              {["Ngày xác nhận","VNINDEX","Tăng điểm","Độ dài","Độ tin cậy","Loại sóng"].map((h,i) => (
                <th key={h} style={{
                  fontSize:10, fontWeight:700, color:T.t4, textTransform:"uppercase",
                  letterSpacing:".07em", padding:"7px 9px", borderBottom:`0.5px solid ${T.bdr}`,
                  textAlign: i >= 1 ? "right" : "left", background:T.elev, ...noWrapCellStyle,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r, idx) => {
              const reliability = toNumber(r.reliability);
              const tcC = reliability >= 70 ? T.G : reliability >= 55 ? T.A : T.R;
              const isLast = idx === visibleRows.length - 1;
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
            {!visibleRows.length && (
              <tr>
                <td colSpan={6} style={{ padding:"18px 8px", textAlign:"center", color:T.t3, fontSize:12 }}>
                  Đang chờ dữ liệu chân sóng...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {canToggle && (
        <div onClick={() => setShowAll((value) => !value)} style={{ marginTop:10, fontSize:12, color:T.B, fontWeight:600, cursor:"pointer" }}>
          {showAll ? "Thu gọn" : "Xem tất cả lịch sử chân sóng →"}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// RIGHT PANEL: Nhật ký tín hiệu
// ─────────────────────────────────────────────────────────────
function NhatKy() {
  return (
    <Card style={{ padding:"16px 17px" }}>
      <CardHeader icon="ti-notes" title="Nhật ký tín hiệu"
        meta="19/06/2026"
        right={<Clink>Xem tất cả →</Clink>}
        mb={10}
      />
      <div>
        {LOG.map((l, idx) => (
          <div key={l.time} style={{
            display:"flex", gap:10, padding:"9px 0",
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
  const [theme, setTheme] = useState("dark");
  T = theme === "light" ? LIGHT_T : DARK_T;
  const [selectedWaveDate, setSelectedWaveDate] = useState("");
  const [latestWave, setLatestWave] = useState(EMPTY_WAVE);
  const [historyWaves, setHistoryWaves] = useState([]);
  const [historyAllWaves, setHistoryAllWaves] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [chanSongRows, setChanSongRows] = useState([]);
  const [tickerWave, setTickerWave] = useState(EMPTY_WAVE);
  const tickerReferenceDate = getPreviousCalendarDate(latestWave.rawDate);
  const historySource = historyAllWaves.length ? historyAllWaves : historyWaves;
  const historyDisplayWaves = historySource.filter((item) => !latestWave.rawDate || item.rawDate < latestWave.rawDate);
  const matchingHistoryWave = historySource.find((item) => item.rawDate === latestWave.rawDate);
  const realtimeDisplayWave = latestWave.hasReliability || !matchingHistoryWave
    ? latestWave
    : { ...latestWave, tc:matchingHistoryWave.tc, hasReliability:true };
  const mainDonutDisplayWave = realtimeDisplayWave;
  const dateTravelWaves = [mainDonutDisplayWave, ...historyDisplayWaves]
    .filter((item, index, rows) => item.rawDate && rows.findIndex((row) => row.rawDate === item.rawDate) === index);
  const sortedDateTravelWaves = [...dateTravelWaves].sort((a, b) => String(b.rawDate).localeCompare(String(a.rawDate)));
  const selectedMainDonutWave = selectedWaveDate
    ? dateTravelWaves.find((item) => item.rawDate === selectedWaveDate) || mainDonutDisplayWave
    : mainDonutDisplayWave;
  const dateTravelValue = toDate(selectedMainDonutWave.rawDate) || new Date();
  const dateTravelMinDate = toDate(sortedDateTravelWaves[sortedDateTravelWaves.length - 1]?.rawDate) || dateTravelValue;
  const dateTravelMaxDate = toDate(sortedDateTravelWaves[0]?.rawDate) || dateTravelValue;
  const danhMucWave = tickerWave.rawDate
    ? { ...latestWave, ...tickerWave }
    : latestWave;

  useEffect(() => {
    let active = true;

    fetchStockWaveCurrent()
      .then((row) => {
        if (!active || !row) return;
        setLatestWave(row);
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
    });

    socket.on("message", (payload) => {
      console.log("[STOCK WAVE SOCKET RAW]", payload);

      const data = getSocketWaveData(payload);
      console.log("[STOCK WAVE SOCKET DATA]", data);

      if (!data) return;

      const rows = normalizeWavePayload(data);
      console.log("[STOCK WAVE NORMALIZED]", rows);

      if (!rows.length) return;
      setLatestWave(rows[0]);
    });

    socket.on("connect_error", (error) => {
      console.error("Realtime wave socket failed", error);
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
    setHistoryLoading(true);

    fetchStockWaveHistory(latestWave.rawDate)
      .then(({ rows, allRows }) => {
        if (!active) return;
        setHistoryWaves(rows);
        setHistoryAllWaves(allRows?.length ? allRows : rows);
        setHistoryLoading(false);
      })
      .catch((error) => {
        if (active) setHistoryLoading(false);
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

      <div data-theme={theme} style={{
        "--bg": T.bg,
        "--surf": T.surf,
        "--elev": T.elev,
        "--bdr": T.bdr,
        "--bdrs": T.bdrs,
        "--t1": T.t1,
        "--t2": T.t2,
        "--t3": T.t3,
        "--t4": T.t4,
        "--B": T.B,
        "--Bs": T.Bs,
        "--Bb": T.Bb,
        background: T.bg, color: T.t1,
        fontFamily: '-apple-system,"Inter","Segoe UI",sans-serif',
        fontSize: 13,
        display:"flex",
        minHeight: "100vh",
      }}>
        <button
          type="button"
          onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}
          style={{
            position:"fixed",
            top:14,
            right:18,
            zIndex:1000,
            background:T.elev,
            color:T.t1,
            border:`0.5px solid ${T.bdr}`,
            borderRadius:8,
            padding:"8px 12px",
            fontSize:12,
            fontWeight:700,
            lineHeight:1,
            cursor:"pointer",
            boxShadow:theme === "dark" ? "0 8px 24px rgba(0,0,0,.22)" : "0 8px 24px rgba(20,20,30,.10)",
          }}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <Sidebar />
        <main style={{ flex:1, minWidth:0, padding:"18px 22px 32px" }}>
          {/* 60/40 content layout */}
          <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 3fr) minmax(0, 2fr)", gap:14 }}>

          {/* ── CỘT TRÁI ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Vòng tròn dò sóng */}
            <MainDonut
              d={selectedMainDonutWave}
              theme={theme}
              dateControl={(
                <DateTimeTravel
                  value={dateTravelValue}
                  minDate={dateTravelMinDate}
                  maxDate={dateTravelMaxDate}
                  onChange={(date) => {
                    const key = formatDateKey(date);
                    const matched = dateTravelWaves.find((item) => item.rawDate === key);
                    if (matched) setSelectedWaveDate(matched.rawDate);
                  }}
                />
              )}
            />

            {/* Lịch sử dò sóng */}
            <HistNavigator data={historyDisplayWaves} totalDays={historyDisplayWaves.length} theme={theme} loading={historyLoading} />

            {/* Lịch sử chân sóng */}
            <ChanSong data={chanSongRows} />
          </div>

          {/* ── CỘT PHẢI ── */}
          <div style={{ display:"flex", flexDirection:"column", gap:14, minWidth:0 }}>
            <KhuyenNghiTuVanAI />
            <TuVanAiCard />
            <DanhMucDoSong wave={danhMucWave} />
            <NhatKy />
          </div>
          </div>
        </main>
      </div>
    </>
  );
}
