import { sendJson } from "./stockWaveHistoryCache.js";

const WAVE_BOTTOM_PAIRS_URL = process.env.WAVE_BOTTOM_PAIRS_URL || "https://stocktradersai.vn/service/data/getWaveBottomConfirmPairs";
const VNINDEX_TRADE_URL = process.env.VNINDEX_TRADE_URL || "https://stocktradersai.vn/service/data/getTotalTrade?ticker=VNINDEX";
const CACHE_VERSION = 4;
const ZIGZAG_THRESHOLD = 0.05;
const PAIRS_REQUEST = { dateFrom: null, dateTo: null, count: 4 };
let memoryCache = null;
let memoryCacheKey = "";
let pendingRequest = null;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getRows(payload) {
  const rows = payload?.data?.rows ?? payload?.data ?? payload?.rows ?? payload;
  return Array.isArray(rows) ? rows : [];
}

function getPairs(payload) {
  const pairs = payload?.pairs ?? payload?.data?.pairs ?? payload;
  return Array.isArray(pairs) ? pairs : [];
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function writeMemoryCache(rows) {
  const payload = {
    success: true,
    cacheVersion: CACHE_VERSION,
    cachedAt: new Date().toISOString(),
    rows,
  };
  memoryCache = payload;
  memoryCacheKey = getTodayKey();
  return payload;
}

function normalizeTradeRows(payload) {
  return getRows(payload)
    .map((row) => ({
      date: String(row?.date || row?.tradingDate || row?.ngay || ""),
      high: toNumber(row?.high ?? row?.High ?? row?.h),
      low: toNumber(row?.low ?? row?.Low ?? row?.l),
    }))
    .filter((row) => row.date && row.high > 0 && row.low > 0)
    .sort((a, b) => rowDateValue(a.date) - rowDateValue(b.date))
    .map((row, index) => ({ ...row, index }));
}

function rowDateValue(value) {
  const time = Date.parse(`${value}T00:00:00`);
  return Number.isFinite(time) ? time : 0;
}

function buildQuoteLookup(rows) {
  const lookup = new Map();
  rows.forEach((row) => lookup.set(row.date, row));
  return lookup;
}

function buildZigzagPivots(rows, threshold = ZIGZAG_THRESHOLD) {
  if (!rows.length) return [];

  const pivots = [];
  let trend = 0;
  let low = rows[0];
  let high = rows[0];
  let candidate = rows[0];

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];

    if (trend === 0) {
      if (row.low < low.low) low = row;
      if (row.high > high.high) high = row;

      if (row.high >= low.low * (1 + threshold)) {
        pivots.push({ ...low, price: low.low, type: "low" });
        trend = 1;
        candidate = row;
      } else if (row.low <= high.high * (1 - threshold)) {
        pivots.push({ ...high, price: high.high, type: "high" });
        trend = -1;
        candidate = row;
      }
      continue;
    }

    if (trend === 1) {
      if (row.high > candidate.high) candidate = row;
      if (row.low <= candidate.high * (1 - threshold)) {
        pivots.push({ ...candidate, price: candidate.high, type: "high" });
        trend = -1;
        candidate = row;
      }
      continue;
    }

    if (row.low < candidate.low) candidate = row;
    if (row.high >= candidate.low * (1 + threshold)) {
      pivots.push({ ...candidate, price: candidate.low, type: "low" });
      trend = 1;
      candidate = row;
    }
  }

  return pivots;
}

