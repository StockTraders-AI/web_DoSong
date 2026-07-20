import { useEffect, useRef, useState } from "react";

const PORTFOLIO_CHAT_URL = import.meta.env.VITE_PORTFOLIO_CHAT_URL || "/api/portfolio-chat";
const USER_ID = "u1";
const DEFAULT_CONVERSATION_ID = "portfolio-test-1";

const TEXT = {
  title: "T\u01b0 v\u1ea5n AI",
  subtitle: "H\u1ecfi v\u1ec1 danh m\u1ee5c, s\u00f3ng ng\u00e0nh, chi\u1ebfn l\u01b0\u1ee3c",
  ready: "S\u1eb5n s\u00e0ng",
  loading: "\u0110ang tr\u1ea3 l\u1eddi",
  expand: "M\u1edf r\u1ed9ng",
  collapse: "Thu g\u1ecdn",
  placeholder: "H\u1ecfi v\u1ec1 danh m\u1ee5c, chi\u1ebfn l\u01b0\u1ee3c...",
  sendLabel: "G\u1eedi c\u00e2u h\u1ecfi",
  noAnswer: "Kh\u00f4ng c\u00f3 c\u00e2u tr\u1ea3 l\u1eddi.",
  apiError: "Kh\u00f4ng g\u1ecdi \u0111\u01b0\u1ee3c API t\u01b0 v\u1ea5n AI.",
};

const SUGGEST_CHIPS = [
  "M\u00e3 n\u00e0o \u0111\u00fang s\u00f3ng?",
  "Ng\u00e0nh n\u00e0o d\u1eabn d\u1eaft?",
  "N\u00ean c\u1eaft m\u00e3 n\u00e0o?",
  "Ph\u00e2n b\u1ed5 t\u1ef7 tr\u1ecdng?",
];

export default function TuVanAiCard() {
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState(DEFAULT_CONVERSATION_ID);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const handleSend = async (value = question) => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setQuestion("");
    if (inputRef.current) inputRef.current.style.height = "auto";
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
      if (!response.ok) throw new Error(payload.error || `API l\u1ed7i ${response.status}`);

      if (payload.conversation_id) setConversationId(payload.conversation_id);
      setMessages((current) => [...current, { role: "assistant", text: payload.answer || TEXT.noAnswer }]);
    } catch (sendError) {
      setError(sendError.message || TEXT.apiError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <div className="portfolio-ai-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes portfolioAiDot {
          0%, 80%, 100% { opacity: .32; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }

        .portfolio-ai-card {
          border: .5px solid var(--bdr, #242E42);
          border-radius: 16px;
          background: var(--surf, #111520);
        }

        .dm-expand-btn {
          height: 26px;
          border: .5px solid var(--Bb, rgba(124,58,237,.30));
          border-radius: 8px;
          background: var(--Bs, rgba(124,58,237,.13));
          color: var(--B, #7C3AED);
          padding: 0 10px;
          font: inherit;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }

        .dm-chat-msgs {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px 14px 0;
          max-height: 220px;
          overflow-y: auto;
        }

        .portfolio-ai-card.is-expanded .dm-chat-msgs {
          max-height: 320px;
        }

        .dm-msg {
          max-width: 88%;
          border-radius: 12px;
          padding: 8px 10px;
          font-size: 12.5px;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .dm-msg.user {
          align-self: flex-end;
          border: .5px solid var(--Bb, rgba(124,58,237,.30));
          background: var(--Bs, rgba(124,58,237,.13));
          color: var(--t1, #F0F4FF);
        }

        .dm-msg.assistant,
        .dm-typing-wrap {
          align-self: flex-start;
          border: .5px solid var(--bdr, #242E42);
          background: var(--elev, #171D2E);
          color: var(--t2, #C7D2E6);
        }

        .dm-typing-wrap {
          border-radius: 12px;
          padding: 10px 12px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .dm-typing-wrap span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--t2, #A8B8D0);
          animation: portfolioAiDot 1.1s infinite ease-in-out;
        }

        .dm-chip {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          border: .5px solid var(--bdr, #242E42);
          border-radius: 999px;
          background: var(--elev, #171D2E);
          color: var(--t2, #C7D2E6);
          padding: 0 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          user-select: none;
        }

        .dm-error {
          padding: 0 14px;
          margin-top: 8px;
          color: #FF2D55;
          font-size: 12px;
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .portfolio-ai-header {
            align-items: flex-start !important;
            flex-direction: column;
          }

          .portfolio-ai-actions {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

      <div
        className="portfolio-ai-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          background: "var(--elev)",
          borderBottom: ".5px solid var(--bdr)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: "var(--Bs)",
              border: ".5px solid var(--Bb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              color: "var(--P)",
            }}
          >
            {"\u2726"}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--t1)" }}>{TEXT.title}</div>
            <div style={{ fontSize: 9, color: "var(--t3)" }}>{TEXT.subtitle}</div>
          </div>
        </div>
        <div className="portfolio-ai-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--G)" }}>
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "var(--G)",
                display: "inline-block",
                animation: "pulse 2s infinite",
              }}
            />
            {loading ? TEXT.loading : TEXT.ready}
          </div>
          <button className="dm-expand-btn" onClick={() => setExpanded((value) => !value)} type="button">
            {expanded ? TEXT.collapse : `\u2197 ${TEXT.expand}`}
          </button>
        </div>
      </div>

      {(!!messages.length || loading) && (
        <div className="dm-chat-msgs">
          {messages.map((message, index) => (
            <div className={`dm-msg ${message.role}`} key={`${message.role}-${index}`}>
              {message.text}
            </div>
          ))}
          {loading && (
            <div className="dm-typing-wrap">
              {[0, 1, 2].map((dot) => (
                <span key={dot} style={{ animationDelay: `${dot * 0.16}s` }} />
              ))}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      <div style={{ padding: "6px 14px", display: "flex", gap: 5, flexWrap: "wrap", borderTop: ".5px solid var(--bdr)", flexShrink: 0 }}>
        {SUGGEST_CHIPS.map((chip) => (
          <button className="dm-chip" key={chip} type="button" disabled={loading} onClick={() => handleSend(chip)}>
            {chip}
          </button>
        ))}
      </div>

      {error && <div className="dm-error">{error}</div>}

      <div style={{ display: "flex", gap: 6, padding: "8px 14px", borderTop: ".5px solid var(--bdr)", flexShrink: 0, alignItems: "flex-end" }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 72)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder={TEXT.placeholder}
          disabled={loading}
          style={{
            flex: 1,
            padding: "6px 10px",
            borderRadius: 7,
            border: ".5px solid var(--bdr)",
            background: "var(--elev)",
            color: "var(--t1)",
            fontSize: 11,
            outline: "none",
            resize: "none",
            minHeight: 30,
            maxHeight: 72,
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading}
          aria-label={TEXT.sendLabel}
          type="button"
          style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            background: "var(--B,#7C3AED)",
            color: "white",
            border: "none",
            cursor: loading ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 13,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {"\u27a4"}
        </button>
      </div>
    </div>
  );
}