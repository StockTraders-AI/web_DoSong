import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { io } from "socket.io-client";
import { sendJson } from "./stockWaveHistoryCache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REALTIME_WAVE_URL = process.env.REALTIME_WAVE_URL || "http://112.213.91.235:3005/realtime";
const CACHE_DIR = process.env.STOCK_WAVE_CACHE_DIR || path.join(__dirname, ".stock-wave-cache");
const CURRENT_CACHE_PATH = path.join(CACHE_DIR, "current.json");
const WAVE_CHANNEL = "wave";
let currentPayload = null;
let socketStarted = false;

function getSocketWaveData(payload) {
  if (payload?.channel && payload.channel !== WAVE_CHANNEL) return null;
  return payload?.data ?? payload;
}

async function writeCurrent(data) {
  const payload = {
    success: true,
    cachedAt: new Date().toISOString(),
    data,
  };
  currentPayload = payload;
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CURRENT_CACHE_PATH, JSON.stringify(payload), "utf8");
}

async function readCurrent() {
  if (currentPayload) return currentPayload;

  try {
    const raw = await readFile(CURRENT_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed?.data) {
      currentPayload = parsed;
      return parsed;
    }
  } catch {
    // No persisted current snapshot yet.
  }

  return null;
}

export function startStockWaveCurrentSocket() {
  if (socketStarted) return;
  socketStarted = true;

  const socket = io(REALTIME_WAVE_URL, {
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    socket.emit("message", {
      action: "subscribe",
      channels: [WAVE_CHANNEL],
    });
  });

  socket.on("message", (payload) => {
    const data = getSocketWaveData(payload);
    if (!data) return;

    writeCurrent(data).catch((error) => {
      console.error("Write stock wave current cache failed", error);
    });
  });

  socket.on("connect_error", (error) => {
    console.error("Stock wave current socket failed", error.message);
  });
}

export async function handleStockWaveCurrent(req, res) {
  try {
    const payload = await readCurrent();
    if (!payload) {
      sendJson(res, 404, { success: false, error: "Current stock wave snapshot is not ready yet." });
      return;
    }

    sendJson(res, 200, payload);
  } catch (error) {
    console.error("Read stock wave current cache failed", error);
    sendJson(res, 502, { success: false, error: "Cannot load stock wave current snapshot." });
  }
}