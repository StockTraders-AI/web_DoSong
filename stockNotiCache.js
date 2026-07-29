import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendJson } from "./stockWaveHistoryCache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STOCK_NOTI_API_URL = process.env.STOCK_NOTI_API_URL || "https://stocktraders.vn/service/data/getStockNoti";
const CACHE_DIR = process.env.STOCK_NOTI_CACHE_DIR || path.join(__dirname, ".stock-wave-cache");
const CACHE_PATH = path.join(CACHE_DIR, "stock-noti.json");
const REFRESH_HOUR = 11;
const REFRESH_MINUTE = 0;
const REFRESH_SECOND = 0;
const MAX_TIMEOUT_MS = 2_147_483_647;

let memoryStore = null;
const pendingRefreshes = new Map();
let refreshTimer = null;

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createStore() {
  return {
    success: true,
    latestDate: "",
    updatedAt: "",
    byDate: {},
  };
}

function normalizeStore(payload) {
  if (payload?.byDate && typeof payload.byDate === "object") {
    return {
      success: true,
      latestDate: normalizeText(payload.latestDate),
      updatedAt: normalizeText(payload.updatedAt),
      byDate: payload.byDate,
    };
  }

  if (Array.isArray(payload?.rows)) {
    const dateKey = normalizeText(payload.requestedDate || payload.sourceDate || payload.rows[0]?.date?.slice(0, 10));
    const store = createStore();
    if (isDateKey(dateKey)) {
      store.byDate[dateKey] = payload;
      store.latestDate = payload.rows.length ? dateKey : "";
      store.updatedAt = normalizeText(payload.updatedAt);
    }
    return store;
  }

  return createStore();
}

function normalizeStockNotiPayload(payload, requestedDate) {
  const reply = payload?.StockNotiReply || payload?.data?.StockNotiReply || payload;
  const rawRows = Array.isArray(reply?.stockNotifications)
    ? reply.stockNotifications
    : Array.isArray(payload?.rows)
      ? payload.rows
      : [];

  const rows = rawRows
    .map((row) => ({
      content: normalizeText(row?.content),
      date: normalizeText(row?.date),
      title: normalizeText(row?.title),
      type: normalizeText(row?.type),
    }))
    .filter((row) => row.content)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return {
    success: true,
    requestedDate,
    sourceDate: rows[0]?.date?.slice(0, 10) || requestedDate,
    lastAttemptDate: requestedDate,
    updatedAt: new Date().toISOString(),
    rows,
  };
}

async function readStore() {
  if (memoryStore) return memoryStore;

  try {
    const raw = await readFile(CACHE_PATH, "utf8");
    memoryStore = normalizeStore(JSON.parse(raw));
  } catch {
    memoryStore = createStore();
  }

  return memoryStore;
}

async function writeStore(store) {
  memoryStore = store;
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(store), "utf8");
}

async function fetchStockNoti(dateKey) {
  const response = await fetch(STOCK_NOTI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ StockNotiRequest: { date: dateKey } }),
  });

  if (!response.ok) throw new Error(`Stock notification upstream failed: ${response.status}`);
  return normalizeStockNotiPayload(await response.json(), dateKey);
}

function findFallbackPayload(store, dateKey) {
  const rows = Object.entries(store.byDate)
    .filter(([key, payload]) => key <= dateKey && Array.isArray(payload?.rows) && payload.rows.length)
    .sort(([a], [b]) => b.localeCompare(a));
  return rows[0]?.[1] || null;
}

function responseForDate(store, dateKey) {
  const exact = store.byDate[dateKey];
  if (exact?.rows?.length) return exact;

  const fallback = findFallbackPayload(store, dateKey);
  if (fallback) {
    return {
      ...fallback,
      requestedDate: dateKey,
      stale: true,
      emptyForDate: exact?.emptyForDate || dateKey,
    };
  }

  return exact || {
    success: true,
    requestedDate: dateKey,
    sourceDate: dateKey,
    lastAttemptDate: dateKey,
    updatedAt: new Date().toISOString(),
    stale: true,
    emptyForDate: dateKey,
    rows: [],
  };
}

export async function refreshStockNoti(dateKey = toLocalDateKey()) {
  if (!pendingRefreshes.has(dateKey)) {
    const request = fetchStockNoti(dateKey)
      .then(async (payload) => {
        const store = await readStore();
        if (payload.rows.length) {
          store.byDate[dateKey] = payload;
          store.latestDate = [store.latestDate, dateKey].filter(Boolean).sort().pop() || dateKey;
        } else {
          store.byDate[dateKey] = { ...payload, stale: true, emptyForDate: dateKey };
        }
        store.updatedAt = new Date().toISOString();
        await writeStore(store);
        return responseForDate(store, dateKey);
      })
      .catch(async (error) => {
        const store = await readStore();
        store.byDate[dateKey] = {
          success: false,
          requestedDate: dateKey,
          sourceDate: dateKey,
          lastAttemptDate: dateKey,
          updatedAt: new Date().toISOString(),
          stale: true,
          emptyForDate: dateKey,
          lastAttemptError: error.message || "Cannot refresh stock notifications.",
          rows: [],
        };
        store.updatedAt = new Date().toISOString();
        await writeStore(store);
        return responseForDate(store, dateKey);
      })
      .finally(() => {
        pendingRefreshes.delete(dateKey);
      });

    pendingRefreshes.set(dateKey, request);
  }

  return pendingRefreshes.get(dateKey);
}

function scheduleNextRefresh() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(REFRESH_HOUR, REFRESH_MINUTE, REFRESH_SECOND, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  const delay = Math.min(next.getTime() - now.getTime(), MAX_TIMEOUT_MS);
  refreshTimer = setTimeout(async () => {
    try {
      await refreshStockNoti(toLocalDateKey(new Date()));
    } catch (error) {
      console.error("Stock notification scheduled refresh failed", error);
    } finally {
      scheduleNextRefresh();
    }
  }, delay);
}

export function startStockNotiDailyRefresh() {
  if (refreshTimer) return;
  scheduleNextRefresh();
}

function shouldRefreshDate(store, dateKey) {
  if (!store.byDate[dateKey]) {
    if (dateKey !== toLocalDateKey()) return true;
    return new Date().getHours() >= REFRESH_HOUR || !findFallbackPayload(store, dateKey);
  }

  if (dateKey !== toLocalDateKey()) return false;
  if (new Date().getHours() < REFRESH_HOUR) return false;
  return store.byDate[dateKey].lastAttemptDate !== dateKey;
}

export async function handleStockNoti(req, res, rawUrl) {
  const url = new URL(rawUrl || req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method !== "GET" || url.pathname !== "/api/stock-noti") return false;

  const requestedDate = url.searchParams.get("date") || toLocalDateKey();
  const dateKey = isDateKey(requestedDate) ? requestedDate : toLocalDateKey();
  const forceRefresh = url.searchParams.get("refresh") === "1";

  try {
    const store = await readStore();
    const payload = forceRefresh || shouldRefreshDate(store, dateKey)
      ? await refreshStockNoti(dateKey)
      : responseForDate(store, dateKey);
    sendJson(res, 200, payload);
  } catch (error) {
    const store = await readStore();
    const fallback = responseForDate(store, dateKey);
    if (fallback.rows.length) {
      sendJson(res, 200, { ...fallback, stale: true, error: error.message || "Cannot refresh stock notifications." });
      return true;
    }

    console.error("Stock notification cache failed", error);
    sendJson(res, 502, { success: false, error: error.message || "Cannot load stock notifications." });
  }

  return true;
}