import { getProvider } from '@pedeja/data';
import { useCallback, useEffect, useState } from 'react';
import { Corridas } from './telas/Corridas.js';
import { Entrar } from './telas/Entrar.js';
import { Extrato } from './telas/Extrato.js';

type Aba = 'corridas' | 'extrato';

export function App() {
  const [entregadorId, setEntregadorId] = useState<string | null>(null);
  const [precisaEntrar, setPrecisaEntrar] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [aba, setAba] = useState<Aba>('corridas');
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  const carregarSessao = useCallback(() => {
    setCarregando(true);
    getProvider()
      .auth.sessaoAtual()
      .then((sessao) => {
        if (!sessao) {
          setPrecisaEntrar(true);
          setEntregadorId(null);
          return;
        }
        setPrecisaEntrar(false);
        setEntregadorId(sessao.usuarioId);
      })
      .catch(() => setPrecisaEntrar(true))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => carregarSessao(), [carregarSessao]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3400);
    return () => clearTimeout(t);
  }, [aviso]);

  const avisar = (texto: string, erro = false) => setAviso({ texto, erro });

  async function sair() {
    await getProvider().auth.sair();
    setEntregadorId(null);
    setPrecisaEntrar(true);
  }

  if (carregando)
    return (
      <div className="vazio">
        <p>Carregando…</p>
      </div>
    );
  if (precisaEntrar || !entregadorId) return <Entrar aoEntrar={carregarSessao} />;

  return (
    <>
      {aba === 'corridas' && <Corridas entregadorId={entregadorId} aoAvisar={avisar} />}
      {aba === 'extrato' && <Extrato entregadorId={entregadorId} aoSair={() => void sair()} />}

      {aviso && (
        <output className="aviso" data-tom={aviso.erro ? 'erro' : undefined}>
          {aviso.texto}
        </output>
      )}

      <nav className="abas" aria-label="Seções">
        <button
          type="button"
          aria-current={aba === 'corridas' ? 'page' : undefined}
          onClick={() => setAba('corridas')}
        >
          Corridas
        </button>
        <button
          type="button"
          aria-current={aba === 'extrato' ? 'page' : undefined}
          onClick={() => setAba('extrato')}
        >
          Extrato
        </button>
      </nav>
    </>
  );
}
