// src/pages/Settings.jsx
import { useState, useEffect } from 'react';
import { Sun, Moon, Check, AlertTriangle, Palette, Zap } from 'lucide-react';
import { useTheme, PRESETS, getContrastText } from '../context/ThemeContext';
import { useAuth, api } from '../context/AuthContext';

function isValidHex(hex) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

const MODE_BG = { light: '#f5f6f7', dark: '#1e2227' };

function contrastRatio(hex, bgHex) {
  const toLinear = c => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  const lum = (r, g, b) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  const parse = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const L1 = lum(...parse(hex)), L2 = lum(...parse(bgHex));
  return (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
}

// ─── Seção: Tema ──────────────────────────────────────────────────────────────

function ThemeSection() {
  const { color, mode, saving, updateColor, updateMode, applyPreset } = useTheme();
  const [hexInput, setHexInput] = useState(color);
  const [hexError, setHexError] = useState('');

  useEffect(() => { setHexInput(color); }, [color]);

  const activeHex = isValidHex(hexInput) ? hexInput : color;
  const contrastWarn = isValidHex(activeHex) && contrastRatio(activeHex, MODE_BG[mode]) < 1.8;

  function handleHexChange(val) {
    setHexInput(val);
    if (val.length > 0 && !val.startsWith('#')) { setHexInput('#' + val); return; }
    if (isValidHex(val)) { setHexError(''); updateColor(val); }
    else if (val.length === 7) { setHexError('Hex inválido'); }
    else { setHexError(''); }
  }

  function handlePreset(preset) {
    setHexInput(preset.color);
    setHexError('');
    applyPreset(preset);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Modo */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text)', margin: '0 0 12px' }}>Modo</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { value: 'light', label: 'Claro', icon: <Sun size={14} />, desc: 'Fundo branco' },
            { value: 'dark',  label: 'Escuro', icon: <Moon size={14} />, desc: 'Cinza suave' },
          ].map(m => (
            <div
              key={m.value}
              onClick={() => updateMode(m.value)}
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                border: mode === m.value ? `2px solid var(--theme-primary)` : '1.5px solid var(--theme-border)',
                background: mode === m.value ? 'var(--theme-primary-subtle)' : 'var(--theme-bg)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text)', display:'flex', alignItems:'center', gap: 6 }}>{m.icon}{m.label}</div>
              <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginTop: 3 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cor principal */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text)', margin: '0 0 12px' }}>Cor principal</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: isValidHex(hexInput) ? hexInput : color, flexShrink: 0, border: '0.5px solid var(--theme-border)' }} />
          <div style={{ flex: 1 }}>
            <input
              value={hexInput}
              onChange={e => handleHexChange(e.target.value)}
              placeholder="#075E54"
              maxLength={7}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8, fontFamily: 'var(--font-mono, monospace)',
                border: hexError ? '1.5px solid #ef4444' : '1.5px solid var(--theme-border)',
                background: 'var(--theme-bg)', color: 'var(--theme-text)', fontSize: 14,
                outline: 'none', boxSizing: 'border-box', letterSpacing: 1,
              }}
            />
            {hexError && <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>{hexError}</p>}
            {!hexError && contrastWarn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 10px', borderRadius: 8, background: mode === 'dark' ? 'rgba(234,179,8,0.1)' : '#fefce8', border: `1px solid ${mode === 'dark' ? 'rgba(234,179,8,0.25)' : '#fde68a'}` }}>
                <AlertTriangle size={13} strokeWidth={2.5} style={{ color: mode === 'dark' ? '#fbbf24' : '#d97706', flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: mode === 'dark' ? '#fde68a' : '#92400e', margin: 0 }}>
                  Baixo contraste no modo {mode === 'dark' ? 'escuro' : 'claro'} — botões e bordas podem ficar pouco visíveis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Presets */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text)', margin: '0 0 12px' }}>Combinações prontas</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {PRESETS.map(preset => {
            const active = color === preset.color && mode === preset.mode;
            return (
              <div
                key={preset.name}
                onClick={() => handlePreset(preset)}
                style={{
                  padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: active ? `2px solid ${preset.color}` : '1.5px solid var(--theme-border)',
                  background: active ? `${preset.color}15` : 'var(--theme-bg)',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: preset.color, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {preset.name}
                    {preset.mode === 'dark' ? <Moon size={10} style={{ opacity:.6 }} /> : <Sun size={10} style={{ opacity:.6 }} />}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--theme-text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.desc}</div>
                </div>
                {active && (
                  <div style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: preset.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: getContrastText(parseInt(preset.color.slice(1,3),16), parseInt(preset.color.slice(3,5),16), parseInt(preset.color.slice(5,7),16)), flexShrink: 0 }}>
                    <Check size={11} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {saving && <p style={{ fontSize: 12, color: 'var(--theme-text-muted)', textAlign: 'center' }}>Salvando preferências...</p>}
    </div>
  );
}

