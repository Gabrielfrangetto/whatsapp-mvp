import { api } from '../context/AuthContext';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';

const API_URL = import.meta.env.VITE_API_URL || 'https://whatsapp-mvp-production.up.railway.app';

export function useSaveSticker() {
  async function saveSticker(message) {
    const name = window.prompt('Nome do sticker:', 'Sticker');
    if (!name) return;
    try {
      const res  = await fetch(`${API_URL}/api/media/${message.mediaUrl}`);
      const blob = await res.blob();
      const url  = await uploadToCloudinary(blob);
      await api.post('/stickers', { name, url });
    } catch (e) {
      console.error('[SaveSticker]', e);
    }
  }
  return saveSticker;
}
