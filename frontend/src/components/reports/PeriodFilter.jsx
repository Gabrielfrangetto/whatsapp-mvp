import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import DateRangeCalendar, { startOfDay } from './DateRangeCalendar';

function pillStyle(active) {
  return {
    padding: '5px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
    fontWeight: active ? 700 : 400,
    background: active ? 'var(--theme-primary)' : 'transparent',
    color: active ? 'var(--theme-primary-text)' : 'var(--theme-text-secondary)',
    border: active ? 'none' : '1px solid var(--theme-border)',
    display: 'flex', alignItems: 'center', gap: 6,
  };
}

export default function PeriodFilter({ periods, activeIdx, onSelectPreset, customRange, onApplyCustom }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState(() => customRange
    ? { from: startOfDay(customRange.from), to: startOfDay(customRange.to) }
    : { from: null, to: null });
  const boxRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function apply() {
    if (!range.from || !range.to) return;
    const from = new Date(range.from);
    from.setHours(0, 0, 0, 0);
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);
    onApplyCustom({ from, to });
    setOpen(false);
  }

  const isCustomActive = activeIdx === -1;
  const customLabel = isCustomActive && customRange
    ? `${customRange.from.toLocaleDateString('pt-BR')} – ${customRange.to.toLocaleDateString('pt-BR')}`
    : 'Personalizado';

  return (
    <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={boxRef}>
      {periods.map((p, i) => (
        <button key={i} onClick={() => onSelectPreset(i)} style={pillStyle(activeIdx === i)}>{p.label}</button>
      ))}

      <button onClick={() => setOpen(o => !o)} style={pillStyle(isCustomActive)}>
        <Calendar size={13} />{customLabel}
      </button>

      {open && (
        <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 20, background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-strong)', borderRadius: 10, padding: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 240 }}>
          <div style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>
            {range.from && !range.to && 'Selecione a data final'}
            {!range.from && 'Selecione a data inicial'}
            {range.from && range.to && `${range.from.toLocaleDateString('pt-BR')} – ${range.to.toLocaleDateString('pt-BR')}`}
          </div>
          <DateRangeCalendar from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
          <button
            onClick={apply}
            disabled={!range.from || !range.to}
            style={{ padding: '7px 0', borderRadius: 6, border: 'none', background: 'var(--theme-primary)', color: 'var(--theme-primary-text)', fontWeight: 700, fontSize: 13, cursor: (!range.from || !range.to) ? 'default' : 'pointer', opacity: (!range.from || !range.to) ? 0.5 : 1 }}
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
