import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendJson } from "./stockWaveHistoryCache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WAVE_BOTTOM_PAIRS_URL = process.env.WAVE_BOTTOM_PAIRS_URL || "https://stocktradersai.vn/service/data/getWaveBottomConfirmPairs";
const VNINDEX_TRADE_URL = process.env.VNINDEX_TRADE_URL || "https://stocktradersai.vn/service/data/getTotalTrade?ticker=VNINDEX";
const CACHE_DIR = process.env.STOCK_WAVE_CACHE_DIR || path.join(__dirname, ".stock-wave-cache");
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function cachePath() {
  return path.join(CACHE_DIR, `wave-bottom-confirm-pairs-${getTodayKey()}.json`);
}
const PAIRS_REQUEST = { dateFrom: null, dateTo: null, count: 4 };
let memoryCache = null;
let memoryCacheKey = "";
let pendingRequest = null;

function getRows(payload) {
  return Array.isArray(payload) ? payload : [];
}

function getPairs(payload) {
  const pairs = payload?.pairs ?? payload?.data?.pairs ?? payload;
  return Array.isArray(pairs) ? pairs : [];
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function cacheIsValid(payload) {
  return Array.isArray(payload?.rows);
}

async function readDiskCache() {
  try {
    const raw = await readFile(cachePath(), "utf8");
    const parsed = JSON.parse(raw);
    return cacheIsValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeDiskCache(rows) {
  await mkdir(CACHE_DIR, { recursive: true });
  const payload = {
    success: true,
    cachedAt: new Date().toISOString(),
    rows,
  };
  await writeFile(cachePath(), JSON.stringify(payload), "utf8");
  memoryCache = payload;
  memoryCacheKey = getTodayKey();
  return payload;
}

function buildVnindexLookup(rows) {
  const lookup = new Map();
  getRows(rows).forEach((row) => {
    if (row?.date) lookup.set(String(row.date), row);
  });
  return lookup;
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
  if (memoryCache && memoryCacheKey === todayKey) return { ...memoryCache, source: "memory" };

  const diskCached = await readDiskCache();
  if (diskCached) {
    memoryCache = diskCached;
    memoryCacheKey = todayKey;
    return { ...diskCached, source: "disk" };
  }

  if (!pendingRequest) {
    pendingRequest = Promise.all([fetchPairs(), fetchVnindexTrades()])
      .then(([pairsPayload, vnindexPayload]) => {
        const vnindexByDate = buildVnindexLookup(vnindexPayload);
        const rows = getPairs(pairsPayload).map((pair) => {
          const confirmDate = String(pair.confirm_wave_date || "");
          const vnindex = vnindexByDate.get(confirmDate);
          return {
            confirm_wave_date: confirmDate,
            vnindex: toNumber(vnindex?.close),
            reliability: toNumber(pair.reliability),
          };
        });
        return writeDiskCache(rows);
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
