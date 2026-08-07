import { getProvider } from '@pedeja/data';
import type { Estabelecimento, Pedido, Produto } from '@pedeja/domain';
import { useEffect, useState } from 'react';
import { type Linha, juntar } from './lib/carrinho.js';
import { registrar } from './lib/historico.js';
import { Acompanhar } from './telas/Acompanhar.js';
import { Busca } from './telas/Busca.js';
import { Cardapio } from './telas/Cardapio.js';
import { Checkout } from './telas/Checkout.js';
import { MeusPedidos } from './telas/MeusPedidos.js';

type Aba = 'cardapio' | 'buscar' | 'pedidos';
type Tela = 'abas' | 'conta' | 'acompanhar';

/** Loja única: um app, um restaurante. Trocável por ambiente. */
const ESTABELECIMENTO = import.meta.env.VITE_ESTABLISHMENT_ID ?? 'e1';

export function App() {
  const [loja, setLoja] = useState<Estabelecimento | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [tela, setTela] = useState<Tela>('abas');
  const [aba, setAba] = useState<Aba>('cardapio');
  const [abrirProduto, setAbrirProduto] = useState<Produto | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  useEffect(() => {
    getProvider()
      .menu.obterEstabelecimento(ESTABELECIMENTO)
      .then((e) => (e ? setLoja(e) : setFalhou(true)))
      .catch(() => setFalhou(true));
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3600);
    return () => clearTimeout(t);
  }, [aviso]);

  const avisar = (texto: string, erro = false) => setAviso({ texto, erro });

  if (falhou) {
    return (
      <div className="vazio">
        <p className="vazio-t">Restaurante indisponível</p>
        <p>Não foi possível carregar o cardápio. Tente de novo em instantes.</p>
      </div>
    );
  }

  if (!loja) {
    return (
      <div className="vazio">
        <p>Carregando…</p>
      </div>
    );
  }

  return (
    <>
      {tela === 'abas' && aba === 'cardapio' && (
        <Cardapio
          loja={loja}
          linhas={linhas}
          produtoInicial={abrirProduto}
          aoLimparProdutoInicial={() => setAbrirProduto(null)}
          aoAdicionar={(linha) => {
            setLinhas((atual) => juntar(atual, linha));
            avisar(`${linha.nome} no pedido`);
          }}
          aoVerConta={() => setTela('conta')}
        />
      )}

      {tela === 'abas' && aba === 'buscar' && (
        <Busca
          loja={loja}
          aoEscolher={(p) => {
            setAbrirProduto(p);
            setAba('cardapio');
          }}
        />
      )}

      {tela === 'abas' && aba === 'pedidos' && (
        <MeusPedidos
          aoAbrir={(p) => {
            setPedido(p);
            setTela('acompanhar');
          }}
        />
      )}

      {tela === 'conta' && (
        <Checkout
          loja={loja}
          linhas={linhas}
          aoVoltar={() => setTela('abas')}
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
            setTela('acompanhar');
          }}
          aoAvisar={avisar}
        />
      )}

      {tela === 'acompanhar' && pedido && (
        <Acompanhar
          pedidoInicial={pedido}
          aoNovoPedido={() => {
            setPedido(null);
            setAba('cardapio');
            setTela('abas');
          }}
        />
      )}

      {aviso && (
        <output className="aviso" data-tom={aviso.erro ? 'erro' : undefined}>
          {aviso.texto}
        </output>
      )}

      {tela === 'abas' && (
        <nav className="abas" aria-label="Seções">
          <button
            type="button"
            aria-current={aba === 'cardapio' ? 'page' : undefined}
            onClick={() => setAba('cardapio')}
          >
            <span className="aba-icone" aria-hidden="true">
              ◍
            </span>
            Cardápio
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
