import { useState, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

function toInputValue(date) {
  return date.toISOString().slice(0, 10);
}

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

const inputStyle = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--theme-border)', background: 'var(--theme-bg)', color: 'var(--theme-text)', fontSize: 13 };

export default function PeriodFilter({ periods, activeIdx, onSelectPreset, customRange, onApplyCustom }) {
  const [open, setOpen]     = useState(false);
  const [fromStr, setFromStr] = useState(customRange ? toInputValue(customRange.from) : '');
  const [toStr, setToStr]     = useState(customRange ? toInputValue(customRange.to) : '');
  const boxRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function apply() {
    if (!fromStr || !toStr) return;
    const from = new Date(`${fromStr}T00:00:00`);
    const to   = new Date(`${toStr}T23:59:59.999`);
    if (from > to) return;
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
        <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 20, background: 'var(--theme-bg-secondary)', border: '1px solid var(--theme-border-strong)', borderRadius: 10, padding: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 220 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>De</label>
            <input type="date" value={fromStr} max={toStr || toInputValue(new Date())} onChange={e => setFromStr(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, color: 'var(--theme-text-muted)' }}>Até</label>
            <input type="date" value={toStr} min={fromStr || undefined} max={toInputValue(new Date())} onChange={e => setToStr(e.target.value)} style={inputStyle} />
          </div>
          <button
            onClick={apply}
            disabled={!fromStr || !toStr}
            style={{ padding: '7px 0', borderRadius: 6, border: 'none', background: 'var(--theme-primary)', color: 'var(--theme-primary-text)', fontWeight: 700, fontSize: 13, cursor: (!fromStr || !toStr) ? 'default' : 'pointer', opacity: (!fromStr || !toStr) ? 0.5 : 1 }}
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
