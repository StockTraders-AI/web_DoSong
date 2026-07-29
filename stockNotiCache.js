import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendJson } from "./stockWaveHistoryCache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STOCK_NOTI_API_URL = process.env.STOCK_NOTI_API_URL || "https://stocktraders.vn/service/data/getStockNoti";
const CACHE_DIR = process.env.STOCK_NOTI_CACHE_DIR || path.join(__dirname, ".stock-wave-cache");
const CACHE_PATH = path.join(CACHE_DIR, "stock-noti.json");
const REFRESH_HOUR = 9;
const REFRESH_MINUTE = 0;
const REFRESH_SECOND = 0;
const MAX_TIMEOUT_MS = 2_147_483_647;

let memoryCache = null;
let pendingRefresh = null;
let refreshTimer = null;

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
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
    updatedAt: new Date().toISOString(),
    rows,
  };
}

async function readCache() {
  if (memoryCache) return memoryCache;

  try {
    const raw = await readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.rows)) {
      memoryCache = parsed;
      return parsed;
    }
  } catch {
    // Cache is optional; first successful upstream payload will create it.
  }

  return null;
}

async function writeCache(payload) {
  memoryCache = payload;
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_PATH, JSON.stringify(payload), "utf8");
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

export async function refreshStockNoti(dateKey = toLocalDateKey()) {
  if (!pendingRefresh) {
    pendingRefresh = fetchStockNoti(dateKey)
      .then(async (payload) => {
        if (payload.rows.length) {
          await writeCache(payload);
          return payload;
        }

        const cached = await readCache();
        const fallback = cached
          ? { ...cached, stale: true, emptyForDate: dateKey, lastAttemptDate: dateKey, updatedAt: new Date().toISOString() }
          : { ...payload, stale: true, emptyForDate: dateKey };
        await writeCache(fallback);
        return fallback;
      })
      .catch(async (error) => {
        const cached = await readCache();
        if (!cached) throw error;
        const fallback = {
          ...cached,
          stale: true,
          lastAttemptDate: dateKey,
          lastAttemptError: error.message || "Cannot refresh stock notifications.",
          updatedAt: new Date().toISOString(),
        };
        await writeCache(fallback);
        return fallback;
      })
      .finally(() => {
        pendingRefresh = null;
      });
  }

  return pendingRefresh;
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

function shouldRefreshCachedPayload(cached, dateKey) {
  if (!cached) return true;
  if (dateKey !== toLocalDateKey()) return false;

  const now = new Date();
  if (now.getHours() < REFRESH_HOUR) return false;
  return cached.lastAttemptDate !== dateKey;
}

export async function handleStockNoti(req, res, rawUrl) {
  const url = new URL(rawUrl || req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method !== "GET" || url.pathname !== "/api/stock-noti") return false;

  const dateKey = url.searchParams.get("date") || toLocalDateKey();
  const forceRefresh = url.searchParams.get("refresh") === "1";

  try {
    const cached = await readCache();
    const payload = forceRefresh || shouldRefreshCachedPayload(cached, dateKey)
      ? await refreshStockNoti(dateKey)
      : cached;
    sendJson(res, 200, payload);
  } catch (error) {
    const cached = await readCache();
    if (cached) {
      sendJson(res, 200, { ...cached, stale: true, error: error.message || "Cannot refresh stock notifications." });
      return true;
    }

    console.error("Stock notification cache failed", error);
    sendJson(res, 502, { success: false, error: error.message || "Cannot load stock notifications." });
  }

  return true;
}
