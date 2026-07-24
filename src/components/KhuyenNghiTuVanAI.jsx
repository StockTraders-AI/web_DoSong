import { useEffect, useState } from "react";

const WAITBUY_SIGNAL_KEY = "waitbuy_over_threshold";
const EMPTY_SIGNAL = { title: "", response: "", recommendation: "" };

export default function KhuyenNghiTuVanAI({ waitbuy = 0, refreshKey = 0 }) {
  const [conditionSignal, setConditionSignal] = useState(EMPTY_SIGNAL);

  useEffect(() => {
    let cancelled = false;
    const retryTimers = [];
    const currentWaitbuy = Number(waitbuy) || 0;
    const retryDelays = [0, 2000, 6000, 12000];

    function scheduleLoad(attempt) {
      const delay = retryDelays[attempt] ?? 0;
      const timer = window.setTimeout(() => loadConditionResponse(attempt), delay);
      retryTimers.push(timer);
    }

    async function loadConditionResponse(attempt = 1) {
      try {
        const params = new URLSearchParams({
          signal_key: WAITBUY_SIGNAL_KEY,
          waitbuy: String(currentWaitbuy),
          refresh_key: String(refreshKey),
          _: String(Date.now()),
        });
        const res = await fetch(`/api/condition-signal-latest?${params.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          if (!cancelled) setConditionSignal(EMPTY_SIGNAL);
          return;
        }

        const data = await res.json();
        const nextSignal = {
          title: String(data?.title || "").trim(),
          response: String(data?.response || "").trim(),
          recommendation: String(data?.recommendation || "").trim(),
        };

        if (!cancelled) {
          setConditionSignal(nextSignal);
          if (attempt + 1 < retryDelays.length) scheduleLoad(attempt + 1);
        }
      } catch {
        if (!cancelled) {
          setConditionSignal(EMPTY_SIGNAL);
          if (attempt + 1 < retryDelays.length) scheduleLoad(attempt + 1);
        }
      }
    }

    scheduleLoad(0);

    return () => {
      cancelled = true;
      retryTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [waitbuy, refreshKey]);

  const { title, response, recommendation } = conditionSignal;

  if (!response) return null;

  return (
    <div style={{ background: "linear-gradient(0deg, rgba(124,58,237,.12), rgba(124,58,237,.12)), var(--surf, #111520)", border: "1px solid #5B21B6", borderRadius: 16, padding: "16px 17px" }}>
      {title ? (
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--t1, #F0F4FF)", marginBottom: 6 }}>
          {title}
        </div>
      ) : null}
      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--t2, #A8B8D0)" }}>
        {response}
      </div>
      {recommendation ? (
        <div
          style={{
            marginTop: 10,
            border: "1px solid #5B21B6",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--t1, #0A0A0A)",
            background: "rgba(124,58,237,.14)",
          }}
        >
          {recommendation}
        </div>
      ) : null}
    </div>
  );
}
