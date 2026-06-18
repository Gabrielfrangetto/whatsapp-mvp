import { useState, useEffect, useCallback } from 'react';
import { api } from '../context/AuthContext';

export function useStickerFavorites() {
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    api.get('/favorites').then(({ data }) => {
      setFavorites(new Set(data.map(f => f.mediaUrl)));
    }).catch(() => {});
  }, []);

  const toggle = useCallback(async (mediaUrl, name) => {
    const { data } = await api.post('/favorites/toggle', { mediaUrl, name });
    setFavorites(prev => {
      const next = new Set(prev);
      if (data.favorited) next.add(mediaUrl);
      else next.delete(mediaUrl);
      return next;
    });
    return data.favorited;
  }, []);

  return { favorites, toggleFavorite: toggle };
}
