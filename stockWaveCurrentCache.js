import { io } from "socket.io-client";
import { invalidateStockWaveHistorySnapshot, sendJson } from "./stockWaveHistoryCache.js";
import {
  getStockWaveCurrentFromDb,
  insertRawSocketEvent,
  upsertStockWaveCurrent,
} from "./stockDataDb.js";

const REALTIME_WAVE_URL = process.env.REALTIME_WAVE_URL || "http://112.213.91.235:3005/realtime";
const WAVE_CHANNEL = "wave";
let currentPayload = null;
let socketStarted = false;

function getSocketWaveData(payload) {
  if (payload?.channel && payload.channel !== WAVE_CHANNEL) return null;
  return payload?.data ?? payload;
}

async function writeCurrent(data) {
  currentPayload = {
    success: true,
    cachedAt: new Date().toISOString(),
    data,
    source: "socket",
  };

  await upsertStockWaveCurrent(data, { source: "socket" });
  invalidateStockWaveHistorySnapshot();
}

async function readCurrent() {
  if (currentPayload) return currentPayload;

  const data = await getStockWaveCurrentFromDb();
  if (!data) return null;

  currentPayload = {
    success: true,
    cachedAt: new Date().toISOString(),
    data,
    source: "db",
  };
  return currentPayload;
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

    Promise.all([
      insertRawSocketEvent(WAVE_CHANNEL, payload),
      writeCurrent(data),
    ]).catch((error) => {
      console.error("Write stock wave current DB failed", error);
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