// ─── Seção: Automações ────────────────────────────────────────────────────────

function AutomationsSection() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/settings')
      .then(({ data }) => setSettings(data))
      .catch(e => setError(e.response?.data?.error || 'Erro ao carregar configurações'));
  }, []);

  async function toggleAutoclose() {
    if (!settings || saving) return;
    const next = settings.autoclose_enabled !== 'true';
    setError('');
    setSettings(prev => ({ ...prev, autoclose_enabled: String(next) }));
    setSaving(true);
    try {
      const { data } = await api.patch('/settings', { autoclose_enabled: String(next) });
      setSettings(data);
    } catch (e) {
      setSettings(prev => ({ ...prev, autoclose_enabled: String(!next) }));
      setError(e.response?.data?.error || 'Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const enabled = settings?.autoclose_enabled === 'true';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626' }}>
          {error}
        </div>
      )}

      <div style={{ background: 'var(--theme-bg)', borderRadius: 12, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text)' }}>Fechar chats por inatividade</div>
            <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 3, lineHeight: 1.5 }}>
              Chats abertos ou pendentes são finalizados automaticamente após 24h sem mensagens. A IA seleciona o motivo de encerramento.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div
              onClick={settings !== null ? toggleAutoclose : undefined}
              style={{
                width: 44, height: 24, borderRadius: 12,
                cursor: settings === null ? 'default' : 'pointer',
                background: enabled ? 'var(--theme-primary)' : 'var(--theme-border)',
                position: 'relative',
                transition: 'background 0.2s',
                opacity: saving ? 0.7 : 1,
                userSelect: 'none',
              }}
            >
              <span style={{
                position: 'absolute', top: 3,
                left: enabled ? 23 : 3,
                width: 18, height: 18, borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                pointerEvents: 'none',
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: enabled ? 'var(--theme-primary)' : 'var(--theme-text-muted)' }}>
              {settings === null ? '...' : enabled ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

const SECTIONS_ALL = [
  { key: 'theme',       label: 'Tema',       icon: <Palette size={16} /> },
  { key: 'automations', label: 'Automações', icon: <Zap size={16} />, adminOnly: true },
];

export default function Settings({ onClose }) {
  const { agent } = useAuth();
  const isAdmin = agent?.role === 'ADMIN';

  const sections = SECTIONS_ALL.filter(s => !s.adminOnly || isAdmin);
  const [active, setActive] = useState(sections[0]?.key);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--theme-bg-secondary)',
        borderRadius: 8,
        width: '100%', maxWidth: 620,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        border: '0.5px solid var(--theme-border)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '0.5px solid var(--theme-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--theme-text)', margin: 0 }}>Configurações</h2>
            <p style={{ fontSize: 12, color: 'var(--theme-text-secondary)', margin: '2px 0 0' }}>Personalize e gerencie o sistema</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)', fontSize: 20, padding: 4, borderRadius: 6, lineHeight: 1 }}>×</button>
        </div>

        {/* Body: sidebar + content — altura fixa para não mudar ao trocar de seção */}
        <div style={{ display: 'flex', height: 540, overflow: 'hidden' }}>

          {/* Sidebar */}
          <div style={{ width: 148, borderRight: '0.5px solid var(--theme-border)', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, background: 'var(--theme-bg)' }}>
            {sections.map(s => (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 12px', borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  background: active === s.key ? 'var(--theme-primary-subtle)' : 'none',
                  color: active === s.key ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
                  fontWeight: active === s.key ? 600 : 400,
                  fontSize: 13, fontFamily: 'inherit',
                  textAlign: 'left', width: '100%',
                  transition: 'all 0.12s',
                }}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0, padding: '20px 24px', overflowY: 'auto', overflowX: 'hidden' }}>
            {active === 'theme'       && <ThemeSection />}
            {active === 'automations' && <AutomationsSection />}
          </div>
        </div>
      </div>
    </div>
  );
}
