import { useEffect, useState } from 'react';
import { destravarSom } from './lib/som.js';
import { Ajustes } from './telas/Ajustes.js';
import { Cardapio } from './telas/Cardapio.js';
import { Pedidos } from './telas/Pedidos.js';

type Aba = 'pedidos' | 'cardapio' | 'ajustes';

/**
 * Fixo ate a Fase 6: o estabelecimento vira do token do Supabase Auth, e a
 * RLS garante que o painel so enxerga o proprio. Ate la, a loja de exemplo.
 */
const ESTABELECIMENTO = 'e1';

export function App() {
  const [aba, setAba] = useState<Aba>('pedidos');
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

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

  return (
    <>
      {aba === 'pedidos' && <Pedidos estabelecimentoId={ESTABELECIMENTO} aoAvisar={avisar} />}
      {aba === 'cardapio' && <Cardapio estabelecimentoId={ESTABELECIMENTO} aoAvisar={avisar} />}
      {aba === 'ajustes' && <Ajustes estabelecimentoId={ESTABELECIMENTO} aoAvisar={avisar} />}

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
