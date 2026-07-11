import { useState } from "react";

// ── Design tokens (inject vào :root nếu chưa có) ──
const TOKENS = `
  --bg:#0A0D14;--surf:#111520;--elev:#171D2E;--bdr:#242E42;--bdrs:#1C2538;
  --t1:#F0F4FF;--t2:#A8B8D0;--t3:#5C7090;--t4:#3A4A60;
  --B:#7C3AED;--Bs:rgba(124,58,237,.13);--Bb:rgba(124,58,237,.30);
  --R:#FF2D55;
  --sw:224px;--th:52px;
`;

// ── Nav item config ──
const NAV = [
  {
    section: "Tổng quan",
    items: [
      { id: "do-song",      icon: "ti-wave-sine",           label: "Dò sóng thị trường" },
      { id: "dashboard",    icon: "ti-layout-dashboard",    label: "Dashboard" },
      { id: "dong-tien-tt", icon: "ti-trending-up",         label: "Dòng tiền thị trường" },
    ],
  },
  {
    section: "Phân tích dòng tiền",
    items: [
      { id: "dong-tien-nganh",     icon: "ti-building-community", label: "Dòng tiền ngành" },
      { id: "dong-tien-nganh-phu", icon: "ti-building-community", label: "Dòng tiền ngành phụ" },
      { id: "dong-tien-cp",        icon: "ti-chart-line",         label: "Dòng tiền cổ phiếu" },
    ],
  },
  {
    section: "Bảng SMDT",
    items: [
      { id: "smdt-nganh", icon: "ti-table",        label: "Bảng SMDT Ngành" },
      { id: "smdt-ma",    icon: "ti-table-column", label: "Bảng SMDT Mã" },
      { id: "top-manh",   icon: "ti-star",         label: "Top cổ phiếu mạnh" },
    ],
  },
  {
    section: "Tiện ích",
    items: [
      { id: "radar",    icon: "ti-radar",    label: "Radar ngành dẫn sóng" },
      { id: "canh-bao", icon: "ti-bell",     label: "Cảnh báo dòng tiền", badge: "3" },
      { id: "danh-muc", icon: "ti-briefcase",label: "Danh mục của bạn" },
      { id: "bo-loc",   icon: "ti-filter",   label: "Bộ lọc nâng cao" },
      { id: "lich-su",  icon: "ti-history",  label: "Lịch sử giao dịch" },
    ],
  },
];

// ── Sub-components ──
function NavItem({ id, icon, label, badge, active, onClick }) {
  return (
    <div
      onClick={() => onClick(id)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "7px 10px",
        margin: "1px 6px",
        borderRadius: 8,
        cursor: "pointer",
        color: active ? "var(--B)" : "var(--t3)",
        background: active ? "var(--Bs)" : "transparent",
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: "nowrap",
        userSelect: "none",
        transition: "all .12s",
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "var(--elev)"; e.currentTarget.style.color = "var(--t2)"; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--t3)"; } }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 16, flexShrink: 0, width: 18 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: 9, background: "var(--R)", color: "#fff",
          borderRadius: 10, padding: "1px 6px", fontWeight: 700,
        }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{
      padding: "14px 12px 4px",
      fontSize: 9, fontWeight: 800,
      color: "var(--t4)",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
    }}>
      {text}
    </div>
  );
}

function PremiumCard() {
  return (
    <div style={{
      background: "linear-gradient(135deg,#2D1B69,#1A0E40)",
      border: ".5px solid var(--Bb)",
      borderRadius: 10,
      padding: 12,
    }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: "var(--B)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
        ⭐ Premium
      </div>
      <div style={{ fontSize: 11, color: "var(--t2)", lineHeight: 1.5, marginBottom: 10 }}>
        Mở khóa toàn bộ tính năng &amp; dữ liệu lịch sử không giới hạn
      </div>
      <button style={{
        width: "100%", background: "var(--B)", border: "none",
        borderRadius: 7, padding: 7,
        fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
      }}>
        Nâng cấp ngay →
      </button>
    </div>
  );
}

// ── Main Sidebar component ──
export default function Sidebar({ activeId = "do-song", onNavigate }) {
  const [active, setActive] = useState(activeId);

  const handleClick = (id) => {
    setActive(id);
    onNavigate?.(id);
  };

  return (
    <>
      {/* inject tokens nếu dùng standalone */}
      <style>{`:root{${TOKENS}}`}</style>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/3.19.0/iconfont/tabler-icons.min.css"
      />

      <aside style={{
        width: "var(--sw)",
        background: "var(--surf)",
        borderRight: ".5px solid var(--bdr)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
      }}>

        {/* Logo */}
        <div style={{
          height: "var(--th)",
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 9,
          borderBottom: ".5px solid var(--bdr)",
          flexShrink: 0,
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg,#7C3AED,#4F46E5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <i className="ti ti-chart-candle" style={{ color: "#fff", fontSize: 16 }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "var(--t1)", letterSpacing: "-.3px" }}>
            StockTraders
          </span>
          <span style={{ fontSize: 9, background: "var(--Bs)", color: "var(--B)", borderRadius: 4, padding: "2px 6px", fontWeight: 700 }}>
            AI
          </span>
        </div>

        {/* Nav sections */}
        {NAV.map((sec) => (
          <div key={sec.section}>
            <SectionLabel text={sec.section} />
            {sec.items.map((item) => (
              <NavItem
                key={item.id}
                {...item}
                active={active === item.id}
                onClick={handleClick}
              />
            ))}
          </div>
        ))}

        {/* Premium card */}
        <div style={{ marginTop: "auto", padding: 12 }}>
          <PremiumCard />
        </div>
      </aside>
    </>
  );
}
