import { useState } from 'react';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function sameDay(a, b) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isBetween(d, a, b) {
  return !!a && !!b && d > a && d < b;
}

const navBtnStyle = { background: 'transparent', border: 'none', color: 'var(--theme-text-secondary)', fontSize: 16, cursor: 'pointer', padding: '2px 8px', borderRadius: 6, lineHeight: 1 };

export default function DateRangeCalendar({ from, to, onChange }) {
  const today = startOfDay(new Date());
  const [viewDate, setViewDate] = useState(() => startOfDay(from || to || new Date()));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(new Date(year, month, d));

  const isNextDisabled = year === today.getFullYear() && month === today.getMonth();

  function changeMonth(delta) {
    setViewDate(new Date(year, month + delta, 1));
  }

  function handleClick(day) {
    if (day > today) return;
    if (!from || (from && to)) {
      onChange(day, null);
    } else if (day < from) {
      onChange(day, from);
    } else {
      onChange(from, day);
    }
  }

  const hasRange = !!from && !!to && !sameDay(from, to);

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button type="button" onClick={() => changeMonth(-1)} style={navBtnStyle}>‹</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--theme-text)' }}>{MONTHS[month]} {year}</span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={isNextDisabled}
          style={{ ...navBtnStyle, opacity: isNextDisabled ? 0.3 : 1, cursor: isNextDisabled ? 'default' : 'pointer' }}
        >
          ›
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ fontSize: 10, color: 'var(--theme-text-muted)', textAlign: 'center', padding: '2px 0' }}>{w}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} style={{ width: 30, height: 30 }} />;

          const disabled = day > today;
          const isStart = sameDay(day, from);
          const isEnd = sameDay(day, to);
          const inRange = isBetween(day, from, to);
          const isToday = sameDay(day, today);

          return (
            <div
              key={i}
              style={{
                width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: hasRange && (inRange || isStart || isEnd) ? 'var(--theme-primary-subtle)' : 'transparent',
                borderRadius: hasRange ? (isStart ? '50% 0 0 50%' : isEnd ? '0 50% 50% 0' : 0) : 0,
              }}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleClick(day)}
                style={{
                  width: 26, height: 26, borderRadius: '50%',
                  border: isToday && !isStart && !isEnd ? '1px solid var(--theme-primary)' : 'none',
                  background: (isStart || isEnd) ? 'var(--theme-primary)' : 'transparent',
                  color: (isStart || isEnd) ? 'var(--theme-primary-text)' : disabled ? 'var(--theme-text-muted)' : 'var(--theme-text)',
                  fontSize: 12, fontWeight: (isStart || isEnd) ? 700 : 400,
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled ? 0.4 : 1,
                }}
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
