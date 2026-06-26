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

function valueColor(col, val) {
  if (val === null || val === undefined || col.good === undefined) return 'var(--theme-text)';
  if (col.highIsGood) return val >= col.good ? '#10b981' : val >= col.warn ? '#f59e0b' : '#ef4444';
  return val <= col.good ? '#10b981' : val <= col.warn ? '#f59e0b' : '#ef4444';
}

export default function ReportsTable({ agents, slaTargetSeconds }) {
  const [hoveredRow, setHoveredRow] = useState(null);

  const COLS = [
    { key: 'chatsReceived',         label: 'Chats Recebidos',  sub: 'fluxo auto' },
    { key: 'messagesSent',          label: 'Msgs Enviadas' },
    { key: 'transfersOut',          label: 'Transferências' },
    { key: 'transferOutRate',       label: '% Transf.',        fmt: pct },
    { key: 'chatsPerHour',          label: 'Chats/hora' },
    { key: 'firstResponseTimeAvg',  label: '1ª Resposta',      fmt: fmtDuration },
    { key: 'avgResponseTime',       label: 'Resp. Geral',      fmt: fmtDuration },
    { key: 'resolutionTimeAvg',     label: 'Resolução',        fmt: fmtDuration },
    { key: 'fcrRate',               label: 'FCR',              fmt: pct, good: 80, warn: 60, highIsGood: true },
    { key: 'slaComplianceRate',     label: 'SLA', sub: `≤ ${Math.round((slaTargetSeconds || 300) / 60)}min`, fmt: pct, good: 90, warn: 70, highIsGood: true },
    { key: 'reopenRate',            label: 'Reabertura',       fmt: pct, good: 20, warn: 40, highIsGood: false },
    { key: 'onlineMinutes',         label: 'Online',           fmt: fmtMin },
  ];

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
                  const color = valueColor(col, val);
                  return (
                    <td key={col.key} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, color, borderBottom: '1px solid var(--theme-border)', borderRight: '1px solid var(--theme-border)', whiteSpace: 'nowrap' }}>
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
