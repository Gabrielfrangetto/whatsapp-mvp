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

function ThemeSection({ draft, onDraft }) {
  const { previewOnly } = useTheme();
  const { color: draftColor, mode: draftMode } = draft;
  const [hexInput, setHexInput] = useState(draftColor);
  const [hexError, setHexError] = useState('');

  useEffect(() => { setHexInput(draftColor); }, [draftColor]);

  const activeHex = isValidHex(hexInput) ? hexInput : draftColor;
  const contrastWarn = isValidHex(activeHex) && contrastRatio(activeHex, MODE_BG[draftMode]) < 1.8;

  function handleHexChange(val) {
    setHexInput(val);
    if (val.length > 0 && !val.startsWith('#')) { setHexInput('#' + val); return; }
    if (isValidHex(val)) { setHexError(''); previewOnly(val, draftMode); onDraft({ color: val, mode: draftMode }); }
    else if (val.length === 7) { setHexError('Hex inválido'); }
    else { setHexError(''); }
  }

  function handleMode(m) { previewOnly(draftColor, m); onDraft({ color: draftColor, mode: m }); }

  function handlePreset(preset) {
    setHexInput(preset.color); setHexError('');
    previewOnly(preset.color, preset.mode);
    onDraft({ color: preset.color, mode: preset.mode });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text)', margin: '0 0 12px' }}>Modo</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {[{ value: 'light', label: 'Claro', icon: <Sun size={14} />, desc: 'Fundo branco' }, { value: 'dark', label: 'Escuro', icon: <Moon size={14} />, desc: 'Cinza suave' }].map(m => (
            <div key={m.value} onClick={() => handleMode(m.value)} style={{ flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer', border: draftMode === m.value ? `2px solid var(--theme-primary)` : '1.5px solid var(--theme-border)', background: draftMode === m.value ? 'var(--theme-primary-subtle)' : 'var(--theme-bg)', transition: 'all 0.15s' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 6 }}>{m.icon}{m.label}</div>
              <div style={{ fontSize: 12, color: 'var(--theme-text-secondary)', marginTop: 3 }}>{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text)', margin: '0 0 12px' }}>Cor principal</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: isValidHex(hexInput) ? hexInput : draftColor, flexShrink: 0, border: '0.5px solid var(--theme-border)' }} />
          <div style={{ flex: 1 }}>
            <input value={hexInput} onChange={e => handleHexChange(e.target.value)} placeholder="#075E54" maxLength={7}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontFamily: 'var(--font-mono, monospace)', border: hexError ? '1.5px solid #ef4444' : '1.5px solid var(--theme-border)', background: 'var(--theme-bg)', color: 'var(--theme-text)', fontSize: 14, outline: 'none', boxSizing: 'border-box', letterSpacing: 1 }} />
            {hexError && <p style={{ fontSize: 11, color: '#ef4444', margin: '4px 0 0' }}>{hexError}</p>}
            {!hexError && contrastWarn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '8px 10px', borderRadius: 8, background: draftMode === 'dark' ? 'rgba(234,179,8,0.1)' : '#fefce8', border: `1px solid ${draftMode === 'dark' ? 'rgba(234,179,8,0.25)' : '#fde68a'}` }}>
                <AlertTriangle size={13} strokeWidth={2.5} style={{ color: draftMode === 'dark' ? '#fbbf24' : '#d97706', flexShrink: 0 }} />
                <p style={{ fontSize: 11, color: draftMode === 'dark' ? '#fde68a' : '#92400e', margin: 0 }}>
                  Baixo contraste no modo {draftMode === 'dark' ? 'escuro' : 'claro'} — botões e bordas podem ficar pouco visíveis
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text)', margin: '0 0 12px' }}>Combinações prontas</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {PRESETS.map(preset => {
            const active = draftColor === preset.color && draftMode === preset.mode;
            return (
              <div key={preset.name} onClick={() => handlePreset(preset)} style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', border: active ? `2px solid ${preset.color}` : '1.5px solid var(--theme-border)', background: active ? `${preset.color}15` : 'var(--theme-bg)', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: preset.color, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--theme-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {preset.name}
                    {preset.mode === 'dark' ? <Moon size={10} style={{ opacity: .6 }} /> : <Sun size={10} style={{ opacity: .6 }} />}
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
    </div>
  );
}

