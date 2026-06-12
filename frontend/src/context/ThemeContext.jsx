// src/context/ThemeContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './AuthContext';

const ThemeContext = createContext(null);

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

function buildThemeVars(color, mode) {
  const isDark = mode === 'dark';
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const lighten = (amt) => `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`;
  const darken  = (amt) => `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`;
  const alpha   = (a)   => `rgba(${r},${g},${b},${a})`;

  if (isDark) {
    return {
      '--theme-primary':        color,
      '--theme-primary-light':  lighten(40),
      '--theme-primary-dark':   darken(20),
      '--theme-primary-subtle': alpha(0.15),
      '--theme-primary-text':   '#ffffff',
      '--theme-bg':             '#1e2227',
      '--theme-bg-secondary':   '#252b33',
      '--theme-bg-tertiary':    '#2d3440',
      '--theme-bg-sidebar':     '#1a1f26',
      '--theme-bg-chat':        '#1c2128',
      '--theme-bg-input':       '#2d3440',
      '--theme-bg-bubble-out':  darken(20),
      '--theme-bg-bubble-in':   '#2d3440',
      '--theme-bg-hover':       'rgba(255,255,255,0.05)',
      '--theme-text':           '#e8edf3',
      '--theme-text-secondary': '#8b95a3',
      '--theme-text-muted':     '#596474',
      '--theme-border':         'rgba(255,255,255,0.08)',
      '--theme-border-strong':  'rgba(255,255,255,0.15)',
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
  // Carrega do localStorage imediatamente — evita flash antes da sessão restaurar
  const [color, setColor] = useState(() => localStorage.getItem('themeColor') || '#075E54');
  const [mode, setMode]   = useState(() => localStorage.getItem('themeMode')  || 'light');
  const [saving, setSaving] = useState(false);

  // Aplica tema sempre que mudar
  useEffect(() => {
    applyTheme(color, mode);
  }, [color, mode]);

  // Aplica imediatamente na montagem (evita flash)
  useEffect(() => {
    applyTheme(color, mode);
  }, []);

  const loadPreferences = useCallback((agent) => {
    if (!agent) return;
    const c = agent.themeColor || localStorage.getItem('themeColor') || '#075E54';
    const m = agent.themeMode  || localStorage.getItem('themeMode')  || 'light';
    setColor(c);
    setMode(m);
    localStorage.setItem('themeColor', c);
    localStorage.setItem('themeMode', m);
    applyTheme(c, m);
  }, []);

  const savePreferences = useCallback(async (newColor, newMode) => {
    // Salva localmente de imediato
    localStorage.setItem('themeColor', newColor);
    localStorage.setItem('themeMode', newMode);
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
