// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const api = axios.create({ baseURL: '/api', withCredentials: true });

export function AuthProvider({ children }) {
  const [agent, setAgent] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef(null);

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
            const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
            setAccessToken(data.accessToken);
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

  // Agenda refresh antes do token expirar (a cada 14min para token de 15min)
  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        scheduleRefresh();
      } catch {
        logout();
      }
    }, 14 * 60 * 1000);
  }, []);

  // Tenta restaurar sessão ao carregar a página
  useEffect(() => {
    async function restoreSession() {
      try {
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        setAccessToken(data.accessToken);
        const me = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${data.accessToken}` },
          withCredentials: true,
        });
        setAgent(me.data);
        scheduleRefresh();
      } catch {
        // Sem sessão ativa — vai para login
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
    return () => clearTimeout(refreshTimerRef.current);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setAgent(data.agent);
    scheduleRefresh();
    return data.agent;
  }, [scheduleRefresh]);

  const logout = useCallback(async () => {
    clearTimeout(refreshTimerRef.current);
    try { await axios.post('/api/auth/logout', {}, { withCredentials: true }); } catch {}
    setAccessToken(null);
    setAgent(null);
  }, []);

  return (
    <AuthContext.Provider value={{ agent, accessToken, loading, login, logout, api }}>
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
