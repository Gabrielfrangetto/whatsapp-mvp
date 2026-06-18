export default function StickerAddForm({ previewUrl, addName, setAddName, onUpload, onCancel, uploading }) {
  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--theme-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {previewUrl && (
          <img src={previewUrl} alt="preview" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--theme-border)' }} />
        )}
        <input
          autoFocus
          value={addName}
          onChange={e => setAddName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onUpload()}
          placeholder="Nome do sticker"
          style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1px solid var(--theme-border)', fontSize: 12, background: 'var(--theme-bg-input)', color: 'var(--theme-text)', outline: 'none' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={onUpload}
          disabled={uploading || !addName.trim()}
          style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: '2px solid var(--theme-primary)', background: 'none', color: 'var(--theme-primary)', cursor: uploading || !addName.trim() ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 700, opacity: !addName.trim() ? 0.5 : 1 }}
        >
          {uploading ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          onClick={onCancel}
          style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--theme-border)', background: 'none', color: 'var(--theme-text-muted)', cursor: 'pointer', fontSize: 12 }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
