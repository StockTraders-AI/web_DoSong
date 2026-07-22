import { useEffect, useState } from "react";

export default function KhuyenNghiTuVanAI() {
  const [conditionResponse, setConditionResponse] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadConditionResponse() {
      try {
        const res = await fetch(
          "/api/condition-signal-latest?signal_key=waitbuy_over_100"
        );

        if (!res.ok) return;

        const data = await res.json();
        const response = String(data?.response || "").trim();

        if (!cancelled && response) {
          setConditionResponse(response);
        }
      } catch {
      }
    }

    loadConditionResponse();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ background: "linear-gradient(0deg, rgba(124,58,237,.12), rgba(124,58,237,.12)), var(--surf, #111520)", border: "1px solid #5B21B6", borderRadius: 16, padding: "16px 17px" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color: "var(--t1, #F0F4FF)", marginBottom: 6 }}>
        Khả năng tạo đáy cao – Chờ xác nhận !
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--t2, #A8B8D0)" }}>
        {conditionResponse}
      </div>
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
        Khuyến nghị: Giải ngân thăm dò 30% và chờ xác nhận chân sóng.
      </div>
    </div>
  );
}
