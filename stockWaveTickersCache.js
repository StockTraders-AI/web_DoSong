import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendJson } from "./stockWaveHistoryCache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STOCK_WAVE_API_URL = process.env.STOCK_WAVE_API_URL || "https://stocktraders.vn/service/data/getStockWave";
const STOCK_WAVE_ACCOUNT = process.env.STOCK_WAVE_ACCOUNT || "StockTraders";
const CACHE_DIR = process.env.STOCK_WAVE_CACHE_DIR || path.join(__dirname, ".stock-wave-cache");
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

function cachePath(date) {
  return path.join(CACHE_DIR, `tickers-${date}.json`);
}

async function readDiskCache(date) {
  try {
    const raw = await readFile(cachePath(date), "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.row && getRawDate(parsed.row) <= date ? parsed : null;
  } catch {
    return null;
  }
}

async function writeDiskCache(date, row) {
  await mkdir(CACHE_DIR, { recursive: true });
  const payload = {
    success: true,
    date,
    cachedAt: new Date().toISOString(),
    row,
    rows: row ? [row] : [],
  };
  await writeFile(cachePath(date), JSON.stringify(payload), "utf8");
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
    if (cached?.row && getRawDate(cached.row) <= date) return { ...cached, source: "memory" };
    memoryCache.delete(date);
  }

  const diskCached = await readDiskCache(date);
  if (diskCached) {
    memoryCache.set(date, diskCached);
    return { ...diskCached, source: "disk" };
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
        return writeDiskCache(date, row);
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