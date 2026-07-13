import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const DOW = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const fmt = (d) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

function buildMonthGrid(cursor) {
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const firstOfMonth = new Date(y, m, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ other: true, date: new Date(y, m - 1, daysInPrevMonth - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ other: false, date: new Date(y, m, d) });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const nd = new Date(last);
    nd.setDate(nd.getDate() + 1);
    cells.push({ other: true, date: nd });
  }
  return cells;
}

export default function DateTimeTravel({
  value,
  onChange,
  maxDate = new Date(),
  minDate = new Date(2020, 0, 1),
}) {
  const [internalDate, setInternalDate] = useState(value ?? new Date());
  const current = value ?? internalDate;
  const [open, setOpen] = useState(false);
  const [calCursor, setCalCursor] = useState(new Date(current));
  const popRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        popRef.current &&
        !popRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goTo = (d) => {
    let next = new Date(d);
    if (next > maxDate) next = new Date(maxDate);
    if (next < minDate) next = new Date(minDate);
    setInternalDate(next);
    setCalCursor(new Date(next));
    onChange?.(next);
  };

  const stepDay = (delta) => {
    const d = new Date(current);
    d.setDate(d.getDate() + delta);
    goTo(d);
  };

  const openCalendar = () => {
    setCalCursor(new Date(current));
    setOpen((o) => !o);
  };

  const isToday = sameDay(current, maxDate);
  const cells = buildMonthGrid(calCursor);
  const prevDisabled = current <= minDate;
  const nextDisabled = isToday;

  const iconButtonStyle = (disabled) => ({
    width: 26,
    height: 26,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: 0,
    borderRadius: 8,
    background: "transparent",
    color: disabled ? "#3A4A60" : "#8EA2C0",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    padding: 0,
    flexShrink: 0,
  });

  return (
    <div style={st.root}>
      <button
        type="button"
        onClick={() => stepDay(-1)}
        disabled={prevDisabled}
        style={iconButtonStyle(prevDisabled)}
        aria-label="Ngày trước"
      >
        <ChevronLeft size={15} />
      </button>

      <button
        ref={triggerRef}
        type="button"
        onClick={openCalendar}
        style={{ ...st.dateButton, color: isToday ? "#3DD68C" : "#D9E4F5" }}
      >
        <Calendar size={13} style={{ opacity: 0.72, flexShrink: 0 }} />
        <span>{fmt(current)}</span>
      </button>

      <button
        type="button"
        onClick={() => stepDay(1)}
        disabled={nextDisabled}
        style={iconButtonStyle(nextDisabled)}
        aria-label="Ngày sau"
      >
        <ChevronRight size={15} />
      </button>

      {open && (
        <div ref={popRef} style={st.popover}>
          <div style={st.monthHeader}>
            <button
              type="button"
              onClick={() => setCalCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
              style={st.monthButton}
            >
              <ChevronLeft size={12} />
            </button>
            <span style={st.monthTitle}>{MONTHS[calCursor.getMonth()]}, {calCursor.getFullYear()}</span>
            <button
              type="button"
              onClick={() => setCalCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
              style={st.monthButton}
            >
              <ChevronRight size={12} />
            </button>
          </div>

          <div style={st.grid}>
            {DOW.map((d) => (
              <div key={d} style={st.dow}>{d}</div>
            ))}
            {cells.map(({ other, date }, i) => {
              const disabled = date > maxDate || date < minDate;
              const selected = sameDay(date, current);
              const today = sameDay(date, maxDate);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    goTo(date);
                    setOpen(false);
                  }}
                  style={{
                    ...st.day,
                    color: disabled ? "#334155" : other ? "#53657F" : "#B6C5DB",
                    opacity: disabled ? 0.42 : other ? 0.55 : 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                    background: selected ? "#3DD68C" : "transparent",
                    border: today && !selected ? "1px solid #3DD68C" : "1px solid transparent",
                    fontWeight: selected ? 800 : 600,
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div style={st.footer}>
            <button
              type="button"
              onClick={() => {
                goTo(new Date(maxDate));
                setOpen(false);
              }}
              style={{ ...st.footerButton, color: "#3DD68C" }}
            >
              Hôm nay
            </button>
            <button type="button" onClick={() => setOpen(false)} style={st.footerButton}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  root: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    height: 32,
    borderRadius: 12,
    border: "0.5px solid #242E42",
    background: "rgba(17,21,32,.78)",
    padding: 3,
    fontFamily: '-apple-system,"Inter","Segoe UI",sans-serif',
    verticalAlign: "middle",
  },
  dateButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 26,
    border: 0,
    borderRadius: 8,
    background: "transparent",
    padding: "0 7px",
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    letterSpacing: 0,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  popover: {
    position: "absolute",
    left: "50%",
    top: "calc(100% + 8px)",
    transform: "translateX(-50%)",
    zIndex: 40,
    width: 256,
    borderRadius: 16,
    border: "0.5px solid #242E42",
    background: "#0B0F18",
    padding: 14,
    boxShadow: "0 22px 55px rgba(0,0,0,.42)",
  },
  monthHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  monthButton: {
    width: 24,
    height: 24,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: 0,
    borderRadius: 7,
    background: "#111520",
    color: "#8EA2C0",
    cursor: "pointer",
    padding: 0,
  },
  monthTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#F0F4FF",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 4,
  },
  dow: {
    paddingBottom: 4,
    textAlign: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "#5C7090",
  },
  day: {
    aspectRatio: "1 / 1",
    borderRadius: 7,
    fontSize: 11,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    transition: "background .15s, color .15s, border-color .15s",
    padding: 0,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    borderTop: "0.5px solid #171D2E",
    marginTop: 10,
    paddingTop: 10,
  },
  footerButton: {
    border: 0,
    borderRadius: 7,
    background: "transparent",
    color: "#8EA2C0",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    padding: "5px 7px",
  },
};