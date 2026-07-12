import { useState } from "react";

const PORTFOLIO_CHAT_URL = import.meta.env.VITE_PORTFOLIO_CHAT_URL || "/api/portfolio-chat";
const USER_ID = "u1";
const DEFAULT_CONVERSATION_ID = "portfolio-test-1";

const SUGGEST_CHIPS = [
  "Chờ mua là gì?",
  "Chân sóng gần nhất là ngày nào?",
];

export default function TuVanAiCard() {
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState(DEFAULT_CONVERSATION_ID);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: trimmed }]);

    try {
      const response = await fetch(PORTFOLIO_CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          user_id: USER_ID,
          conversation_id: conversationId,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `API lỗi ${response.status}`);

      if (payload.conversation_id) setConversationId(payload.conversation_id);
      setMessages((current) => [...current, { role: "assistant", text: payload.answer || "Không có câu trả lời." }]);
    } catch (sendError) {
      setError(sendError.message || "Không gọi được API tư vấn AI.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--surf, #111520)", border: "1px solid var(--cbdr, var(--bdr, #1E2A3E))", borderRadius: 16, padding: "15px 16px" }}>
      <style>{`
        @keyframes portfolioAiDot {
          0%, 80%, 100% { opacity: .32; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>

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
              whiteSpace: "nowrap",
            }}
          >
            <i className="ti ti-sparkles" style={{ color: "#E4D4FF", fontSize: 18 }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--t1, #F0F4FF)" }}>Tư vấn AI</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: loading ? "#FF9F0A" : "#3DD68C" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: loading ? "#FF9F0A" : "#3DD68C", display: "inline-block" }} />
            {loading ? "Đang trả lời" : "Sẵn sàng"}
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
              fontSize: 12.5,
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
              background: "var(--elev, #171D2E)",
              border: "1px solid var(--cbdr, var(--bdr, #1E2A3E))",
              color: "var(--t2, #C7D2E6)",
              fontSize: 12.5,
              fontWeight: 500,
              borderRadius: 20,
              padding: "7px 12px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {(!!messages.length || loading) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, maxHeight: 220, overflowY: "auto" }}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                border: `1px solid ${message.role === "user" ? "#3A2670" : "#1E2A3E"}`,
                borderRadius: 12,
                padding: "8px 10px",
                background: message.role === "user" ? "var(--Bs, #1C1440)" : "var(--elev, #171D2E)",
                color: message.role === "user" ? "var(--t1, #F0F4FF)" : "var(--t2, #C7D2E6)",
                fontSize: 12.5,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {message.text}
            </div>
          ))}
          {loading && (
            <div style={{
              alignSelf: "flex-start",
              border: "1px solid var(--cbdr, var(--bdr, #1E2A3E))",
              borderRadius: 12,
              padding: "10px 12px",
              background: "var(--elev, #171D2E)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}>
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--t2, #A8B8D0)",
                    display: "inline-block",
                    animation: "portfolioAiDot 1.1s infinite ease-in-out",
                    animationDelay: `${dot * 0.16}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div style={{ marginTop: 10, color: "#FF2D55", fontSize: 12, lineHeight: 1.4 }}>{error}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, background: "var(--elev, #171D2E)", border: "1px solid var(--cbdr, var(--bdr, #1E2A3E))", borderRadius: 12, padding: "5px 6px 5px 14px" }}>
        <input
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") handleSend(); }}
          placeholder="Hỏi AI về danh mục, chiến lược..."
          disabled={loading}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--t1, #F0F4FF)",
            fontSize: 13,
            fontFamily: "inherit",
            opacity: loading ? 0.7 : 1,
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          aria-label="Gửi câu hỏi"
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            border: "none",
            borderRadius: 9,
            background: loading ? "var(--t4, #3A4A60)" : "linear-gradient(135deg, #8B3FE8, #6B24C9)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: loading ? "default" : "pointer",
          }}
        >
          <i className={loading ? "ti ti-loader-2" : "ti ti-arrow-up"} style={{ fontSize: 16 }} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}