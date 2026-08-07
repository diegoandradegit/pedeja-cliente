import type { Estabelecimento, Pedido, Produto } from '@pedeja/domain';
import { useEffect, useState } from 'react';
import { type Linha, juntar } from './lib/carrinho.js';
import { registrar } from './lib/historico.js';
import { Acompanhar } from './telas/Acompanhar.js';
import { Busca } from './telas/Busca.js';
import { Checkout } from './telas/Checkout.js';
import { Loja } from './telas/Loja.js';
import { Lojas } from './telas/Lojas.js';
import { MeusPedidos } from './telas/MeusPedidos.js';

type Aba = 'inicio' | 'buscar' | 'pedidos';
type Tela = { nome: 'abas' } | { nome: 'loja' } | { nome: 'conta' } | { nome: 'acompanhar' };

export function App() {
  const [tela, setTela] = useState<Tela>({ nome: 'abas' });
  const [aba, setAba] = useState<Aba>('inicio');
  const [loja, setLoja] = useState<Estabelecimento | null>(null);
  const [abrirProduto, setAbrirProduto] = useState<Produto | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3600);
    return () => clearTimeout(t);
  }, [aviso]);

  const avisar = (texto: string, erro = false) => setAviso({ texto, erro });

  function entrarNaLoja(nova: Estabelecimento, produto?: Produto) {
    // Trocar de restaurante zera a conta: um pedido pertence a uma loja só.
    if (loja && loja.id !== nova.id && linhas.length > 0) {
      if (!confirm(`Sua conta em ${loja.nome} será esvaziada. Continuar?`)) return;
      setLinhas([]);
    }
    setLoja(nova);
    setAbrirProduto(produto ?? null);
    setTela({ nome: 'loja' });
  }

  const mostrandoAbas = tela.nome === 'abas';

  return (
    <>
      {mostrandoAbas && aba === 'inicio' && <Lojas aoEscolher={(l) => entrarNaLoja(l)} />}
      {mostrandoAbas && aba === 'buscar' && <Busca aoEscolher={(l, p) => entrarNaLoja(l, p)} />}
      {mostrandoAbas && aba === 'pedidos' && (
        <MeusPedidos
          aoAbrir={(p) => {
            setPedido(p);
            setTela({ nome: 'acompanhar' });
          }}
        />
      )}

      {tela.nome === 'loja' && loja && (
        <Loja
          loja={loja}
          linhas={linhas}
          produtoInicial={abrirProduto}
          aoLimparProdutoInicial={() => setAbrirProduto(null)}
          aoVoltar={() => setTela({ nome: 'abas' })}
          aoAdicionar={(linha) => {
            setLinhas((atual) => juntar(atual, linha));
            avisar(`${linha.nome} na conta`);
          }}
          aoVerConta={() => setTela({ nome: 'conta' })}
        />
      )}

      {tela.nome === 'conta' && loja && (
        <Checkout
          loja={loja}
          linhas={linhas}
          aoVoltar={() => setTela({ nome: 'loja' })}
          aoMudarQuantidade={(chave, quantidade) =>
            setLinhas((atual) =>
              quantidade <= 0
                ? atual.filter((l) => l.chave !== chave)
                : atual.map((l) => (l.chave === chave ? { ...l, quantidade } : l)),
            )
          }
          aoConfirmar={(p) => {
            registrar(p.id);
            setPedido(p);
            setLinhas([]);
            setTela({ nome: 'acompanhar' });
          }}
          aoAvisar={avisar}
        />
      )}

      {tela.nome === 'acompanhar' && pedido && (
        <Acompanhar
          pedidoInicial={pedido}
          aoNovoPedido={() => {
            setPedido(null);
            setLoja(null);
            setAba('inicio');
            setTela({ nome: 'abas' });
          }}
        />
      )}

      {aviso && (
        <output className="aviso" data-tom={aviso.erro ? 'erro' : undefined}>
          {aviso.texto}
        </output>
      )}

      {mostrandoAbas && (
        <nav className="abas" aria-label="Seções">
          <button
            type="button"
            aria-current={aba === 'inicio' ? 'page' : undefined}
            onClick={() => setAba('inicio')}
          >
            <span className="aba-icone" aria-hidden="true">
              ◉
            </span>
            Início
          </button>
          <button
            type="button"
            aria-current={aba === 'buscar' ? 'page' : undefined}
            onClick={() => setAba('buscar')}
          >
            <span className="aba-icone" aria-hidden="true">
              ⌕
            </span>
            Buscar
          </button>
          <button
            type="button"
            aria-current={aba === 'pedidos' ? 'page' : undefined}
            onClick={() => setAba('pedidos')}
          >
            <span className="aba-icone" aria-hidden="true">
              ☰
            </span>
            Meus pedidos
          </button>
        </nav>
      )}
    </>
  );
}
