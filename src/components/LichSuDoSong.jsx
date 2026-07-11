import React from "react";

/**
 * LichSuDoSong — card "Lịch sử dò sóng" (3 ngày / trang)
 *
 * Donut mini vẽ theo kỹ thuật donut Dashboard (stocktraders_pc, bản nhỏ drawDonut):
 * - SVG <path> arc, khe hở 5°, đầu cung bo tròn, bắt đầu 12h theo chiều kim đồng hồ
 * - Đĩa nền 2 lớp đổi theo theme; bảng màu donut: #1baf7a / #0ca30c / #eda100 / #e34948
 * - Badge r=12, chữ 11px weight 500, chỉ hiện khi cung >12°, kẹp trong viewBox
 * - Số giữa = tổng mã theo dõi của ngày, fs 22 weight 700
 *
 * Thanh TC: >=70% xanh Chờ mua, <70% cam Chờ bán (token theo theme).
 * Prop theme="dark"|"light" — token 2 theme lấy từ stocktraders_pc.
 */

const ORDER = ["cm", "mu", "cb", "ba"];
const LABELS = { cm: "C.MUA", mu: "MUA", cb: "C.BÁN", ba: "BÁN" };
const DCOL = { cm: "#1baf7a", mu: "#0ca30c", cb: "#eda100", ba: "#e34948" };

const THEMES = {
  dark: {
    surf: "#111520", elev: "#171D2E", bdr: "#242E42", cardBdr: "#1E2A3E",
    t1: "#F0F4FF", t2: "#A8B8D0", t3: "#5C7090", t4: "#3A4A60", B: "#7C3AED",
    dayBg: "#141926", dayBd: "#1E2A3E", tdyBg: "#1A1230", tdyBd: "#4A2E8A",
    tdyDate: "#C9B8F0", tdyPillC: "#B788FF", tdyPillBg: "#2E1B52",
    trustGood: "#3DD68C", trustLow: "#FF9F0A",
    tile: {
      cm: { bg: "#0A2318", bd: "#0F3D22", lab: "#3DD68C", num: "#3DD68C" },
      mu: { bg: "#0F3D1A", bd: "#1A6628", lab: "#52E88A", num: "#fff" },
      cb: { bg: "#2B1800", bd: "#4A2E00", lab: "#FF9F0A", num: "#FF9F0A" },
      ba: { bg: "#200A0E", bd: "#3D1018", lab: "#FF2D55", num: "#FF2D55" },
    },
  },
  light: {
    surf: "#fff", elev: "#F7F6FC", bdr: "#E0DEEA", cardBdr: "#E0DEEA",
    t1: "#0A0A0A", t2: "#3A4250", t3: "#6B737F", t4: "#9FA5AE", B: "#6D28D9",
    dayBg: "#F7F6FC", dayBd: "#E0DEEA", tdyBg: "#F5F3FF", tdyBd: "#DDD6FE",
    tdyDate: "#6D28D9", tdyPillC: "#6D28D9", tdyPillBg: "rgba(109,40,217,.10)",
    trustGood: "#16A34A", trustLow: "#D97706",
    tile: {
      cm: { bg: "#F0FDF4", bd: "#A7F3C4", lab: "#16A34A", num: "#16A34A" },
      mu: { bg: "#DCFCE7", bd: "#86EFAC", lab: "#15803D", num: "#0A0A0A" },
      cb: { bg: "#FFFBEB", bd: "#FCD34D", lab: "#D97706", num: "#D97706" },
      ba: { bg: "#FFF1F2", bd: "#FECDD3", lab: "#E11D48", num: "#E11D48" },
    },
  },
};

// Hình học drawDonut bản nhỏ
const CX = 80, CY = 80, R = 68, SW = 18, GAP = 5, INNER = 41;

