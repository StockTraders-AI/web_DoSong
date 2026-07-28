import { useEffect, useState } from "react";

const DEFAULT_SIGNAL_KEY = "waitbuy_over_threshold";
const BUY_SIGNAL_KEY = "buy_over_threshold";
const EMPTY_SIGNAL = { title: "", response: "", recommendation: "" };

function hasSignalContent(signal) {
  return Boolean(String(signal?.response || "").trim());
}

function buildDoSongAdviceKey(advice) {
  if (!advice?.engine) return "";
  const wave = advice.wave || {};
  const engine = advice.engine || {};
  return JSON.stringify({
    date: advice.check_date || wave.date || "",
    signal_keys: advice.signal_keys || [],
    maTrangThai: engine.maTrangThai || "",
    pha: engine.pha || "",
    choMua: wave.choMua,
    mua: wave.mua,
    choBan: wave.choBan,
    ban: wave.ban,
    tong: wave.tong,
  });
}

function getSignalCandidates(signalKey, currentBuy) {
  const keys = [];
  if (signalKey && signalKey !== DEFAULT_SIGNAL_KEY) keys.push(signalKey);
  if (Number.isFinite(currentBuy)) keys.push(BUY_SIGNAL_KEY);
  keys.push(DEFAULT_SIGNAL_KEY);
  return [...new Set(keys)];
}

export default function KhuyenNghiTuVanAI({ signalKey = DEFAULT_SIGNAL_KEY, waitbuy = 0, buy = 0, refreshKey = 0, checkDate = "", doSongAdvice }) {
  const [conditionSignal, setConditionSignal] = useState(EMPTY_SIGNAL);
  const doSongAdviceKey = buildDoSongAdviceKey(doSongAdvice);

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
        if (doSongAdvice === null) {
          console.warn("KHUYEN_NGHI_DOSONG_WAITING", {
            checkDate,
            reason: "waiting_for_history_or_previous_session",
            attempt,
          });
          if (!cancelled && attempt + 1 < retryDelays.length) scheduleLoad(attempt + 1);
          return;
        }

        if (doSongAdvice?.engine) {
          console.warn("KHUYEN_NGHI_DOSONG_REQUEST", {
            checkDate: checkDate || doSongAdvice.check_date || "",
            maTrangThai: doSongAdvice.engine?.maTrangThai,
            pha: doSongAdvice.engine?.pha,
            signal_keys: doSongAdvice.signal_keys || [],
            previous_date: doSongAdvice.previous_date || "",
            source_date_count: Array.isArray(doSongAdvice.source_dates) ? doSongAdvice.source_dates.length : 0,
            wave: doSongAdvice.wave || {},
          });
          const res = await fetch("/api/do-song-advice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({
              check_date: checkDate || doSongAdvice.check_date || "",
              signal_keys: doSongAdvice.signal_keys || [],
              wave: doSongAdvice.wave || {},
              engine: doSongAdvice.engine || {},
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const engineSignal = {
              title: String(data?.title || "").trim(),
              response: String(data?.response || "").trim(),
              recommendation: String(data?.recommendation || "").trim(),
            };
            const responseDebug = {
              checkDate: data?.check_date || checkDate || doSongAdvice.check_date || "",
              flow_id: data?.flow_id || null,
              signal_keys: data?.signal_keys || [],
              maTrangThai: data?.maTrangThai || null,
              pha: data?.pha || null,
              has_content: hasSignalContent(engineSignal),
              title: engineSignal.title,
              response: engineSignal.response,
              recommendation: engineSignal.recommendation,
            };
            window.__KHUYEN_NGHI_DOSONG_RESPONSE__ = responseDebug;
            console.warn("KHUYEN_NGHI_DOSONG_RESPONSE", responseDebug);
            if (hasSignalContent(engineSignal)) {
              if (!cancelled) setConditionSignal(engineSignal);
              return;
            }
          }
          if (!cancelled && attempt + 1 < retryDelays.length) scheduleLoad(attempt + 1);
          return;
        }

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
  }, [signalKey, waitbuy, buy, refreshKey, checkDate, doSongAdviceKey]);

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
