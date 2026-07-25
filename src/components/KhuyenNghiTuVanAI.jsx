import { useEffect, useState } from "react";

const DEFAULT_SIGNAL_KEY = "waitbuy_over_threshold";
const BUY_SIGNAL_KEY = "buy_over_threshold";
const EMPTY_SIGNAL = { title: "", response: "", recommendation: "" };

function hasSignalContent(signal) {
  return Boolean(String(signal?.response || "").trim());
}

function getSignalCandidates(signalKey, currentBuy) {
  const keys = [];
  if (signalKey && signalKey !== DEFAULT_SIGNAL_KEY) keys.push(signalKey);
  if (Number.isFinite(currentBuy)) keys.push(BUY_SIGNAL_KEY);
  keys.push(DEFAULT_SIGNAL_KEY);
  return [...new Set(keys)];
}

export default function KhuyenNghiTuVanAI({ signalKey = DEFAULT_SIGNAL_KEY, waitbuy = 0, buy = 0, refreshKey = 0, checkDate = "" }) {
  const [conditionSignal, setConditionSignal] = useState(EMPTY_SIGNAL);

  useEffect(() => {
    let cancelled = false;
    const retryTimers = [];
    const currentWaitbuy = Number(waitbuy) || 0;
    const currentBuy = Number(buy) || 0;
    const retryDelays = [0, 2000, 6000, 12000];

    setConditionSignal(EMPTY_SIGNAL);

    function scheduleLoad(attempt) {
      const delay = retryDelays[attempt] ?? 0;
      const timer = window.setTimeout(() => loadConditionResponse(attempt), delay);
      retryTimers.push(timer);
    }

    async function loadConditionResponse(attempt = 1) {
      try {
        const candidates = getSignalCandidates(signalKey || DEFAULT_SIGNAL_KEY, currentBuy);
        let nextSignal = EMPTY_SIGNAL;

        for (const candidateKey of candidates) {
          const params = new URLSearchParams({
            signal_key: candidateKey,
            waitbuy: String(currentWaitbuy),
            buy: String(currentBuy),
            refresh_key: String(refreshKey),
            _: String(Date.now()),
          });
          if (checkDate) params.set("check_date", checkDate);

          const res = await fetch(`/api/condition-signal-latest?${params.toString()}`, {
            cache: "no-store",
          });
          if (!res.ok) continue;

          const data = await res.json();
          const candidateSignal = {
            title: String(data?.title || "").trim(),
            response: String(data?.response || "").trim(),
            recommendation: String(data?.recommendation || "").trim(),
          };

          if (hasSignalContent(candidateSignal)) {
            nextSignal = candidateSignal;
            break;
          }
        }

        if (!cancelled) {
          setConditionSignal(nextSignal);
          if (!hasSignalContent(nextSignal) && attempt + 1 < retryDelays.length) scheduleLoad(attempt + 1);
        }
      } catch {
        if (!cancelled) {
          setConditionSignal(EMPTY_SIGNAL);
          if (attempt + 1 < retryDelays.length) scheduleLoad(attempt + 1);
        }
      }
    }

    loadConditionResponse(0);

    return () => {
      cancelled = true;
      retryTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [signalKey, waitbuy, buy, refreshKey, checkDate]);

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
