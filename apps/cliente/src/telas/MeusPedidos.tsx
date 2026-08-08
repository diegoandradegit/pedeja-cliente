import { getProvider } from '@pedeja/data';
import { type Pedido, type StatusPedido, formatarBRL } from '@pedeja/domain';
import { useCallback, useEffect, useState } from 'react';
import { type Linha, montarLinha } from '../lib/carrinho.js';
import { listar } from '../lib/historico.js';

type Props = {
  aoAbrir: (pedido: Pedido) => void;
  aoRepetir: (linhas: Linha[]) => void;
};

const ROTULO: Record<StatusPedido, string> = {
  PENDENTE: 'Aguardando',
  ACEITO: 'Aceito',
  EM_PREPARO: 'Preparando',
  PRONTO: 'Pronto',
  AGUARDANDO_ENTREGADOR: 'Aguardando entregador',
  EM_ROTA: 'A caminho',
  ENTREGUE: 'Entregue',
  RETIRADO: 'Retirado',
  CANCELADO: 'Cancelado',
};

const cor = (s: StatusPedido): string => {
  if (s === 'CANCELADO') return 'var(--vermelho)';
  if (s === 'ENTREGUE' || s === 'RETIRADO') return 'var(--verde-preco)';
  return '#b8790a';
};

function quando(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoje.toDateString()) return `Hoje, ${hora}`;
  if (d.toDateString() === ontem.toDateString()) return `Ontem, ${hora}`;
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}, ${hora}`;
}

export function MeusPedidos({ aoAbrir, aoRepetir }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

  const carregar = useCallback(async () => {
    const p = getProvider();
    const ids = listar();
    // acompanhar() funciona sem login: cada id guardado no aparelho é a
    // credencial daquele pedido
    const resultados = await Promise.allSettled(ids.map((id) => p.orders.acompanhar(id)));
    setPedidos(
      resultados
        .filter(
          (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof p.orders.acompanhar>>> =>
            r.status === 'fulfilled',
        )
        .map((r) => r.value.pedido)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    );
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /** Remonta a sacola com o que o pedido tinha, revalidando contra o cardápio. */
  async function repetir(pedido: Pedido) {
    const m = getProvider().menu;
    const [produtos, adicionais] = await Promise.all([
      m.listarProdutos(pedido.estabelecimentoId),
      m.listarAdicionais(pedido.estabelecimentoId),
    ]);

    const linhas: Linha[] = [];
    const indisponiveis: string[] = [];

    for (const item of pedido.itens) {
      const sabores = item.sabores.map((s) => produtos.find((p) => p.id === s.id));
      const [principal, ...extras] = sabores;
      if (!principal || !principal.ativo || extras.some((e) => !e?.ativo)) {
        indisponiveis.push(item.nomeProduto);
        continue;
      }
      const ads = item.adicionais
        .map((a) => adicionais.find((x) => x.id === a.id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a?.ativo));

      linhas.push(
        montarLinha(
          principal,
          item.quantidade,
          ads,
          item.observacao ?? '',
          extras.filter((e): e is NonNullable<typeof e> => Boolean(e)),
        ),
      );
    }

    if (linhas.length === 0) {
      alert('Nenhum item deste pedido está disponível agora.');
      return;
    }
    if (indisponiveis.length > 0) {
      alert(`Fora do cardápio agora: ${indisponiveis.join(', ')}. O resto foi para a sacola.`);
    }
    aoRepetir(linhas);
  }

  return (
    <>
      <div className="folha-cabecalho">
        <h2>Meus Pedidos</h2>
      </div>

      <div className="pagina">
        {!pedidos && (
          <p className="dica" style={{ marginTop: 18 }}>
            Carregando…
          </p>
        )}

        {pedidos?.length === 0 && (
          <div className="vazio">
            <p className="vazio-t">Nenhum pedido ainda</p>
            <p>
              Os pedidos feitos neste aparelho aparecem aqui. Criando uma conta, eles passam a te
              acompanhar em qualquer celular.
            </p>
          </div>
        )}

        {pedidos?.map((p) => {
          const itens = p.itens.reduce((n, i) => n + i.quantidade, 0);
          const finalizado = p.status === 'CANCELADO';
          return (
            <article className="pedido-cartao" key={p.id}>
              <div className="pedido-cartao-topo">
                <span className="marcador" style={{ color: cor(p.status) }}>
                  <span className="ponto" aria-hidden="true" />
                  {ROTULO[p.status]}
                </span>
                <span className="pedido-cartao-num">#{String(p.numero).padStart(3, '0')}</span>
                <span className="pedido-cartao-quando">{quando(p.criadoEm)}</span>
              </div>

              <div className="pedido-cartao-corpo">
                <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pedido-cartao-loja">
                      {itens} {itens === 1 ? 'item' : 'itens'}
                    </div>
                    <p className="pedido-cartao-itens">
                      {p.itens.map((i) => `${i.quantidade}x ${i.nomeProduto}`).join(', ')}
                    </p>
                  </div>
                  <span className="pedido-cartao-valor">{formatarBRL(p.total)}</span>
                </div>
              </div>

              <div className="pedido-cartao-acoes">
                <button type="button" className="botao-suave" onClick={() => aoAbrir(p)}>
                  Ver detalhes
                </button>
                {!finalizado && (
                  <button type="button" className="botao-forte" onClick={() => void repetir(p)}>
                    Repetir pedido
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
