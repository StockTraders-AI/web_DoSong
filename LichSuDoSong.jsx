import React from "react";

/**
 * LichSuDoSong — card "Lịch sử dò sóng" (3 ngày / trang)
 *
 * Donut mini dùng CÙNG hình học với VongTronDoSong: vòng mỏng, cung tỉ lệ theo
 * tổng mã có tín hiệu, xoay tâm cung "Chờ mua" về đáy, badge số đếm lồi trên cung,
 * số giữa là tổng mã theo dõi của ngày đó.
 *
 * Thanh TC (tin cậy) áp dụng ngưỡng thống nhất: >=70% xanh Chờ mua, <70% cam Chờ bán.
 *
 * Props:
 *   days      — mảng { date, week, today, total, trust, data:{cm,mu,cb,ba} }
 *   page      — trang hiện tại (1-based)
 *   totalDays — tổng số ngày trong lịch sử (hiện "1-3/60")
 *   pageCount — số chấm phân trang
 *   onPage    — callback (page) khi bấm ‹ › hoặc chấm
 */

const COLORS = { cm: "#3DD68C", mu: "#1A8A4A", cb: "#FF9F0A", ba: "#FF2D55" };
const TILE = {
  cm: { bg: "#0A2318", bd: "#0F3D22", lab: "#3DD68C", num: "#3DD68C" },
  mu: { bg: "#0F3D1A", bd: "#1A6628", lab: "#52E88A", num: "#fff" },
  cb: { bg: "#2B1800", bd: "#4A2E00", lab: "#FF9F0A", num: "#FF9F0A" },
  ba: { bg: "#200A0E", bd: "#3D1018", lab: "#FF2D55", num: "#FF2D55" },
};
const LABELS = { cm: "C.MUA", mu: "MUA", cb: "C.BÁN", ba: "BÁN" };
const ORDER = ["cm", "mu", "cb", "ba"];

const CX = 85, CY = 85, R = 62, SW = 13, BADGE_R = 11;
const CIRC = 2 * Math.PI * R;

function MiniDonut({ day }) {
  const { data, total } = day;
  const sig = ORDER.reduce((s, k) => s + data[k], 0);
  const pct = Object.fromEntries(ORDER.map((k) => [k, sig ? (data[k] / sig) * 100 : 0]));
  const startDeg = 180 - (pct.cm * 3.6) / 2;

  let cum = 0;
  const segs = ORDER.map((k) => {
    const seg = { key: k, dash: (CIRC * pct[k]) / 100, offset: (-CIRC * cum) / 100, midDeg: startDeg + (cum + pct[k] / 2) * 3.6 };
    cum += pct[k];
    return seg;
  });

  return (
    <svg
      width="170" height="170" viewBox="0 0 170 170" style={{ display: "block", margin: "10px auto 6px" }}
      role="img"
      aria-label={`Ngày ${day.date}: tổng ${total} mã, ${ORDER.map((k) => `${data[k]} ${LABELS[k]}`).join(", ")}, tin cậy ${day.trust}%`}
    >
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#161B28" strokeWidth={SW} />
      {segs.map((s) => (
        <circle
          key={s.key} cx={CX} cy={CY} r={R} fill="none"
          stroke={COLORS[s.key]} strokeWidth={SW} strokeLinecap="butt"
          strokeDasharray={`${s.dash.toFixed(2)} ${(CIRC - s.dash).toFixed(2)}`}
          strokeDashoffset={s.offset.toFixed(2)}
          transform={`rotate(${(startDeg - 90).toFixed(2)} ${CX} ${CY})`}
        />
      ))}
      {segs.map((s) => {
        const a = (s.midDeg * Math.PI) / 180;
        const x = CX + R * Math.sin(a), y = CY - R * Math.cos(a);
        return (
          <g key={`b-${s.key}`}>
            <circle cx={x} cy={y} r={BADGE_R} fill={COLORS[s.key]} />
            <text x={x} y={y + 3.8} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800" fontFamily="system-ui">
              {data[s.key]}
            </text>
          </g>
        );
      })}
      <text x={CX} y={CY + 9} textAnchor="middle" fill="#F0F4FF" fontSize="27" fontWeight="800" fontFamily="system-ui">
        {total}
      </text>
    </svg>
  );
}

