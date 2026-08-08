import { getProvider } from '@pedeja/data';
import { useEffect, useState } from 'react';
import { destravarSom } from './lib/som.js';
import { Ajustes } from './telas/Ajustes.js';
import { Cardapio } from './telas/Cardapio.js';
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

  useEffect(() => {
    getProvider()
      .auth.sessaoAtual()
      .then((sessao) => {
        if (!sessao) {
          // sem login (mock) — usa a loja padrao
          setLoja(LOJA_PADRAO);
          return;
        }
        if (!sessao.estabelecimentoId) {
          setSemAcesso(true);
          return;
        }
        setLoja(sessao.estabelecimentoId);
      })
      .catch(() => setLoja(LOJA_PADRAO));
  }, []);

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

  if (semAcesso) {
    return (
      <div className="vazio">
        <p className="vazio-t">Sem restaurante vinculado</p>
        <p>
          Esta conta não faz parte da equipe de nenhum restaurante. Peça a quem administra para
          liberar o acesso.
        </p>
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
      {aba === 'ajustes' && <Ajustes estabelecimentoId={loja} aoAvisar={avisar} />}

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