function AutomationsSection({ enabled, onToggle }) {
  return (
    <div style={{ background: 'var(--theme-bg)', borderRadius: 12, border: '1px solid var(--theme-border)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text)' }}>Fechar chats por inatividade</div>
          <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', marginTop: 3, lineHeight: 1.5 }}>
            Chats abertos ou pendentes são finalizados automaticamente após 24h sem mensagens. A IA seleciona o motivo de encerramento.
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <div onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', background: enabled ? 'var(--theme-primary)' : 'var(--theme-border)', position: 'relative', transition: 'background 0.2s', userSelect: 'none' }}>
            <span style={{ position: 'absolute', top: 3, left: enabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', pointerEvents: 'none' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: enabled ? 'var(--theme-primary)' : 'var(--theme-text-muted)' }}>{enabled ? 'Ativo' : 'Inativo'}</span>
        </div>
      </div>
    </div>
  );
}

function AdvancedSection({ draftAutoclose, onToggle }) {
  const [sub, setSub] = useState('automations');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--theme-border)', paddingBottom: 12 }}>
        {[{ key: 'automations', label: 'Automações', icon: <Zap size={14} /> }].map(s => (
          <button key={s.key} onClick={() => setSub(s.key)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: sub === s.key ? '1px solid var(--theme-primary)' : '1px solid var(--theme-border)', background: sub === s.key ? 'var(--theme-primary-subtle)' : 'none', color: sub === s.key ? 'var(--theme-primary)' : 'var(--theme-text-secondary)', fontWeight: sub === s.key ? 600 : 400, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.12s' }}>
            {s.icon}{s.label}
          </button>
        ))}
      </div>
      {sub === 'automations' && <AutomationsSection enabled={draftAutoclose ?? false} onToggle={onToggle} />}
    </div>
  );
}

const SECTIONS_ALL = [
  { key: 'theme',    label: 'Tema',     icon: <Palette size={16} /> },
  { key: 'advanced', label: 'Avançado', icon: <Zap size={16} />, adminOnly: true },
];

const navBtn = (active) => ({
  display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', borderRadius: 8,
  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit',
  fontSize: 13, transition: 'all 0.12s',
  background: active ? 'var(--theme-primary-subtle)' : 'none',
  color: active ? 'var(--theme-primary)' : 'var(--theme-text-secondary)',
  fontWeight: active ? 600 : 400,
});

export default function Settings({ onClose }) {
  const { agent } = useAuth();
  const isAdmin = agent?.role === 'ADMIN';
  const { color, mode, previewOnly, savePreferences } = useTheme();

  const sections = SECTIONS_ALL.filter(s => !s.adminOnly || isAdmin);
  const [active, setActive] = useState(sections[0]?.key);

  const [originalTheme] = useState({ color, mode });
  const [draftTheme, setDraftTheme] = useState({ color, mode });

  const [originalAutoclose, setOriginalAutoclose] = useState(null);
  const [draftAutoclose, setDraftAutoclose] = useState(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [persisting, setPersisting] = useState(false);

  const isDirty = draftTheme.color !== originalTheme.color
    || draftTheme.mode !== originalTheme.mode
    || (originalAutoclose !== null && draftAutoclose !== originalAutoclose);

  useEffect(() => {
    if (!isAdmin) return;
    api.get('/settings').then(({ data }) => {
      const v = data.autoclose_enabled === 'true';
      setOriginalAutoclose(v);
      setDraftAutoclose(v);
    }).catch(() => {});
  }, [isAdmin]);

  const handleCancel = () => {
    setDraftTheme(originalTheme);
    previewOnly(originalTheme.color, originalTheme.mode);
    setDraftAutoclose(originalAutoclose);
  };

  const handleClose = () => {
    if (isDirty) previewOnly(originalTheme.color, originalTheme.mode);
    onClose();
  };

  const handleConfirmSave = async () => {
    setPersisting(true);
    try {
      await savePreferences(draftTheme.color, draftTheme.mode);
      if (isAdmin && draftAutoclose !== originalAutoclose) {
        await api.patch('/settings', { autoclose_enabled: String(draftAutoclose) });
      }
      setShowConfirm(false);
      onClose();
    } catch {}
    finally { setPersisting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }} onClick={e => e.target === e.currentTarget && handleClose()}>
      <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 8, width: '100%', maxWidth: 682, display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '0.5px solid var(--theme-border)', fontFamily: "'Inter', 'Segoe UI', sans-serif", overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '0.5px solid var(--theme-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--theme-text)', margin: 0 }}>Configurações</h2>
            <p style={{ fontSize: 12, color: 'var(--theme-text-secondary)', margin: '2px 0 0' }}>Personalize e gerencie o sistema</p>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--theme-text-muted)', fontSize: 20, padding: 4, borderRadius: 6, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', height: 540, overflow: 'hidden' }}>
          <div style={{ width: 148, borderRight: '0.5px solid var(--theme-border)', padding: '12px 8px', display: 'flex', flexDirection: 'column', flexShrink: 0, background: 'var(--theme-bg)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              {sections.filter(s => !s.adminOnly).map(s => (
                <button key={s.key} onClick={() => setActive(s.key)} style={navBtn(active === s.key)}>{s.icon}{s.label}</button>
              ))}
            </div>
            {isAdmin && (
              <div style={{ borderTop: '0.5px solid var(--theme-border)', paddingTop: 8, marginTop: 8 }}>
                {sections.filter(s => s.adminOnly).map(s => (
                  <button key={s.key} onClick={() => setActive(s.key)} style={{ ...navBtn(active === s.key), color: active === s.key ? 'var(--theme-primary)' : 'var(--theme-text-muted)' }}>{s.icon}{s.label}</button>
                ))}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, padding: '20px 24px', overflowY: 'auto', overflowX: 'hidden' }}>
            {active === 'theme'    && <ThemeSection draft={draftTheme} onDraft={setDraftTheme} />}
            {active === 'advanced' && <AdvancedSection draftAutoclose={draftAutoclose} onToggle={() => setDraftAutoclose(v => !v)} />}
          </div>
        </div>

        {/* Save/Cancel bar */}
        {isDirty && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid var(--theme-border)', background: 'var(--theme-bg)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--theme-text-muted)' }}>Você tem alterações não salvas</span>
            <button onClick={handleCancel} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid var(--theme-border)', background: 'none', color: 'var(--theme-text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button onClick={() => setShowConfirm(true)} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: 'var(--theme-primary)', color: 'var(--theme-primary-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Salvar</button>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }} onClick={e => e.target === e.currentTarget && !persisting && setShowConfirm(false)}>
          <div style={{ background: 'var(--theme-bg-secondary)', borderRadius: 12, padding: '28px 28px 24px', maxWidth: 400, width: '90%', boxShadow: '0 16px 48px rgba(0,0,0,0.3)', border: '0.5px solid var(--theme-border)', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--theme-text)', margin: '0 0 8px' }}>Salvar configurações?</h3>
            <p style={{ fontSize: 13, color: 'var(--theme-text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
              As configurações anteriores serão substituídas pelas novas alterações. Essa ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => !persisting && setShowConfirm(false)} disabled={persisting} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--theme-border)', background: 'none', color: 'var(--theme-text-secondary)', fontSize: 13, fontWeight: 500, cursor: persisting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: persisting ? 0.5 : 1 }}>
                Cancelar
              </button>
              <button onClick={handleConfirmSave} disabled={persisting} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: 'var(--theme-primary)', color: 'var(--theme-primary-text)', fontSize: 13, fontWeight: 600, cursor: persisting ? 'default' : 'pointer', fontFamily: 'inherit', opacity: persisting ? 0.7 : 1 }}>
                {persisting ? 'Salvando...' : 'Sim, salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
