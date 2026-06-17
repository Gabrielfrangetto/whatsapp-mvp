// src/pages/Settings.jsx
import { useState } from 'react';
import { useTheme, PRESETS, getContrastText } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Check, AlertTriangle } from 'lucide-react';

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

function ColorSwatch({ color, active, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: '50%', background: color,
        cursor: 'pointer', flexShrink: 0,
        border: active ? `3px solid var(--theme-text)` : '3px solid transparent',
        outline: active ? `2px solid ${color}` : 'none',
        outlineOffset: 2,
        transition: 'all 0.15s',
        boxShadow: active ? `0 0 0 2px var(--theme-bg)` : 'none',
      }}
    />
  );
}

export default function Settings({ onClose }) {
  const { color, mode, saving, updateColor, updateMode, applyPreset } = useTheme();
  const { agent } = useAuth();

  const [hexInput, setHexInput] = useState(color);
  const [hexError, setHexError] = useState('');

  const activeHex = isValidHex(hexInput) ? hexInput : color;
  const contrastWarn = isValidHex(activeHex) && contrastRatio(activeHex, MODE_BG[mode]) < 3;

  function handleHexChange(val) {
    setHexInput(val);
    if (val.length > 0 && !val.startsWith('#')) {
      setHexInput('#' + val);
      return;
    }
    if (isValidHex(val)) {
      setHexError('');
      updateColor(val);
    } else if (val.length === 7) {
      setHexError('Hex inválido');
    } else {
      setHexError('');
    }
  }

  function handlePreset(preset) {
    setHexInput(preset.color);
    setHexError('');
    applyPreset(preset);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--theme-bg-secondary)', borderRadius: 16,
        width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        border: '0.5px solid var(--theme-border)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '0.5px solid var(--theme-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--theme-text)', margin: 0 }}>Aparência</h2>
            <p style={{ fontSize: 12, color: 'var(--theme-text-secondary)', margin: '3px 0 0' }}>Personalize o visual do sistema</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)', fontSize: 20, padding: 4, borderRadius: 6, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Modo claro/escuro */}
          <div style={{ marginBottom: 28 }}>
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
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text)', display:'flex', alignItems:'center', gap:6 }}>{m.icon}{m.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginTop: 3 }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cor principal */}
          <div style={{ marginBottom: 28 }}>
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
                  <p style={{ fontSize: 11, color: '#f59e0b', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={11} strokeWidth={2.5} />
                    Baixo contraste no modo {mode === 'dark' ? 'escuro' : 'claro'} — botões e bordas podem ficar pouco visíveis
                  </p>
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
                    {active && <div style={{ marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%', background: preset.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: getContrastText(parseInt(preset.color.slice(1,3),16), parseInt(preset.color.slice(3,5),16), parseInt(preset.color.slice(5,7),16)), flexShrink: 0 }}><Check size={11} strokeWidth={3} /></div>}
                  </div>
                );
              })}
            </div>
          </div>

          {saving && (
            <p style={{ fontSize: 12, color: 'var(--theme-text-muted)', textAlign: 'center', marginTop: 16 }}>Salvando preferências...</p>
          )}
        </div>
      </div>
    </div>
  );
}
