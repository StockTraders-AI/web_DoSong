import { sendJson } from "./stockWaveHistoryCache.js";

const STOCK_WAVE_API_URL = process.env.STOCK_WAVE_API_URL || "https://stocktraders.vn/service/data/getStockWave";
const STOCK_WAVE_ACCOUNT = process.env.STOCK_WAVE_ACCOUNT || "thao.dtt";
const TICKERS_REQUEST = { StockWaveRequest: { account: STOCK_WAVE_ACCOUNT } };
const memoryCache = new Map();
const pendingRequests = new Map();

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function getWaveRows(payload) {
  const root = payload?.StockWaveRequest ?? payload;
  const waves = root?.stockWaves ?? root?.data?.stockWaves ?? root?.data ?? root;
  const rows = waves?.waveDatas ?? waves?.waveData ?? waves?.rows ?? waves?.history ?? waves?.stockWaves?.waveDatas ?? waves;
  if (Array.isArray(rows)) return rows;
  if (rows && typeof rows === "object" && (rows.date || rows.buy !== undefined)) return [rows];
  return [];
}

function getRawDate(row) {
  return String(row?.date || row?.tradingDate || row?.ngay || "");
}

function writeMemoryCache(date, row) {
  const payload = {
    success: true,
    date,
    cachedAt: new Date().toISOString(),
    row,
    rows: row ? [row] : [],
  };
  memoryCache.set(date, payload);
  return payload;
}

export async function getStockWaveTickers(date) {
  if (!isValidDate(date)) {
    const error = new Error("Missing or invalid date. Use YYYY-MM-DD.");
    error.statusCode = 400;
    throw error;
  }

  if (memoryCache.has(date)) {
    const cached = memoryCache.get(date);
    if (!cached?.cacheVersion && cached?.row && getRawDate(cached.row) <= date) return { ...cached, source: "memory" };
    memoryCache.delete(date);
  }
  if (!pendingRequests.has(date)) {
    const request = fetch(STOCK_WAVE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(TICKERS_REQUEST),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Stock wave tickers upstream failed: ${response.status}`);
        const payload = await response.json();
        const rows = getWaveRows(payload)
          .filter((item) => getRawDate(item))
          .sort((a, b) => getRawDate(b).localeCompare(getRawDate(a)));
        const row = rows.find((item) => getRawDate(item) <= date) || null;
        return writeMemoryCache(date, row);
      })
      .finally(() => {
        pendingRequests.delete(date);
      });

    pendingRequests.set(date, request);
  }

  const payload = await pendingRequests.get(date);
  return { ...payload, source: "upstream" };
}

export async function handleStockWaveTickers(req, res, rawUrl) {
  const url = new URL(rawUrl || req.url, `http://${req.headers.host || "localhost"}`);
  const date = url.searchParams.get("date");

  try {
    sendJson(res, 200, await getStockWaveTickers(date));
  } catch (error) {
    const status = error.statusCode || 502;
    console.error("Stock wave tickers cache failed", error);
    sendJson(res, status, { success: false, error: error.message || "Cannot load stock wave tickers." });
  }
}