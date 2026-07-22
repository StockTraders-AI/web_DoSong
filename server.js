import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleStockWaveHistory, sendJson } from "./stockWaveHistoryCache.js";
import { handleStockWaveCurrent, startStockWaveCurrentSocket } from "./stockWaveCurrentCache.js";
import { handleStockWaveTickers } from "./stockWaveTickersCache.js";
import { handleWaveBottomConfirmPairs } from "./waveBottomConfirmPairsCache.js";
import { handleUsersRequest } from "./usersApi.js";
import { handlePortfolioChat } from "./portfolioChatApi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const DIST_DIR = path.join(__dirname, "dist");

startStockWaveCurrentSocket();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendError(res, status, message) {
  sendJson(res, status, { success: false, error: message });
}

async function handleConditionSignalLatest(req, res, url) {
  const chatwebBaseUrl = (process.env.CHATWEB_API_BASE_URL || "http://112.213.91.235:8000").replace(/\/$/, "");
  const signalKey = url.searchParams.get("signal_key") || "waitbuy_over_100";
  const flowId = url.searchParams.get("flow_id");
  const targetUrl = new URL(`${chatwebBaseUrl}/public/condition-signals/latest`);

  targetUrl.searchParams.set("signal_key", signalKey);
  if (flowId) targetUrl.searchParams.set("flow_id", flowId);

  try {
    const upstream = await fetch(targetUrl);
    const data = await upstream.json().catch(() => ({}));

    sendJson(res, upstream.ok ? 200 : upstream.status, {
      ok: upstream.ok && data?.ok !== false,
      response: data?.response || null,
    });
  } catch (error) {
    sendJson(res, 502, {
      ok: false,
      response: null,
      error: error.message || "Cannot load condition signal",
    });
  }
}

function serveStatic(req, res, url) {
  if (!existsSync(DIST_DIR)) {
    sendError(res, 404, "dist not found. Run npm run build first.");
    return;
  }

  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  let filePath = path.normalize(path.join(DIST_DIR, requestedPath));

  if (!filePath.startsWith(DIST_DIR)) {
    sendError(res, 403, "Forbidden");
    return;
  }

  if (!existsSync(filePath)) filePath = path.join(DIST_DIR, "index.html");

  const ext = path.extname(filePath);
  res.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(res);
}

createServer(async (req, res) => {
  if (await handleUsersRequest(req, res, req.url)) return;
  if (await handlePortfolioChat(req, res, req.url)) return;

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/condition-signal-latest") {
    await handleConditionSignalLatest(req, res, url);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/stock-wave-current") {
    handleStockWaveCurrent(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/stock-wave-tickers") {
    handleStockWaveTickers(req, res, req.url);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/wave-bottom-confirm-pairs") {
    handleWaveBottomConfirmPairs(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/stock-wave-history") {
    handleStockWaveHistory(req, res, req.url);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res, url);
    return;
  }

  sendError(res, 405, "Method not allowed");
}).listen(PORT, () => {
  console.log(`StockTraders web server listening on http://localhost:${PORT}`);
});