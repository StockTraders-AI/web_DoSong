import { initStockDataDb, DB_PATH } from "./stockDataDb.js";
import { backfillStockWaveHistoryFromApi } from "./stockWaveHistoryCache.js";
import { getWaveBottomConfirmPairs } from "./waveBottomConfirmPairsCache.js";
import { backfillStockNotiDate } from "./stockNotiCache.js";

const MARKET_TIME_ZONE = "Asia/Bangkok";
const DEFAULT_NOTI_FROM_DATE = "2020-01-01";
function usage() {
  return `Usage: node backfillStockDataDb.js [options]

Backfills persisted DB data for the current app cards, excluding KhuyenNghi/ChatAI.

Options:
  --from YYYY-MM-DD       First stock notification date to backfill. Defaults to 2020-01-01. Defaults to 2020-01-01.
  --to YYYY-MM-DD         Last stock notification date to backfill. Defaults to market today.
  --account ACCOUNT       Stock notification account. Defaults to STOCK_NOTI_ACCOUNT/thao.dtt.
  --skip-wave             Skip stock wave history/danh muc backfill.
  --skip-bottom           Skip wave bottom/chann song backfill.
  --skip-noti             Skip stock notification/nhat ky backfill.
  --help                  Show this message.

Examples:
  node backfillStockDataDb.js
  node backfillStockDataDb.js --from 2020-01-01 --to 2026-08-02
  node backfillStockDataDb.js --skip-noti
`;
}

function parseArgs(argv) {
  const args = {
    from: DEFAULT_NOTI_FROM_DATE,
    to: getMarketDateKey(),
    account: process.env.STOCK_NOTI_ACCOUNT || "thao.dtt",
    skipWave: false,
    skipBottom: false,
    skipNoti: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index] || "";
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--from") args.from = next();
    else if (arg === "--to") args.to = next();
    else if (arg === "--account") args.account = next();
    else if (arg === "--skip-wave") args.skipWave = true;
    else if (arg === "--skip-bottom") args.skipBottom = true;
    else if (arg === "--skip-noti") args.skipNoti = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }


  if (!Number.isFinite(args.bottomRetries) || args.bottomRetries < 1) args.bottomRetries = 5;
  if (!Number.isFinite(args.bottomRetryDelayMs) || args.bottomRetryDelayMs < 0) args.bottomRetryDelayMs = 15000;
  args.bottomRetries = Math.floor(args.bottomRetries);
  args.bottomRetryDelayMs = Math.floor(args.bottomRetryDelayMs);

  assertDateKey(args.from, "--from");
  assertDateKey(args.to, "--to");
  if (args.from > args.to) throw new Error("--from must be before or equal to --to");

  return args;
}

function getMarketDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MARKET_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function assertDateKey(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    throw new Error(`${label} must use YYYY-MM-DD`);
  }
}

function addDays(dateKey, days) {
  assertDateKey(dateKey, "date");
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function listDates(from, to) {
  const dates = [];
  for (let date = from; date <= to; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function logStep(message) {
  console.log(`[backfill] ${message}`);
}

async function backfillWave() {
  logStep("stock wave history/danh muc: fetching upstream full history");
  const payload = await backfillStockWaveHistoryFromApi();
  const count = Array.isArray(payload?.allRows) ? payload.allRows.length : 0;
  logStep(`stock wave history/danh muc: saved ${count} daily rows`);
}

async function backfillBottom({ bottomRetries, bottomRetryDelayMs }) {
  logStep("chan song: calling getWaveBottomConfirmPairs");

  let lastError = null;
  for (let attempt = 1; attempt <= bottomRetries; attempt += 1) {
    try {
      const payload = await getWaveBottomConfirmPairs(true);
      const count = Array.isArray(payload?.rows) ? payload.rows.length : 0;
      logStep(`chan song: saved ${count} rows`);
      return;
    } catch (error) {
      lastError = error;
      const message = error?.message || String(error);
      if (attempt >= bottomRetries) break;
      logStep(`chan song: attempt ${attempt}/${bottomRetries} failed (${message}); retrying in ${bottomRetryDelayMs}ms`);
      await sleep(bottomRetryDelayMs);
    }
  }

  throw lastError;
}

async function backfillNotifications({ from, to, account }) {
  const dates = listDates(from, to);
  logStep(`nhat ky do song: fetching ${dates.length} dates from ${from} to ${to}`);

  let totalRows = 0;
  let failed = 0;
  for (const dateKey of dates) {
    try {
      const payload = await backfillStockNotiDate(dateKey, account);
      const rows = Array.isArray(payload?.rows) ? payload.rows.length : 0;
      totalRows += rows;
      logStep(`nhat ky do song ${dateKey}: saved ${rows} rows`);
    } catch (error) {
      failed += 1;
      console.error(`[backfill] nhat ky do song ${dateKey}: failed - ${error.message || error}`);
    }
  }

  if (failed) {
    throw new Error(`Stock notification backfill finished with ${failed} failed date(s); saved ${totalRows} rows`);
  }
  logStep(`nhat ky do song: saved ${totalRows} rows total`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  await initStockDataDb();
  logStep(`DB ready at ${DB_PATH}`);

  if (!args.skipWave) await backfillWave();
  if (!args.skipBottom) await backfillBottom(args);
  if (!args.skipNoti) await backfillNotifications(args);

  logStep("done");
}

main().catch((error) => {
  console.error(`[backfill] failed: ${error.stack || error.message || error}`);
  process.exitCode = 1;
});
