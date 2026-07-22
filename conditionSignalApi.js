import { sendJson } from "./stockWaveHistoryCache.js";

const DEFAULT_CHATWEB_API_BASE_URL = "http://112.213.91.235:8000";

export async function handleConditionSignalLatest(req, res, rawUrl) {
  const url = new URL(rawUrl || req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method !== "GET" || url.pathname !== "/api/condition-signal-latest") {
    return false;
  }

  const chatwebBaseUrl = (process.env.CHATWEB_API_BASE_URL || DEFAULT_CHATWEB_API_BASE_URL).replace(/\/$/, "");
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

  return true;
}
