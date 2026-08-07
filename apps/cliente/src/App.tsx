import { getProvider } from '@pedeja/data';
import type { Estabelecimento, Pedido, Produto } from '@pedeja/domain';
import { formatarBRL } from '@pedeja/domain';
import { FileText, Home, Search, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Linha, juntar, previaSubtotal, totalDeItens } from './lib/carrinho.js';
import { registrar } from './lib/historico.js';
import { Acompanhar } from './telas/Acompanhar.js';
import { Busca } from './telas/Busca.js';
import { Cardapio } from './telas/Cardapio.js';
import { Configuracoes } from './telas/Configuracoes.js';
import { Conta } from './telas/Conta.js';
import { MeusPedidos } from './telas/MeusPedidos.js';

type Aba = 'inicio' | 'buscar' | 'pedidos' | 'ajustes';

/** Loja única: um app, um restaurante. */
const ESTABELECIMENTO = import.meta.env.VITE_ESTABLISHMENT_ID ?? 'e1';

export function App() {
  const [loja, setLoja] = useState<Estabelecimento | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [aba, setAba] = useState<Aba>('inicio');
  const [sobreposicao, setSobreposicao] = useState<'nenhuma' | 'conta' | 'acompanhar'>('nenhuma');
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

  if (!loja)
    return (
      <div className="vazio">
        <p>Carregando…</p>
      </div>
    );

  const itens = totalDeItens(linhas);
  const emAbas = sobreposicao === 'nenhuma';

  return (
    <>
      {sobreposicao === 'conta' && (
        <Conta
          loja={loja}
          linhas={linhas}
          aoFechar={() => setSobreposicao('nenhuma')}
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
            setSobreposicao('acompanhar');
          }}
          aoAvisar={avisar}
        />
      )}

      {sobreposicao === 'acompanhar' && pedido && (
        <Acompanhar
          pedidoInicial={pedido}
          aoNovoPedido={() => {
            setPedido(null);
            setAba('inicio');
            setSobreposicao('nenhuma');
          }}
        />
      )}

      {emAbas && aba === 'inicio' && (
        <Cardapio
          loja={loja}
          produtoInicial={abrirProduto}
          aoLimparProdutoInicial={() => setAbrirProduto(null)}
          aoAdicionar={(linha) => {
            setLinhas((atual) => juntar(atual, linha));
            avisar(`${linha.nome} no pedido`);
          }}
        />
      )}

      {emAbas && aba === 'buscar' && (
        <Busca
          loja={loja}
          aoEscolher={(p) => {
            setAbrirProduto(p);
            setAba('inicio');
          }}
        />
      )}

      {emAbas && aba === 'pedidos' && (
        <MeusPedidos
          aoAbrir={(p) => {
            setPedido(p);
            setSobreposicao('acompanhar');
          }}
        />
      )}

      {emAbas && aba === 'ajustes' && <Configuracoes aoAvisar={avisar} />}

      {aviso && (
        <output className="aviso" data-tom={aviso.erro ? 'erro' : undefined}>
          {aviso.texto}
        </output>
      )}

      {emAbas && (
        <div className="rodape">
          <nav className="abas" aria-label="Seções">
            <button
              type="button"
              aria-current={aba === 'inicio' ? 'page' : undefined}
              onClick={() => setAba('inicio')}
            >
              <Home size={24} strokeWidth={2} />
              Início
            </button>
            <button
              type="button"
              aria-current={aba === 'buscar' ? 'page' : undefined}
              onClick={() => setAba('buscar')}
            >
              <Search size={24} strokeWidth={2} />
              Buscar
            </button>
            <button
              type="button"
              aria-current={aba === 'pedidos' ? 'page' : undefined}
              onClick={() => setAba('pedidos')}
            >
              <FileText size={24} strokeWidth={2} />
              Meus Pedidos
            </button>
            <button
              type="button"
              aria-current={aba === 'ajustes' ? 'page' : undefined}
              onClick={() => setAba('ajustes')}
            >
              <Settings size={24} strokeWidth={2} />
              Configurações
            </button>
          </nav>

          {itens > 0 && (
            <button type="button" className="pedido-barra" onClick={() => setSobreposicao('conta')}>
              <span>Meu Pedido</span>
              <span className="num">
                {String(itens).padStart(2, '0')} {itens === 1 ? 'item' : 'items'} ·{' '}
                {formatarBRL(previaSubtotal(linhas))}
              </span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
