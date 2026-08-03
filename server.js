import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleStockWaveHistory, preloadStockWaveHistorySnapshot, sendJson } from "./stockWaveHistoryCache.js";
import { handleStockWaveCurrent, handleStockWaveCurrentStream, startStockWaveCurrentSocket } from "./stockWaveCurrentCache.js";
import { handleStockWaveTickers } from "./stockWaveTickersCache.js";
import { handleWaveBottomConfirmPairs } from "./waveBottomConfirmPairsCache.js";
import { handleStockNoti, startStockNotiSocket } from "./stockNotiCache.js";
import { handleUsersRequest } from "./usersApi.js";
import { handlePortfolioChat } from "./portfolioChatApi.js";
import { handleConditionSignalLatest, handleDoSongAdvice } from "./conditionSignalApi.js";
import { handleDoSongRecommendation } from "./doSongRecommendationDb.js";
import { initStockDataDb, DB_PATH } from "./stockDataDb.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5173);
const DIST_DIR = path.join(__dirname, "dist");

initStockDataDb()
  .then(async () => {
    console.log(`StockTraders DB ready at ${DB_PATH}`);
    const rows = await preloadStockWaveHistorySnapshot();
    console.log(`Stock wave history snapshot ready: ${rows.length} rows`);
  })
  .catch((error) => console.error("StockTraders DB init failed", error));

startStockWaveCurrentSocket();
startStockNotiSocket();

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


function serveStatic(req, res, url) {
  if (!existsSync(DIST_DIR)) {
    sendError(res, 404, "dist not found. Run npm run build first.");
    return;
  }

  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/do-song-thi-truong" ? "/index.html" : pathname;
  let filePath = path.normalize(path.join(DIST_DIR, requestedPath));

  if (!filePath.startsWith(DIST_DIR)) {
    sendError(res, 403, "Forbidden");
    return;
  }

  if (!existsSync(filePath)) {
    sendError(res, 404, "Not found");
    return;
  }

  const ext = path.extname(filePath);
  if ((!ext || ext === ".html") && pathname !== "/do-song-thi-truong") {
    sendError(res, 404, "Not found");
    return;
  }
  res.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(res);
}

createServer(async (req, res) => {
  if (await handleUsersRequest(req, res, req.url)) return;
  if (await handlePortfolioChat(req, res, req.url)) return;
  if (await handleDoSongRecommendation(req, res, req.url)) return;
  if (await handleConditionSignalLatest(req, res, req.url)) return;
  if (await handleDoSongAdvice(req, res, req.url)) return;
  if (await handleStockNoti(req, res, req.url)) return;

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/api/stock-wave-current/stream") {
    handleStockWaveCurrentStream(req, res);
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
