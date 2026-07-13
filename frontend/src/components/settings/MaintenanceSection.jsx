import { useState } from 'react';
import { Wrench, AlertTriangle } from 'lucide-react';
import { api } from '../../context/AuthContext';

const BTN = {
  base: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', border: 'none' },
  primary: { background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' },
  danger:  { background: '#ef4444', color: '#fff' },
  ghost:   { background: 'none', border: '1px solid var(--theme-border)', color: 'var(--theme-text-secondary)' },
};

function btn(variant) { return { ...BTN.base, ...BTN[variant] }; }

export default function MaintenanceSection() {
  const [state, setState] = useState('idle'); // idle | loading | preview | executing | done | error
  const [preview, setPreview] = useState(null);
  const [result, setResult]   = useState(null);
  const [err, setErr]         = useState('');

  async function handlePreview() {
    setState('loading'); setErr('');
    try {
      const { data } = await api.get('/admin/merge-conversations');
      setPreview(data);
      setState('preview');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Erro ao verificar duplicatas.');
      setState('error');
    }
  }

  async function handleExecute() {
    setState('executing'); setErr('');
    try {
      const { data } = await api.post('/admin/merge-conversations');
      setResult(data);
      setState('done');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Erro ao mesclar conversas.');
      setState('error');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'var(--theme-bg)', borderRadius: 12, border: '1px solid var(--theme-border)', padding: '16px 18px' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--theme-text)', marginBottom: 6 }}>
          Mesclar conversas duplicadas
        </div>
        <div style={{ fontSize: 12, color: 'var(--theme-text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
          Um bug antigo criava novas conversas ao invés de reabrir as existentes. Use esta ferramenta para consolidar as duplicatas de cada contato em uma única conversa, preservando todas as mensagens.
        </div>

        {state === 'idle' && (
          <button onClick={handlePreview} style={btn('primary')}>
            <Wrench size={13} /> Verificar duplicatas
          </button>
        )}

        {(state === 'loading' || state === 'executing') && (
          <div style={{ fontSize: 13, color: 'var(--theme-text-muted)' }}>
            {state === 'loading' ? 'Verificando...' : 'Mesclando conversas...'}
          </div>
        )}

        {state === 'preview' && preview && (
          preview.contacts === 0 ? (
            <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>
              Nenhuma duplicata encontrada. Tudo limpo!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--theme-text)', padding: '10px 12px', borderRadius: 8, background: 'var(--theme-bg-tertiary)', border: '1px solid var(--theme-border)', lineHeight: 1.6 }}>
                Encontrado: <strong>{preview.contacts}</strong> contato(s) com conversas duplicadas ·{' '}
                <strong>{preview.duplicates}</strong> conversa(s) serão removidas e suas mensagens consolidadas.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setState('idle')} style={btn('ghost')}>Cancelar</button>
                <button onClick={handleExecute} style={btn('danger')}>Mesclar agora</button>
              </div>
            </div>
          )
        )}

        {state === 'done' && result && (
          <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 500, lineHeight: 1.8 }}>
            Concluído com sucesso!<br />
            {result.contacts} contato(s) processados · {result.messages} mensagem(s) preservadas · {result.deleted} conversa(s) removidas.
          </div>
        )}

        {state === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, color: '#ef4444', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {err}
            </div>
            <button onClick={() => setState('idle')} style={btn('ghost')}>Tentar novamente</button>
          </div>
        )}
      </div>
    </div>
  );
}
