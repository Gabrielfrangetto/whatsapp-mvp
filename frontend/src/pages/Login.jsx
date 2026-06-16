// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, MessageSquare, AlertTriangle } from 'lucide-react';

const COLORS = {
  green: '#25D366',
  darkGreen: '#075E54',
  midGreen: '#128C7E',
  bg: '#0a0f0d',
  surface: '#111a16',
  border: '#1e2d27',
  text: '#e8f5e9',
  muted: '#5a7a6a',
};

const styles = {
  root: {
    minHeight: '100vh',
    background: COLORS.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  glow1: {
    position: 'absolute', top: '-120px', left: '-120px',
    width: '400px', height: '400px', borderRadius: '50%',
    background: 'radial-gradient(circle, #25D36618 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  glow2: {
    position: 'absolute', bottom: '-80px', right: '-80px',
    width: '300px', height: '300px', borderRadius: '50%',
    background: 'radial-gradient(circle, #075E5412 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `linear-gradient(${COLORS.border}33 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}33 1px, transparent 1px)`,
    backgroundSize: '48px 48px',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '20px',
    padding: '40px 36px',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px #25D36610',
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  logoIcon: {
    width: '44px', height: '44px',
    background: 'linear-gradient(135deg, #25D366, #128C7E)',
    borderRadius: '12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '22px',
    boxShadow: '0 4px 16px #25D36640',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: '-0.3px',
  },
  logoSub: {
    fontSize: '12px',
    color: COLORS.muted,
    marginTop: '1px',
    fontWeight: '400',
  },
  heading: {
    fontSize: '26px',
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: '-0.5px',
    marginBottom: '6px',
  },
  subheading: {
    fontSize: '14px',
    color: COLORS.muted,
    marginBottom: '28px',
    lineHeight: '1.5',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '500',
    color: COLORS.muted,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  inputWrap: {
    position: 'relative',
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: '10px',
    fontSize: '14px',
    color: COLORS.text,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  inputFocus: {
    borderColor: COLORS.green,
    boxShadow: `0 0 0 3px ${COLORS.green}18`,
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #25D366, #128C7E)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'opacity 0.2s, transform 0.1s',
    letterSpacing: '-0.2px',
    fontFamily: 'inherit',
  },
  errorBox: {
    background: '#ff444420',
    border: '1px solid #ff444440',
    borderRadius: '10px',
    padding: '12px 14px',
    fontSize: '13px',
    color: '#ff8080',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  footer: {
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: `1px solid ${COLORS.border}`,
    textAlign: 'center',
    fontSize: '12px',
    color: COLORS.muted,
  },
};

function InputField({ label, type = 'text', value, onChange, placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label style={styles.label}>{label}</label>
      <div style={{ ...styles.inputWrap, position: 'relative' }}>
        <input
          type={isPassword && showPwd ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            ...styles.input,
            ...(focused ? styles.inputFocus : {}),
            paddingRight: isPassword ? '44px' : '16px',
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: COLORS.muted, fontSize: '16px', padding: '4px',
            }}
          >
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pressed, setPressed] = useState(false);

  // Animate in
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError('Preencha todos os campos'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.grid} />
      <div style={styles.glow1} />
      <div style={styles.glow2} />

      <div style={{
        ...styles.card,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}>
        {/* Logo */}
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}><MessageSquare size={22} color="#fff" /></div>
          <div>
            <div style={styles.logoText}>WhatsApp MVP</div>
            <div style={styles.logoSub}>Central de Atendimento</div>
          </div>
        </div>

        <h1 style={styles.heading}>Bem-vindo de volta</h1>
        <p style={styles.subheading}>Faça login para acessar o inbox</p>

        {error && (
          <div style={styles.errorBox}>
            <AlertTriangle size={15} style={{ flexShrink:0 }} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <InputField
            label="E-mail"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoFocus
          />
          <InputField
            label="Senha"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <button
            type="submit"
            disabled={loading}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            onMouseLeave={() => setPressed(false)}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              transform: pressed ? 'scale(0.98)' : 'scale(1)',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>

        <div style={styles.footer}>
          Esqueceu sua senha? Contate o administrador do sistema.
        </div>
      </div>
    </div>
  );
}