function findLowPivot(pivots, quoteByDate, pair) {
  const lows = pivots.filter((pivot) => pivot.type === "low");
  if (!lows.length) return null;

  const confirmDate = String(pair.confirm_wave_date || "");
  const prepareDate = String(pair.prepare_bottom_date || "");
  const exactConfirm = lows.find((pivot) => pivot.date === confirmDate);
  if (exactConfirm) return exactConfirm;

  const exactPrepare = lows.find((pivot) => pivot.date === prepareDate);
  if (exactPrepare) return exactPrepare;

  const confirm = quoteByDate.get(confirmDate);
  const prepare = quoteByDate.get(prepareDate);
  if (confirm && prepare) {
    const from = Math.min(confirm.index, prepare.index);
    const to = Math.max(confirm.index, prepare.index);
    const inPairWindow = lows.filter((pivot) => pivot.index >= from && pivot.index <= to);
    if (inPairWindow.length) {
      return inPairWindow.reduce((best, pivot) => pivot.low < best.low ? pivot : best, inPairWindow[0]);
    }
  }

  if (confirm) {
    const previous = lows.filter((pivot) => pivot.index <= confirm.index);
    if (previous.length) return previous[previous.length - 1];
  }

  return lows[0];
}

function findNextHighPivot(pivots, bottom) {
  if (!bottom) return null;
  return pivots.find((pivot) => pivot.type === "high" && pivot.index > bottom.index) || null;
}

async function fetchPairs() {
  const response = await fetch(WAVE_BOTTOM_PAIRS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(PAIRS_REQUEST),
  });
  if (!response.ok) throw new Error(`Wave bottom pairs upstream failed: ${response.status}`);
  return response.json();
}

async function fetchVnindexTrades() {
  const baseUrl = VNINDEX_TRADE_URL.split("?")[0];
  const attempts = [
    () => fetch(VNINDEX_TRADE_URL, { method: "POST" }),
    () => fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker: "VNINDEX" }),
    }),
    () => fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ticker: "VNINDEX" }),
    }),
  ];

  const statuses = [];
  for (const request of attempts) {
    const response = await request();
    if (response.ok) return response.json();
    statuses.push(response.status);
  }

  throw new Error(`VNINDEX trade upstream failed: ${statuses.join("/")}`);
}

export async function getWaveBottomConfirmPairs() {
  const todayKey = getTodayKey();
  if (memoryCache && memoryCacheKey === todayKey && memoryCache.cacheVersion === CACHE_VERSION) return { ...memoryCache, source: "memory" };

  if (!pendingRequest) {
    pendingRequest = Promise.all([fetchPairs(), fetchVnindexTrades()])
      .then(([pairsPayload, vnindexPayload]) => {
        const vnindexRows = normalizeTradeRows(vnindexPayload);
        const quoteByDate = buildQuoteLookup(vnindexRows);
        const pivots = buildZigzagPivots(vnindexRows);
        const rows = getPairs(pairsPayload).map((pair) => {
          const confirmDate = String(pair.confirm_wave_date || "");
          const bottom = findLowPivot(pivots, quoteByDate, pair);
          const peak = findNextHighPivot(pivots, bottom);
          const fallbackQuote = quoteByDate.get(confirmDate);
          const increasePoints = bottom && peak ? peak.high - bottom.low : 0;
          const durationSessions = bottom && peak ? peak.index - bottom.index + 1 : 0;

          return {
            confirm_wave_date: confirmDate,
            prepare_bottom_date: String(pair.prepare_bottom_date || ""),
            zigzag_bottom_date: bottom?.date || "",
            zigzag_peak_date: peak?.date || "",
            vnindex: toNumber(bottom?.low ?? fallbackQuote?.low),
            increase_points: Number(increasePoints.toFixed(2)),
            zigzag_bottom_price: toNumber(bottom?.low),
            zigzag_peak_price: toNumber(peak?.high),
            duration_sessions: durationSessions,
            reliability: toNumber(pair.reliability),
          };
        });
        return writeMemoryCache(rows);
      })
      .finally(() => {
        pendingRequest = null;
      });
  }

  const payload = await pendingRequest;
  return { ...payload, source: "upstream" };
}

export async function handleWaveBottomConfirmPairs(req, res) {
  try {
    sendJson(res, 200, await getWaveBottomConfirmPairs());
  } catch (error) {
    console.error("Wave bottom confirm pairs cache failed", error);
    sendJson(res, 502, { success: false, error: error.message || "Cannot load wave bottom confirm pairs." });
  }
}