import React from "react";

/**
 * VongTronDoSong — card "Vòng tròn dò sóng"
 *
 * - Donut: 4 cung tỉ lệ theo tổng mã CÓ TÍN HIỆU (phủ kín vòng), xoay để tâm
 *   cung "Chờ mua" luôn nằm ở đáy. Badge số đếm lồi ra trên mỗi cung.
 * - Số giữa donut: tổng mã theo dõi (total).
 * - 4 thẻ bên phải: số đếm + % trên tổng mã theo dõi.
 * - Huy hiệu tin cậy: >=70% dùng bộ màu Chờ mua (xanh), <70% dùng bộ màu Chờ bán (cam).
 *
 * Props (đều có mặc định, cắm API vào là chạy):
 *   data  = { cm, mu, cb, ba }  — số mã Chờ mua / Mua / Chờ bán / Bán
 *   total — tổng số mã theo dõi
 *   trust — % tin cậy
 *   date  — chuỗi ngày hiển thị cạnh tiêu đề
 */

const COLORS = { cm: "#3DD68C", mu: "#1A8A4A", cb: "#FF9F0A", ba: "#FF2D55" };
const LABELS = { cm: "Chờ mua", mu: "Mua", cb: "Chờ bán", ba: "Bán" };
const ORDER = ["cm", "mu", "cb", "ba"];

const BOX_STYLES = {
  cm: { bg: "#0A2318", border: "#0F3D22", label: "#3DD68C", num: "#3DD68C", pct: "#3DD68C" },
  mu: { bg: "#0F3D1A", border: "#1A6628", label: "#52E88A", num: "#fff", pct: "rgba(255,255,255,.65)" },
  cb: { bg: "#2B1800", border: "#4A2E00", label: "#FF9F0A", num: "#FF9F0A", pct: "#FF9F0A" },
  ba: { bg: "#200A0E", border: "#3D1018", label: "#FF2D55", num: "#FF2D55", pct: "#FF2D55" },
};

const TRUST_STYLES = {
  good: { bg: "#0D2B1A", border: "#1A5C2A", color: "#3DD68C" }, // >= 70%
  low: { bg: "#2B1800", border: "#4A2E00", color: "#FF9F0A" }, // < 70% (bộ màu Chờ bán)
};

const CX = 160, CY = 160, R = 120, SW = 26, BADGE_R = 19;
const CIRC = 2 * Math.PI * R;

export default function VongTronDoSong({
  data = { cm: 46, mu: 4, cb: 21, ba: 14 },
  total = 402,
  trust = 50,
  date = "2026-07-10",
}) {
  const sig = ORDER.reduce((s, k) => s + data[k], 0);

  // Cung + badge: tỉ lệ theo tổng mã có tín hiệu, tâm cung Chờ mua ở đáy (180°)
  const pct = Object.fromEntries(ORDER.map((k) => [k, sig ? (data[k] / sig) * 100 : 0]));
  const startDeg = 180 - (pct.cm * 3.6) / 2;

  let cum = 0;
  const segments = ORDER.map((k) => {
    const seg = {
      key: k,
      dash: (CIRC * pct[k]) / 100,
      offset: (-CIRC * cum) / 100,
      midDeg: startDeg + (cum + pct[k] / 2) * 3.6,
    };
    cum += pct[k];
    return seg;
  });

  const trustStyle = trust >= 70 ? TRUST_STYLES.good : TRUST_STYLES.low;

  return (
    <div style={st.card}>
      {/* ===== Header ===== */}
      <div style={st.header}>
        <div style={st.htitle}>
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="8" fill="none" stroke="#5C7090" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="4" fill="none" stroke="#5C7090" strokeWidth="1.5" />
            <line x1="10" y1="2" x2="10" y2="6" stroke="#5C7090" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 2 A8 8 0 0 1 17 6.5" stroke="#3DD68C" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
          Vòng tròn dò sóng
          <span style={st.hmeta}>· {date}</span>
        </div>

        <div
          style={{
            ...st.trust,
            background: trustStyle.bg,
            border: `1px solid ${trustStyle.border}`,
            color: trustStyle.color,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 3L4 7v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7L12 3z"
              stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none"
            />
            <polyline
              points="9,12 11,14 15,10"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          Tin cậy {trust}%
        </div>
      </div>

      {/* ===== Body: donut trái + 4 thẻ phải ===== */}
      <div style={st.body}>
        <svg
          width="280" height="280" viewBox="0 0 320 320" style={{ flexShrink: 0 }} role="img"
          aria-label={`Vòng tròn dò sóng: tổng ${total} mã theo dõi, ${sig} mã có tín hiệu — ${ORDER.map(
            (k) => `${data[k]} ${LABELS[k]}`
          ).join(", ")}`}
        >
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#161B28" strokeWidth={SW} />

          {segments.map((s) => (
            <circle
              key={s.key}
              cx={CX} cy={CY} r={R} fill="none"
              stroke={COLORS[s.key]} strokeWidth={SW} strokeLinecap="butt"
              strokeDasharray={`${s.dash.toFixed(2)} ${(CIRC - s.dash).toFixed(2)}`}
              strokeDashoffset={s.offset.toFixed(2)}
              transform={`rotate(${(startDeg - 90).toFixed(2)} ${CX} ${CY})`}
            />
          ))}

          {segments.map((s) => {
            const a = (s.midDeg * Math.PI) / 180;
            const x = CX + R * Math.sin(a);
            const y = CY - R * Math.cos(a);
            return (
              <g key={`badge-${s.key}`}>
                <circle cx={x} cy={y} r={BADGE_R} fill={COLORS[s.key]} />
                <text
                  x={x} y={y + 5.5} textAnchor="middle" fill="#fff"
                  fontSize="16" fontWeight="800" fontFamily="system-ui"
                >
                  {data[s.key]}
                </text>
              </g>
            );
          })}

          <text
            x={CX} y={CY + 16} textAnchor="middle" fill="#F0F4FF"
            fontSize="46" fontWeight="800" fontFamily="system-ui"
          >
            {total}
          </text>
        </svg>

        <div style={st.boxes}>
          {ORDER.map((k) => {
            const b = BOX_STYLES[k];
            return (
              <div key={k} style={{ ...st.box, background: b.bg, border: `1px solid ${b.border}` }}>
                <div style={{ ...st.blabel, color: b.label }}>{LABELS[k]}</div>
                <div style={{ ...st.bnum, color: b.num }}>{data[k]}</div>
                <div style={{ ...st.bpct, color: b.pct }}>
                  {total ? ((data[k] / total) * 100).toFixed(1) : "0.0"}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const st = {
  card: {
    background: "#111520",
    border: ".5px solid #1E2A3E",
    borderRadius: 16,
    padding: "22px 24px",
    maxWidth: 1000,
    color: "#F0F4FF",
    fontFamily: '-apple-system,"Inter",sans-serif',
    WebkitFontSmoothing: "antialiased",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  htitle: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    fontSize: 17,
    fontWeight: 700,
    color: "#F0F4FF",
  },
  hmeta: { fontSize: 13, color: "#3A4A60", fontWeight: 400, marginLeft: 2 },
  trust: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    borderRadius: 30,
    padding: "9px 18px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  body: { display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" },
  boxes: {
    flex: 1,
    minWidth: 280,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  box: { borderRadius: 14, padding: "18px 20px", cursor: "pointer", transition: "opacity .15s" },
  blabel: {
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".1em",
    marginBottom: 8,
  },
  bnum: { fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: -1 },
  bpct: { fontSize: 13, marginTop: 6, opacity: 0.75 },
};
