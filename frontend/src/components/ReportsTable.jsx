import { useState } from 'react';
import { getInitials } from '../utils/format';

const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';

function fmtDuration(s) {
  if (s === null || s === undefined) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) { const m = Math.floor(s / 60), r = s % 60; return r ? `${m}m ${r}s` : `${m}m`; }
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

function fmtMin(min) {
  if (min === null || min === undefined) return '—';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function pct(v) { return v === null || v === undefined ? '—' : `${v}%`; }

function Avatar({ name, color, avatarUrl }) {
  const bg = color || '#25D366';
  if (avatarUrl) {
    const src = avatarUrl.startsWith('http') ? avatarUrl : `${API_URL}${avatarUrl}`;
    return <img src={src} alt={name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />;
  }
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>
      {getInitials(name || '?')}
    </div>
  );
}

export default function ReportsTable({ agents, slaTargetSeconds }) {
  const [hoveredRow, setHoveredRow] = useState(null);

  const COLS = [
    { key: 'chatsReceived',         label: 'Chats Recebidos',  sub: 'fluxo auto',                              highIsGood: true  },
    { key: 'messagesSent',          label: 'Msgs Enviadas',                                                     highIsGood: true  },
    { key: 'transfersOut',          label: 'Transferências',                                                    highIsGood: false },
    { key: 'transferOutRate',       label: '% Transf.',        fmt: pct,                                       highIsGood: false },
    { key: 'chatsPerHour',          label: 'Chats/hora',                                                       highIsGood: true  },
    { key: 'firstResponseTimeAvg',  label: '1ª Resposta',      fmt: fmtDuration,                               highIsGood: false },
    { key: 'avgResponseTime',       label: 'Resp. Geral',      fmt: fmtDuration,                               highIsGood: false },
    { key: 'resolutionTimeAvg',     label: 'Resolução',        fmt: fmtDuration,                               highIsGood: false },
    { key: 'fcrRate',               label: 'FCR',              fmt: pct,                                       highIsGood: true  },
    { key: 'slaComplianceRate',     label: 'SLA', sub: `≤ ${Math.round((slaTargetSeconds || 300) / 60)}min`, fmt: pct, highIsGood: true  },
    { key: 'reopenRate',            label: 'Reabertura',       fmt: pct,                                       highIsGood: false },
    { key: 'onlineMinutes',         label: 'Online',           fmt: fmtMin,                                    highIsGood: true  },
  ];

  const bests = {};
  for (const col of COLS) {
    const vals = agents.map(a => a[col.key]).filter(v => v !== null && v !== undefined);
    if (vals.length) bests[col.key] = col.highIsGood ? Math.max(...vals) : Math.min(...vals);
  }

  const TH = {
    padding: '10px 14px',
    textAlign: 'right',
    fontSize: 11, fontWeight: 700,
    color: 'var(--theme-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--theme-border)',
    borderRight: '1px solid var(--theme-border)',
    background: 'var(--theme-bg-tertiary)',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  };

  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--theme-border)' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1200 }}>
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: 'left', left: 0, zIndex: 4, minWidth: 180, borderRight: '2px solid var(--theme-border)', boxShadow: '2px 0 6px rgba(0,0,0,0.06)' }}>
              Agente
            </th>
            {COLS.map(col => (
              <th key={col.key} style={{ ...TH, minWidth: 108 }}>
                {col.label}
                {col.sub && <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.75, textTransform: 'none', letterSpacing: 0, marginTop: 1 }}>{col.sub}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {agents.map((row, i) => {
            const isHovered = hoveredRow === i;
            const rowBg = isHovered
              ? 'var(--theme-bg-tertiary)'
              : i % 2 === 0 ? 'var(--theme-bg-secondary)' : 'var(--theme-bg)';
            return (
              <tr
                key={row.agent.id}
                onMouseEnter={() => setHoveredRow(i)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{ background: rowBg }}
              >
                <td style={{ position: 'sticky', left: 0, zIndex: 1, background: rowBg, padding: '10px 14px', borderBottom: '1px solid var(--theme-border)', borderRight: '2px solid var(--theme-border)', whiteSpace: 'nowrap', boxShadow: '2px 0 6px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={row.agent.name} color={row.agent.avatarColor} avatarUrl={row.agent.avatarUrl} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--theme-text)' }}>{row.agent.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>{row.agent.role === 'ADMIN' ? 'Admin' : 'Agente'}</div>
                    </div>
                  </div>
                </td>
                {COLS.map(col => {
                  const val = row[col.key];
                  const displayed = col.fmt ? col.fmt(val) : (val !== null && val !== undefined ? String(val) : '—');
                  const isBestVal = bests[col.key] !== undefined && val !== null && val !== undefined && val === bests[col.key];
                  return (
                    <td key={col.key} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: isBestVal ? 800 : 600, color: isBestVal ? 'var(--theme-primary)' : 'var(--theme-text)', borderBottom: '1px solid var(--theme-border)', borderRight: '1px solid var(--theme-border)', whiteSpace: 'nowrap' }}>
                      {displayed}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
