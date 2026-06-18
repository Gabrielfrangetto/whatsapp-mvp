const CLOUD_NAME = 'dvbah3xab';
const UPLOAD_PRESET = 'whatsapp_mvp_agents';

function blobToWebP(blob) {
  return new Promise((resolve) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      URL.revokeObjectURL(objUrl);
      canvas.toBlob(resolve, 'image/webp', 0.92);
    };
    img.src = objUrl;
  });
}

export async function uploadToCloudinary(blob, folder = 'stickers') {
  const webpBlob = await blobToWebP(blob);
  const form = new FormData();
  form.append('file', new File([webpBlob], 'sticker.webp', { type: 'image/webp' }));
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Upload falhou');
  return data.secure_url;
}
