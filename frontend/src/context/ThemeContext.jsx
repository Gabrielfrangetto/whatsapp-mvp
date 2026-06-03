// src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './AuthContext';

const ThemeContext = createContext(null);

// Presets de combinações
export const PRESETS = [
  { name: 'Padrão',    color: '#075E54', mode: 'light', desc: 'Verde WhatsApp clássico' },
  { name: 'Oceano',    color: '#0F4C75', mode: 'dark',  desc: 'Azul profundo escuro' },
  { name: 'Lavanda',   color: '#6C63FF', mode: 'light', desc: 'Roxo suave claro' },
  { name: 'Grafite',   color: '#3D4A5C', mode: 'dark',  desc: 'Cinza azulado escuro' },
  { name: 'Coral',     color: '#E84393', mode: 'light', desc: 'Rosa vibrante claro' },
  { name: 'Floresta',  color: '#2D6A4F', mode: 'dark',  desc: 'Verde floresta escuro' },
  { name: 'Âmbar',     color: '#D97706', mode: 'light', desc: 'Laranja quente claro' },
  { name: 'Ardósia',   color: '#475569', mode: 'dark',  desc: 'Azul ardósia escuro' },
];

// Gera variáveis CSS a partir da cor principal e modo
function buildThemeVars(color, mode) {
  const isDark = mode === 'dark';

  // Converte hex para RGB
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Gera variações da cor principal
  const lighten = (amt) => {
    const nr = Math.min(255, r + amt);
    const ng = Math.min(255, g + amt);
    const nb = Math.min(255, b + amt);
    return `rgb(${nr},${ng},${nb})`;
  };
  const darken = (amt) => {
    const nr = Math.max(0, r - amt);
    const ng = Math.max(0, g - amt);
    const nb = Math.max(0, b - amt);
    return `rgb(${nr},${ng},${nb})`;
  };
  const alpha = (a) => `rgba(${r},${g},${b},${a})`;

  if (isDark) {
    return {
      '--theme-primary':        color,
      '--theme-primary-light':  lighten(40),
      '--theme-primary-dark':   darken(20),
      '--theme-primary-subtle': alpha(0.15),
      '--theme-primary-text':   '#ffffff',

      // Backgrounds — cinza médio puxado para tom da cor
      '--theme-bg':             '#1e2227',
      '--theme-bg-secondary':   '#252b33',
      '--theme-bg-tertiary':    '#2d3440',
      '--theme-bg-sidebar':     '#1a1f26',
      '--theme-bg-chat':        '#1c2128',
      '--theme-bg-input':       '#2d3440',
      '--theme-bg-bubble-out':  darken(20),
      '--theme-bg-bubble-in':   '#2d3440',
      '--theme-bg-hover':       'rgba(255,255,255,0.05)',

      // Texto
      '--theme-text':           '#e8edf3',
      '--theme-text-secondary': '#8b95a3',
      '--theme-text-muted':     '#596474',

      // Bordas
      '--theme-border':         'rgba(255,255,255,0.08)',
      '--theme-border-strong':  'rgba(255,255,255,0.15)',

      // Chat
      '--theme-msg-text-out':   '#e8edf3',
      '--theme-msg-text-in':    '#e8edf3',
      '--theme-header-text':    '#ffffff',
      '--theme-header-sub':     alpha(0.6),
    };
  } else {
    return {
      '--theme-primary':        color,
      '--theme-primary-light':  lighten(40),
      '--theme-primary-dark':   darken(20),
      '--theme-primary-subtle': alpha(0.1),
      '--theme-primary-text':   '#ffffff',

      '--theme-bg':             '#f5f6f7',
      '--theme-bg-secondary':   '#ffffff',
      '--theme-bg-tertiary':    '#eef0f2',
      '--theme-bg-sidebar':     '#ffffff',
      '--theme-bg-chat':        '#f0f2f5',
      '--theme-bg-input':       '#ffffff',
      '--theme-bg-bubble-out':  lighten(170),
      '--theme-bg-bubble-in':   '#ffffff',
      '--theme-bg-hover':       'rgba(0,0,0,0.04)',

      '--theme-text':           '#1a1d21',
      '--theme-text-secondary': '#5c6470',
      '--theme-text-muted':     '#9ca3af',

      '--theme-border':         'rgba(0,0,0,0.08)',
      '--theme-border-strong':  'rgba(0,0,0,0.15)',

      '--theme-msg-text-out':   '#1a1d21',
      '--theme-msg-text-in':    '#1a1d21',
      '--theme-header-text':    '#ffffff',
      '--theme-header-sub':     alpha(0.75),
    };
  }
}

function applyTheme(color, mode) {
  const vars = buildThemeVars(color, mode);
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val));
  root.setAttribute('data-theme', mode);
}

export function ThemeProvider({ children }) {
  const [color, setColor] = useState('#075E54');
  const [mode, setMode]   = useState('light');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    applyTheme(color, mode);
  }, [color, mode]);

  const loadPreferences = useCallback((agent) => {
    if (!agent) return;
    const c = agent.themeColor || '#075E54';
    const m = agent.themeMode  || 'light';
    setColor(c);
    setMode(m);
    applyTheme(c, m);
  }, []);

  const savePreferences = useCallback(async (newColor, newMode) => {
    setSaving(true);
    try {
      await api.patch('/auth/me/preferences', { themeColor: newColor, themeMode: newMode });
    } catch (e) {
      console.error('Erro ao salvar tema:', e.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const updateColor = useCallback((newColor) => {
    setColor(newColor);
    savePreferences(newColor, mode);
  }, [mode, savePreferences]);

  const updateMode = useCallback((newMode) => {
    setMode(newMode);
    savePreferences(color, newMode);
  }, [color, savePreferences]);

  const applyPreset = useCallback((preset) => {
    setColor(preset.color);
    setMode(preset.mode);
    savePreferences(preset.color, preset.mode);
  }, [savePreferences]);

  return (
    <ThemeContext.Provider value={{ color, mode, saving, loadPreferences, updateColor, updateMode, applyPreset }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
