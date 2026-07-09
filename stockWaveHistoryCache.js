import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STOCK_WAVE_API_URL = process.env.STOCK_WAVE_API_URL || "https://stocktraders.vn/service/data/getStockWave";
const STOCK_WAVE_ACCOUNT = process.env.STOCK_WAVE_ACCOUNT || "StockTraders";
const CACHE_DIR = process.env.STOCK_WAVE_CACHE_DIR || path.join(__dirname, ".stock-wave-cache");
const HISTORY_REQUEST = { StockWaveRequest: { account: STOCK_WAVE_ACCOUNT } };
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

function selectPreviousSessions(payload, before) {
  return getWaveRows(payload)
    .filter((row) => getRawDate(row) && getRawDate(row) < before)
    .sort((a, b) => getRawDate(b).localeCompare(getRawDate(a)))
    .slice(0, 3);
}

function cachePath(before) {
  return path.join(CACHE_DIR, `${before}.json`);
}

async function readDiskCache(before) {
  try {
    const raw = await readFile(cachePath(before), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.rows) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeDiskCache(before, rows) {
  await mkdir(CACHE_DIR, { recursive: true });
  const payload = {
    success: true,
    before,
    cachedAt: new Date().toISOString(),
    rows,
  };
  await writeFile(cachePath(before), JSON.stringify(payload), "utf8");
  memoryCache.set(before, payload);
  return payload;
}

export async function getStockWaveHistory(before) {
  if (!isValidDate(before)) {
    const error = new Error("Missing or invalid before date. Use YYYY-MM-DD.");
    error.statusCode = 400;
    throw error;
  }

  if (memoryCache.has(before)) return { ...memoryCache.get(before), source: "memory" };

  const diskCached = await readDiskCache(before);
  if (diskCached) {
    memoryCache.set(before, diskCached);
    return { ...diskCached, source: "disk" };
  }

  if (!pendingRequests.has(before)) {
    const request = fetch(STOCK_WAVE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(HISTORY_REQUEST),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Stock wave upstream failed: ${response.status}`);
        const payload = await response.json();
        const rows = selectPreviousSessions(payload, before);
        return writeDiskCache(before, rows);
      })
      .finally(() => {
        pendingRequests.delete(before);
      });

    pendingRequests.set(before, request);
  }

  const payload = await pendingRequests.get(before);
  return { ...payload, source: "upstream" };
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

export async function handleStockWaveHistory(req, res, rawUrl) {
  const url = new URL(rawUrl || req.url, `http://${req.headers.host || "localhost"}`);
  const before = url.searchParams.get("before");

  try {
    sendJson(res, 200, await getStockWaveHistory(before));
  } catch (error) {
    const status = error.statusCode || 502;
    console.error("Stock wave history cache failed", error);
    sendJson(res, status, { success: false, error: error.message || "Cannot load stock wave history." });
  }
}