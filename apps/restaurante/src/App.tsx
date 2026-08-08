import { getProvider } from '@pedeja/data';
import { useCallback, useEffect, useState } from 'react';
import { destravarSom } from './lib/som.js';
import { Ajustes } from './telas/Ajustes.js';
import { Cardapio } from './telas/Cardapio.js';
import { Entrar } from './telas/Entrar.js';
import { Pedidos } from './telas/Pedidos.js';

type Aba = 'pedidos' | 'cardapio' | 'ajustes';

/**
 * Com o provider mock nao ha login, entao cai na loja de exemplo. Com o
 * Supabase, a loja vem da sessao (meu_estabelecimento()) e a RLS garante que
 * o painel so enxerga a propria — trocar o id na URL nao leva a lugar nenhum.
 */
const LOJA_PADRAO = import.meta.env.VITE_ESTABLISHMENT_ID ?? 'e1';

export function App() {
  const [aba, setAba] = useState<Aba>('pedidos');
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);
  const [loja, setLoja] = useState<string | null>(null);
  const [semAcesso, setSemAcesso] = useState(false);
  const [precisaEntrar, setPrecisaEntrar] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregarSessao = useCallback(() => {
    setCarregando(true);
    setSemAcesso(false);
    getProvider()
      .auth.sessaoAtual()
      .then((sessao) => {
        if (!sessao) {
          setPrecisaEntrar(true);
          setLoja(null);
          return;
        }
        setPrecisaEntrar(false);
        // com o mock nao ha vinculo real; cai na loja de exemplo
        const alvo = sessao.estabelecimentoId ?? LOJA_PADRAO;
        if (!alvo) {
          setSemAcesso(true);
          return;
        }
        setLoja(alvo);
      })
      .catch(() => setPrecisaEntrar(true))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => carregarSessao(), [carregarSessao]);

  async function sair() {
    await getProvider().auth.sair();
    setLoja(null);
    setPrecisaEntrar(true);
  }

  // Navegadores so liberam audio apos um gesto do usuario.
  useEffect(() => {
    const soltar = () => destravarSom();
    window.addEventListener('pointerdown', soltar, { once: true });
    return () => window.removeEventListener('pointerdown', soltar);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3200);
    return () => clearTimeout(t);
  }, [aviso]);

  const avisar = (texto: string, erro = false) => setAviso({ texto, erro });

  if (carregando) {
    return (
      <div className="vazio">
        <p>Carregando painel…</p>
      </div>
    );
  }

  if (precisaEntrar) {
    return <Entrar aoEntrar={carregarSessao} />;
  }

  if (semAcesso) {
    return (
      <div className="vazio">
        <p className="vazio-t">Sem restaurante vinculado</p>
        <p>
          Esta conta não faz parte da equipe de nenhum restaurante. Peça a quem administra para
          liberar o acesso.
        </p>
        <div style={{ height: 20 }} />
        <button type="button" className="botao-vazado" onClick={() => void sair()}>
          Sair
        </button>
      </div>
    );
  }

  if (!loja) {
    return (
      <div className="vazio">
        <p>Carregando painel…</p>
      </div>
    );
  }

  return (
    <>
      {aba === 'pedidos' && <Pedidos estabelecimentoId={loja} aoAvisar={avisar} />}
      {aba === 'cardapio' && <Cardapio estabelecimentoId={loja} aoAvisar={avisar} />}
      {aba === 'ajustes' && (
        <Ajustes estabelecimentoId={loja} aoAvisar={avisar} aoSair={() => void sair()} />
      )}

      {aviso && (
        <output className="aviso" data-tom={aviso.erro ? 'erro' : undefined}>
          {aviso.texto}
        </output>
      )}

      <nav className="nav" aria-label="Seções do painel">
        <button
          type="button"
          aria-current={aba === 'pedidos' ? 'page' : undefined}
          onClick={() => setAba('pedidos')}
        >
          Comandas
        </button>
        <button
          type="button"
          aria-current={aba === 'cardapio' ? 'page' : undefined}
          onClick={() => setAba('cardapio')}
        >
          Cardápio
        </button>
        <button
          type="button"
          aria-current={aba === 'ajustes' ? 'page' : undefined}
          onClick={() => setAba('ajustes')}
        >
          Ajustes
        </button>
      </nav>
    </>
  );
}
