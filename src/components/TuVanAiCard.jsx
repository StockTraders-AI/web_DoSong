import { useState } from "react";

const SUGGEST_CHIPS = [
  "Chờ mua là gì?",
  "Sóng lớn có độ tin cậy bao nhiêu?",
  "Thị trường đang trong xu hướng nào?",
  "Chân sóng gần nhất là ngày nào?",
];

export default function TuVanAiCard() {
  const [question, setQuestion] = useState("");

  const handleSend = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    console.log("Gửi câu hỏi tới AI:", trimmed);
    setQuestion("");
  };

  return (
    <div style={{ background: "#111520", border: "1px solid #1E2A3E", borderRadius: 16, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "radial-gradient(circle at 30% 30%, #7C3FE0, #2E1B52)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className="ti ti-sparkles" style={{ color: "#E4D4FF", fontSize: 18 }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F0F4FF" }}>Tư vấn AI</div>
            <div style={{ fontSize: 12.5, color: "#5C7090", marginTop: 1 }}>
              Hỏi về danh mục, sóng ngành, chiến lược
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#3DD68C" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3DD68C", display: "inline-block" }} />
            Sẵn sàng
          </span>
          <button
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "transparent",
              border: "1px solid #3A2670",
              color: "#B788FF",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <i className="ti ti-arrow-up-right" style={{ fontSize: 14 }} aria-hidden="true" />
            Mở rộng
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {SUGGEST_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setQuestion(chip)}
            style={{
              background: "#171D2E",
              border: "1px solid #1E2A3E",
              color: "#C7D2E6",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 20,
              padding: "8px 14px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, background: "#171D2E", border: "1px solid #1E2A3E", borderRadius: 12, padding: "6px 6px 6px 16px" }}>
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") handleSend(); }}
          placeholder="Hỏi AI về danh mục, chiến lược..."
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#F0F4FF",
            fontSize: 14,
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          aria-label="Gửi câu hỏi"
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            border: "none",
            borderRadius: 9,
            background: "linear-gradient(135deg, #8B3FE8, #6B24C9)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <i className="ti ti-arrow-up" style={{ fontSize: 16 }} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}