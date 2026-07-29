// src/hooks/useAchievements.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../context/AuthContext';

export function useAchievements(accessToken) {
  const [achievements, setAchievements] = useState([]);
  const [toastQueue, setToastQueue] = useState([]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const { data } = await api.get('/achievements/me');
      setAchievements(data.achievements || []);
    } catch {}
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const handleAchievementUnlocked = useCallback((achievement) => {
    setAchievements(prev => prev.map(a => a.key === achievement.key
      ? { ...a, unlocked: true, unlockedAt: new Date().toISOString(), progress: a.threshold }
      : a));
    setToastQueue(prev => [...prev, { ...achievement, _toastId: `${achievement.key}-${Date.now()}` }]);
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToastQueue(prev => prev.filter(t => t._toastId !== toastId));
  }, []);

  const markSeen = useCallback(async (keys) => {
    if (!keys?.length) return;
    setAchievements(prev => prev.map(a => keys.includes(a.key) ? { ...a, seenAt: new Date().toISOString() } : a));
    try { await api.patch('/achievements/me/seen', { keys }); } catch {}
  }, []);

  const unseenCount = achievements.filter(a => a.unlocked && !a.seenAt).length;

  return { achievements, unseenCount, toastQueue, handleAchievementUnlocked, dismissToast, markSeen };
}
