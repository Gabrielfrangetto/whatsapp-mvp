// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';

const AuthContext = createContext(null);

const api = axios.create({ baseURL: `${BACKEND_URL}/api`, withCredentials: true });

export function AuthProvider({ children }) {
  const [agent, setAgent] = useState(null);
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('accessToken'));
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

  // Mantém o token também em sessionStorage: sobrevive a um reload de página
  // dentro da mesma aba mesmo quando o cookie de refresh (cross-site) é
  // bloqueado pelo navegador, como acontece em abas anônimas/privadas.
  const persistToken = useCallback((token) => {
    setAccessToken(token);
    if (token) sessionStorage.setItem('accessToken', token);
    else sessionStorage.removeItem('accessToken');
  }, []);

  // Injeta token em todas as requests
  useEffect(() => {
    const id = api.interceptors.request.use((config) => {
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      return config;
    });
    return () => api.interceptors.request.eject(id);
  }, [accessToken]);

  // Interceptor: tenta refresh automático em 401
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      async (err) => {
        const original = err.config;
        if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
          original._retry = true;
          try {
            const { data } = await axios.post(`${BACKEND_URL}/api/auth/refresh`, {}, { withCredentials: true });
            persistToken(data.accessToken);
            original.headers.Authorization = `Bearer ${data.accessToken}`;
            return api(original);
          } catch {
            logout();
          }
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  // Agenda refresh antes do token expirar (a cada 7h para token de 8h)
  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.post(`${BACKEND_URL}/api/auth/refresh`, {}, { withCredentials: true });
        persistToken(data.accessToken);
        scheduleRefresh();
      } catch {
        // Cookie de refresh indisponível (ex: bloqueado em aba anônima) — o
        // access token em memória/sessionStorage ainda pode ser válido, então
        // não derruba a sessão aqui. O interceptor de 401 cuida do logout
        // quando o token realmente expirar e o refresh também falhar.
        refreshTimerRef.current = setTimeout(() => scheduleRefresh(), 5 * 60 * 1000);
      }
    }, 7 * 60 * 60 * 1000);
  }, []);

  const doRefresh = useCallback(async () => {
    const { data } = await axios.post(`${BACKEND_URL}/api/auth/refresh`, {}, { withCredentials: true });
    persistToken(data.accessToken);
    return data.accessToken;
  }, []);

  // Tenta restaurar sessão ao carregar a página
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await doRefresh();
        const me = await axios.get(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setAgent(me.data);
        scheduleRefresh();
      } catch {
        // Refresh via cookie falhou (ex: cookie cross-site bloqueado em aba
        // anônima). Tenta validar o token já guardado em sessionStorage antes
        // de desistir e mandar para o login.
        const stored = sessionStorage.getItem('accessToken');
        if (stored) {
          try {
            const me = await axios.get(`${BACKEND_URL}/api/auth/me`, {
              headers: { Authorization: `Bearer ${stored}` },
            });
            setAccessToken(stored);
            setAgent(me.data);
            scheduleRefresh();
          } catch {
            persistToken(null);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    restoreSession();

    // Renova quando o usuário volta à aba (evita logout por throttling de background)
    function onVisible() {
      if (document.visibilityState === 'visible') {
        doRefresh().then(() => scheduleRefresh()).catch(() => {});
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(refreshTimerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    persistToken(data.accessToken);
    setAgent(data.agent);
    scheduleRefresh();
    return data.agent;
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    clearTimeout(refreshTimerRef.current);
    try { await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { withCredentials: true }); } catch {}
    persistToken(null);
    setAgent(null);
  }, []);

  return (
    <AuthContext.Provider value={{ agent, setAgent, accessToken, loading, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

export { api };