function xy(deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
}
function arcP(s, e) {
  const p = xy(s), q = xy(e), lg = e - s > 180 ? 1 : 0;
  return `M${p.x.toFixed(2)} ${p.y.toFixed(2)}A${R} ${R} 0 ${lg} 1 ${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
}

function MiniDonut({ day, T, dayBg }) {
  const { data, total } = day;
  const sig = ORDER.reduce((s, k) => s + data[k], 0);
  const tDeg = 360 - ORDER.length * GAP;

  let cur = 0;
  const segs = ORDER.map((k) => {
    if (!data[k] || !sig) {
      cur += GAP;
      return { key: k, d: null, badge: null };
    }
    const span = (data[k] / sig) * tDeg;
    const s = cur + GAP / 2, e = s + span, mid = (s + e) / 2;
    cur += span + GAP;
    let badge = null;
    if (span > 12) {
      const p = xy(mid);
      badge = { x: Math.max(13, Math.min(147, p.x)), y: Math.max(13, Math.min(147, p.y)) };
    }
    return { key: k, d: arcP(s, e), badge };
  });

  return (
    <svg
      width="176" height="176" viewBox="0 0 160 160" style={{ display: "block", margin: "10px auto 6px" }}
      role="img"
      aria-label={`Ngày ${day.date}: tổng ${total} mã, ${ORDER.map((k) => `${data[k]} ${LABELS[k]}`).join(", ")}, tin cậy ${day.trust}%`}
    >
      <circle cx={CX} cy={CY} r={R} fill={T.surf} stroke={T.bdr} strokeWidth="0.5" />
      {segs.map((s) =>
        s.d ? <path key={s.key} d={s.d} stroke={DCOL[s.key]} strokeWidth={SW} fill="none" strokeLinecap="round" /> : null
      )}
      <circle cx={CX} cy={CY} r={INNER} fill={dayBg} stroke={T.bdr} strokeWidth="0.5" />
      {segs.map((s) =>
        s.badge ? (
          <g key={`b-${s.key}`}>
            <circle cx={s.badge.x.toFixed(1)} cy={s.badge.y.toFixed(1)} r={12} fill={DCOL[s.key]} />
            <text
              x={s.badge.x.toFixed(1)} y={(s.badge.y + 4).toFixed(1)} textAnchor="middle"
              fill="#fff" fontSize="11" fontWeight="500" fontFamily="inherit"
            >
              {data[s.key]}
            </text>
          </g>
        ) : null
      )}
      <text x={CX} y={CY + 8} textAnchor="middle" fill={T.t1} fontSize="22" fontWeight="700" fontFamily="inherit">
        {total}
      </text>
    </svg>
  );
}

function DayCard({ day, T }) {
  const trustColor = day.trust >= 70 ? T.trustGood : T.trustLow;
  const dayBg = day.today ? T.tdyBg : T.dayBg;
  return (
    <div
      style={{
        ...st.day,
        background: dayBg,
        border: `1px solid ${day.today ? T.tdyBd : T.dayBd}`,
      }}
    >
      <div style={{ ...st.ddate, color: day.today ? T.tdyDate : T.t2 }}>
        {day.date}
        {day.today && (
          <span style={{ ...st.dtoday, color: T.tdyPillC, background: T.tdyPillBg }}>Hôm nay</span>
        )}
      </div>
      <div style={{ ...st.dweek, color: T.t4 }}>{day.week}</div>

      <MiniDonut day={day} T={T} dayBg={dayBg} />

      <div style={st.dstats}>
        {ORDER.map((k) => {
          const t = T.tile[k];
          return (
            <div key={k} style={{ ...st.dstat, background: t.bg, border: `1px solid ${t.bd}` }}>
              <span style={{ ...st.dlab, color: t.lab }}>{LABELS[k]}</span>
              <span style={{ ...st.dnum, color: t.num }}>{day.data[k]}</span>
            </div>
          );
        })}
      </div>

      <div style={st.trow}>
        <span style={{ ...st.tlab, color: T.t4 }}>TC</span>
        <div style={{ ...st.tbar, background: T.bdr }}>
          <div style={{ ...st.tfill, width: `${day.trust}%`, background: trustColor }} />
        </div>
        <span style={{ ...st.tpct, color: trustColor }}>{day.trust}%</span>
      </div>
    </div>
  );
}

export default function LichSuDoSong({
  days = [],
  page = 1,
  totalDays = 0,
  pageCount = 1,
  onPage = () => {},
  theme = "dark", // "dark" | "light"
}) {
  const T = THEMES[theme] || THEMES.dark;
  const perPage = days.length || 3;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, totalDays);
  const dotCount = Math.min(4, pageCount);
  const dotStart = Math.min(Math.max(page - 1, 0), Math.max(pageCount - dotCount, 0));
  const dotPages = Array.from({ length:dotCount }, (_, index) => dotStart + index + 1);

  return (
    <div style={{ ...st.card, background: T.surf, border: `.5px solid ${T.cardBdr}`, color: T.t1 }}>
      {/* ===== Header ===== */}
      <div style={st.header}>
        <div style={st.htitle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke={T.t3} strokeWidth="1.8" />
            <polyline points="12,7 12,12 15.5,14" stroke={T.t3} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Lịch sử dò sóng
          <span style={{ ...st.hsub, color: T.t3 }}>({perPage} ngày gần nhất)</span>
        </div>
        <div style={st.pager}>
          <button
            style={{ ...st.pbtn, background: T.elev, border: `1px solid ${T.cardBdr}`, color: T.t1, ...(page <= 1 ? st.pbtnOff : null) }}
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Trang trước"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="15,6 9,12 15,18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <span style={{ ...st.prange, color: T.t3 }}>{from}-{to}/{totalDays}</span>
          <button
            style={{ ...st.pbtn, background: T.elev, border: `1px solid ${T.cardBdr}`, color: T.t1, ...(to >= totalDays ? st.pbtnOff : null) }}
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
          <DayCard key={d.date} day={d} T={T} />
        ))}
      </div>

      {/* ===== Chấm phân trang ===== */}
      <div style={st.dots}>
        {dotPages.map((dotPage) => (
          <span
            key={dotPage}
            onClick={() => onPage(dotPage)}
            style={{ ...st.dot, background: dotPage === page ? T.B : T.bdr }}
          />
        ))}
      </div>
    </div>
  );
}

const st = {
  card: {
    borderRadius: 16,
    padding: "22px 24px",
    maxWidth: 1000,
    fontFamily: '-apple-system,"Inter",sans-serif',
    WebkitFontSmoothing: "antialiased",
    transition: "background .2s",
  },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  htitle: { display: "flex", alignItems: "center", gap: 9, fontSize: 17, fontWeight: 700 },
  hsub: { fontSize: 15, fontWeight: 400, marginLeft: 2 },
  pager: { display: "flex", alignItems: "center", gap: 10 },
  pbtn: {
    width: 38, height: 38, borderRadius: 11,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  pbtnOff: { opacity: 0.35, cursor: "default" },
  prange: { fontSize: 14 },
  days: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 },
  day: { borderRadius: 14, padding: "16px 14px", textAlign: "center" },
  ddate: { fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  dtoday: { fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 8px" },
  dweek: { fontSize: 12, marginTop: 3 },
  dstats: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, margin: "8px 0 12px" },
  dstat: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 9, padding: "7px 11px" },
  dlab: { fontSize: 10, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase" },
  dnum: { fontSize: 17, fontWeight: 800, lineHeight: 1, fontFamily: '"JetBrains Mono",ui-monospace,monospace' },
  trow: { display: "flex", alignItems: "center", gap: 9, padding: "0 4px" },
  tlab: { fontSize: 12, fontWeight: 700 },
  tbar: { flex: 1, height: 5, borderRadius: 3, overflow: "hidden" },
  tfill: { height: "100%", borderRadius: 3 },
  tpct: { fontSize: 14, fontWeight: 800 },
  dots: { display: "flex", justifyContent: "center", gap: 9, marginTop: 16 },
  dot: { width: 9, height: 9, borderRadius: "50%", cursor: "pointer" },
};
