import { getProvider } from '@pedeja/data';
import { type Pedido, type StatusPedido, formatarBRL } from '@pedeja/domain';
import { useEffect, useState } from 'react';

type Props = { pedidoInicial: Pedido; aoNovoPedido: () => void };

const ETAPAS_ENTREGA: [StatusPedido, string][] = [
  ['PENDENTE', 'Pedido enviado'],
  ['ACEITO', 'Restaurante aceitou'],
  ['EM_PREPARO', 'Preparando'],
  ['PRONTO', 'Pronto'],
  ['EM_ROTA', 'A caminho'],
  ['ENTREGUE', 'Entregue'],
];

const ETAPAS_RETIRADA: [StatusPedido, string][] = [
  ['PENDENTE', 'Pedido enviado'],
  ['ACEITO', 'Restaurante aceitou'],
  ['EM_PREPARO', 'Preparando'],
  ['PRONTO', 'Pronto para retirada'],
  ['RETIRADO', 'Retirado'],
];

export function Acompanhar({ pedidoInicial, aoNovoPedido }: Props) {
  const [pedido, setPedido] = useState(pedidoInicial);

  useEffect(() => {
    const p = getProvider();
    return p.realtime.assinarPedido(pedidoInicial.id, () => {
      void p.orders.obter(pedidoInicial.id).then((atual) => atual && setPedido(atual));
    });
  }, [pedidoInicial.id]);

  const etapas = pedido.tipoEntrega === 'ENTREGA' ? ETAPAS_ENTREGA : ETAPAS_RETIRADA;
  const indiceAtual = etapas.findIndex(([s]) => s === pedido.status);
  const cancelado = pedido.status === 'CANCELADO';

  return (
    <>
      <header className="folha-cabecalho">
        <div>
          <h2>Pedido #{String(pedido.numero).padStart(3, '0')}</h2>
          <p className="dica" style={{ margin: '4px 0 0' }}>
            {pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'} ·{' '}
            {formatarBRL(pedido.total)}
          </p>
        </div>
      </header>

      <div className="pagina">
        {cancelado ? (
          <div className="faixa">
            <strong>Pedido cancelado</strong>
            <span>
              Se você não pediu o cancelamento, fale com o restaurante pelo telefone da loja.
            </span>
          </div>
        ) : (
          <ol className="trilha">
            {etapas.map(([status, rotulo], i) => (
              <li
                className="etapa"
                key={status}
                data-feita={indiceAtual >= 0 && i <= indiceAtual}
                data-atual={i === indiceAtual}
              >
                <span className="etapa-bolha" />
                <div>
                  <div className="etapa-nome">{rotulo}</div>
                  {i === indiceAtual && (
                    <p className="etapa-quando">
                      atualizado{' '}
                      {new Date(pedido.atualizadoEm).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {pedido.status === 'PRONTO' && pedido.tipoEntrega === 'RETIRADA' && (
          <div className="faixa">
            <strong>Pode buscar</strong>
            <span>Seu pedido está pronto no balcão.</span>
          </div>
        )}

        <p className="bloco-titulo">O que você pediu</p>
        {pedido.itens.map((item, i) => (
          <div className="item-conta" key={`${item.produtoId}-${i}`}>
            <span className="item-nome">{item.quantidade}×</span>
            <div>
              <div className="item-nome">{item.nomeProduto}</div>
              {item.adicionais.length > 0 && (
                <p className="item-extra">+ {item.adicionais.map((a) => a.nome).join(', ')}</p>
              )}
            </div>
            <span className="item-preco">{formatarBRL(item.subtotal)}</span>
          </div>
        ))}

        <div className="resumo-linha" style={{ marginTop: 10 }}>
          <span>Itens</span>
          <span>{formatarBRL(pedido.subtotal)}</span>
        </div>
        {pedido.tipoEntrega === 'ENTREGA' && (
          <div className="resumo-linha">
            <span>Entrega</span>
            <span>{pedido.frete === 0 ? 'Grátis' : formatarBRL(pedido.frete)}</span>
          </div>
        )}
        <div className="resumo-linha resumo-total">
          <span>Total</span>
          <span>{formatarBRL(pedido.total)}</span>
        </div>

        <div style={{ height: 24 }} />
        <button type="button" className="secundaria" onClick={aoNovoPedido}>
          Fazer outro pedido
        </button>
      </div>
    </>
  );
}
