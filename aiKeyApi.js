/**
 * Proxy for the new stocktraders-mcp webapp's BYOK key storage
 * (POST /auth/key, GET /auth/key/status), so the frontend never needs to
 * know the webapp's direct VPS URL. Mirrors portfolioChatApi.js's shape.
 */
const NEW_CHAT_API_BASE_URL = (process.env.NEW_CHAT_API_BASE_URL || "").replace(/\/$/, "");

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

export async function handleAiKey(req, res, rawUrl) {
  const url = new URL(rawUrl || req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname !== "/api/ai-key" && url.pathname !== "/api/ai-key/status") return false;

  if (!NEW_CHAT_API_BASE_URL) {
    sendJson(res, 503, { success: false, error: "NEW_CHAT_API_BASE_URL chua duoc cau hinh tren server." });
    return true;
  }

  try {
    if (url.pathname === "/api/ai-key/status" && req.method === "GET") {
      const userId = url.searchParams.get("user_id") || "u1";
      const provider = url.searchParams.get("provider") || "openai";
      const params = new URLSearchParams({ user_id: userId, provider });
      const response = await fetch(`${NEW_CHAT_API_BASE_URL}/auth/key/status?${params.toString()}`);
      const payload = await response.json().catch(() => ({}));
      sendJson(res, response.ok ? 200 : response.status, payload);
      return true;
    }

    if (url.pathname === "/api/ai-key" && req.method === "POST") {
      const body = await readJsonBody(req);
      const apiKey = String(body.api_key || "").trim();
      if (!apiKey) {
        sendJson(res, 400, { success: false, error: "Thieu api_key." });
        return true;
      }
      const response = await fetch(`${NEW_CHAT_API_BASE_URL}/auth/key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: body.user_id || "u1",
          provider: body.provider || "openai",
          api_key: apiKey,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        sendJson(res, response.status, { success: false, error: payload.detail || payload.error || "Luu key that bai." });
        return true;
      }
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (url.pathname === "/api/ai-key" && req.method === "DELETE") {
      const userId = url.searchParams.get("user_id") || "u1";
      const provider = url.searchParams.get("provider") || "openai";
      const params = new URLSearchParams({ user_id: userId, provider });
      const response = await fetch(`${NEW_CHAT_API_BASE_URL}/auth/key?${params.toString()}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        sendJson(res, response.status, { success: false, error: payload.detail || payload.error || "Xoa key that bai." });
        return true;
      }
      sendJson(res, 200, { ok: true });
      return true;
    }

    sendJson(res, 405, { success: false, error: "Method not allowed" });
    return true;
  } catch (error) {
    console.error("AI key proxy failed", error);
    sendJson(res, 502, { success: false, error: error.message || "Cannot reach webapp." });
    return true;
  }
}
