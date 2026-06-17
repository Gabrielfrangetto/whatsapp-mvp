import { MessageSquare } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Inbox from './pages/Inbox';
import Login from './pages/Login';

function AuthGuard() {
  const { agent, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--theme-bg, #0a0f0d)', flexDirection: 'column', gap: 16 }}>
      <MessageSquare size={40} style={{ color: 'var(--theme-primary)' }} />
      <div style={{ color: 'var(--theme-primary, #25D366)', fontSize: 14, fontWeight: 500 }}>Carregando...</div>
    </div>
  );
  return agent ? <Inbox /> : <Login />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </ThemeProvider>
  );
}