function DayCard({ day }) {
  const good = day.trust >= 70;
  const trustColor = good ? "#3DD68C" : "#FF9F0A";
  return (
    <div style={{ ...st.day, ...(day.today ? st.dayToday : null) }}>
      <div style={{ ...st.ddate, ...(day.today ? { color: "#C9B8F0" } : null) }}>
        {day.date}
        {day.today && <span style={st.dtoday}>Hôm nay</span>}
      </div>
      <div style={st.dweek}>{day.week}</div>

      <MiniDonut day={day} />

      <div style={st.dstats}>
        {ORDER.map((k) => (
          <div key={k} style={{ ...st.dstat, background: TILE[k].bg, border: `1px solid ${TILE[k].bd}` }}>
            <span style={{ ...st.dlab, color: TILE[k].lab }}>{LABELS[k]}</span>
            <span style={{ ...st.dnum, color: TILE[k].num }}>{day.data[k]}</span>
          </div>
        ))}
      </div>

      <div style={st.trow}>
        <span style={st.tlab}>TC</span>
        <div style={st.tbar}>
          <div style={{ ...st.tfill, width: `${day.trust}%`, background: trustColor }} />
        </div>
        <span style={{ ...st.tpct, color: trustColor }}>{day.trust}%</span>
      </div>
    </div>
  );
}

export default function LichSuDoSong({
  days = [
    { date: "10/07", week: "T.6", today: true, total: 271, trust: 50, data: { cm: 46, mu: 4, cb: 21, ba: 14 } },
    { date: "09/07", week: "T.5", today: false, total: 269, trust: 20, data: { cm: 44, mu: 5, cb: 28, ba: 8 } },
    { date: "08/07", week: "T.4", today: false, total: 272, trust: 21, data: { cm: 51, mu: 14, cb: 26, ba: 2 } },
  ],
  page = 1,
  totalDays = 60,
  pageCount = 4,
  onPage = () => {},
}) {
  const perPage = days.length || 3;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, totalDays);

  return (
    <div style={st.card}>
      {/* ===== Header ===== */}
      <div style={st.header}>
        <div style={st.htitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="#5C7090" strokeWidth="1.8" />
            <polyline points="12,7 12,12 15.5,14" stroke="#5C7090" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Lịch sử dò sóng
          <span style={st.hsub}>({perPage} ngày gần nhất)</span>
        </div>
        <div style={st.pager}>
          <button
            style={{ ...st.pbtn, ...(page <= 1 ? st.pbtnOff : null) }}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Trang trước"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="15,6 9,12 15,18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span style={st.prange}>{from}-{to}/{totalDays}</span>
          <button
            style={{ ...st.pbtn, ...(to >= totalDays ? st.pbtnOff : null) }}
            disabled={to >= totalDays}
            onClick={() => onPage(page + 1)}
            aria-label="Trang sau"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="9,6 15,12 9,18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      {/* ===== 3 thẻ ngày ===== */}
      <div style={st.days}>
        {days.map((d) => (
          <DayCard key={d.date} day={d} />
        ))}
      </div>

      {/* ===== Chấm phân trang ===== */}
      <div style={st.dots}>
        {Array.from({ length: pageCount }, (_, i) => (
          <span
            key={i}
            onClick={() => onPage(i + 1)}
            style={{ ...st.dot, ...(i + 1 === page ? st.dotActive : null) }}
          />
        ))}
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
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  htitle: { display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: 700 },
  hsub: { fontSize: 15, color: "#5C7090", fontWeight: 400, marginLeft: 2 },
  pager: { display: "flex", alignItems: "center", gap: 10 },
  pbtn: {
    width: 38, height: 38, borderRadius: 11, background: "#161B28", border: "1px solid #1E2A3E",
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#F0F4FF",
  },
  pbtnOff: { opacity: 0.35, cursor: "default" },
  prange: { fontSize: 14, color: "#5C7090" },
  days: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 },
  day: { borderRadius: 14, padding: "16px 14px", background: "#141926", border: "1px solid #1E2A3E", textAlign: "center" },
  dayToday: { background: "#1A1230", border: "1px solid #4A2E8A" },
  ddate: { fontSize: 15, fontWeight: 700, color: "#8A9BB8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  dtoday: { fontSize: 11, fontWeight: 700, color: "#B788FF", background: "#2E1B52", borderRadius: 6, padding: "3px 8px" },
  dweek: { fontSize: 12, color: "#3A4A60", marginTop: 3 },
  dstats: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, margin: "8px 0 12px" },
  dstat: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 9, padding: "7px 11px" },
  dlab: { fontSize: 10, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase" },
  dnum: { fontSize: 17, fontWeight: 800, lineHeight: 1, fontFamily: '"JetBrains Mono",ui-monospace,monospace' },
  trow: { display: "flex", alignItems: "center", gap: 9, padding: "0 4px" },
  tlab: { fontSize: 12, color: "#3A4A60", fontWeight: 700 },
  tbar: { flex: 1, height: 5, borderRadius: 3, background: "#1E2A3E", overflow: "hidden" },
  tfill: { height: "100%", borderRadius: 3 },
  tpct: { fontSize: 14, fontWeight: 800 },
  dots: { display: "flex", justifyContent: "center", gap: 9, marginTop: 16 },
  dot: { width: 9, height: 9, borderRadius: "50%", background: "#2A3244", cursor: "pointer" },
  dotActive: { background: "#7C3AED" },
};
