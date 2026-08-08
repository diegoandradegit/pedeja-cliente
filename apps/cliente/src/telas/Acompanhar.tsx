import { type Acompanhamento, getProvider } from '@pedeja/data';
import { type StatusPedido, ehStatusFinal, formatarBRL } from '@pedeja/domain';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Props = { pedidoId: string; aoVoltar: () => void; aoNovoPedido: () => void };

/**
 * Etapas mostradas ao cliente. NÃO é uma segunda máquina de estados: a
 * transição continua sendo decidida pelo domínio e pelo banco. Aqui só
 * traduzimos o status que chega para uma linha do tempo legível.
 */
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

const ROTULO_CURTO: Partial<Record<StatusPedido, string>> = {
  PENDENTE: 'Aguardando o restaurante',
  ACEITO: 'Aceito',
  EM_PREPARO: 'Preparando',
  PRONTO: 'Pronto',
  AGUARDANDO_ENTREGADOR: 'Aguardando entregador',
  EM_ROTA: 'A caminho',
  ENTREGUE: 'Entregue',
  RETIRADO: 'Retirado',
};

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function Acompanhar({ pedidoId, aoVoltar, aoNovoPedido }: Props) {
  const [dados, setDados] = useState<Acompanhamento | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      setDados(await getProvider().orders.acompanhar(pedidoId));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o pedido');
    }
  }, [pedidoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Realtime chega só para quem tem sessão; quem pediu sem cadastro depende
  // desta consulta periódica. Ela para sozinha quando o pedido termina e
  // quando a aba sai de vista, para não gastar bateria à toa.
  useEffect(() => {
    if (dados && ehStatusFinal(dados.pedido.status)) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void carregar();
    }, 15000);
    const aoVoltarAVista = () => {
      if (document.visibilityState === 'visible') void carregar();
    };
    document.addEventListener('visibilitychange', aoVoltarAVista);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltarAVista);
    };
  }, [carregar, dados]);

  // quem está logado recebe na hora
  useEffect(() => {
    return getProvider().realtime.assinarPedido(pedidoId, () => void carregar());
  }, [pedidoId, carregar]);

  if (erro) {
    return (
      <div className="vazio">
        <p className="vazio-t">Pedido não encontrado</p>
        <p>{erro}</p>
        <div style={{ height: 20 }} />
        <button type="button" className="acao acao-centro" onClick={aoNovoPedido}>
          Ver cardápio
        </button>
      </div>
    );
  }

  if (!dados)
    return (
      <div className="vazio">
        <p>Carregando pedido…</p>
      </div>
    );

  const { pedido, estabelecimento, historico } = dados;
  const cancelado = pedido.status === 'CANCELADO';
  const etapas = pedido.tipoEntrega === 'ENTREGA' ? ETAPAS_ENTREGA : ETAPAS_RETIRADA;

  // AGUARDANDO_ENTREGADOR é passo interno da loja: para o cliente, segue "pronto"
  const statusVisivel: StatusPedido =
    pedido.status === 'AGUARDANDO_ENTREGADOR' ? 'PRONTO' : pedido.status;
  const indiceAtual = etapas.findIndex(([s]) => s === statusVisivel);
  const quandoDe = (s: StatusPedido) => historico.find((h) => h.para === s)?.em;

  const totalItens = pedido.itens.reduce((n, i) => n + i.quantidade, 0);
  const previsao = new Date(new Date(pedido.criadoEm).getTime() + 45 * 60000);

  return (
    <>
      {!cancelado && <div className="faixa-status" />}

      <div className="cabecalho-pedido">
        <button type="button" className="voltar" onClick={aoVoltar} aria-label="Voltar">
          <ArrowLeft size={24} strokeWidth={2.2} />
        </button>
        <h1>Pedido #{String(pedido.numero).padStart(3, '0')}</h1>
        <ShoppingBag size={22} strokeWidth={2} style={{ color: 'var(--cinza)' }} />
      </div>

      <div className="pagina" style={{ paddingBottom: 24 }}>
        {cancelado ? (
          <div className="cancelado-cartao">
            <strong>Pedido cancelado</strong>
            <span>
              Este pedido foi cancelado e não será preparado. Se você não pediu o cancelamento, fale
              com o restaurante.
            </span>
          </div>
        ) : (
          <div className="cartao">
            <span className="status-atual">
              <span className="ponto" aria-hidden="true" />
              {ROTULO_CURTO[pedido.status] ?? pedido.status}
            </span>

            {!ehStatusFinal(pedido.status) && pedido.tipoEntrega === 'ENTREGA' && (
              <>
                <p className="previsao">{hora(previsao.toISOString())}</p>
                <p className="previsao-rotulo">Previsão de entrega</p>
              </>
            )}

            <div className="loja-linha">
              {estabelecimento.imagem && <img src={estabelecimento.imagem} alt="" />}
              <div>
                <strong>{estabelecimento.nome}</strong>
                <span>
                  {totalItens} {totalItens === 1 ? 'item' : 'itens'} · {formatarBRL(pedido.total)}
                </span>
              </div>
            </div>
          </div>
        )}

        {!cancelado && (
          <div className="cartao">
            <h2>Acompanhar pedido</h2>
            {etapas.map(([status, rotulo], i) => {
              const feito = indiceAtual >= 0 && i <= indiceAtual;
              const atual = i === indiceAtual;
              const em = quandoDe(status);
              return (
                <div className="passo" key={status} data-feito={feito} data-atual={atual}>
                  <span className="passo-bolha" aria-hidden="true" />
                  <div>
                    <div className="passo-nome">{rotulo}</div>
                    {em && <p className="passo-quando">{hora(em)}</p>}
                    {atual && !em && <p className="passo-quando">agora</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="cartao">
          <h2>O que você pediu</h2>
          {pedido.itens.map((item, i) => (
            <div className="item-pedido" key={`${item.produtoId}-${i}`}>
              <span className="item-qtd">{item.quantidade}x</span>
              <div className="item-corpo">
                <div className="item-titulo">{item.nomeProduto}</div>
                {item.adicionais.length > 0 && (
                  <p className="item-obs">+ {item.adicionais.map((a) => a.nome).join(', ')}</p>
                )}
                {item.observacao && <p className="item-obs">“{item.observacao}”</p>}
              </div>
              <span className="item-valor">{formatarBRL(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <div className="cartao">
          <div className="resumo-linha">
            <span>Subtotal</span>
            <span>{formatarBRL(pedido.subtotal)}</span>
          </div>
          {pedido.tipoEntrega === 'ENTREGA' && (
            <div className="resumo-linha">
              <span>Taxa de entrega</span>
              <span className={pedido.frete === 0 ? 'economia' : undefined}>
                {pedido.frete === 0 ? 'Grátis' : formatarBRL(pedido.frete)}
              </span>
            </div>
          )}
          <div className="resumo-linha resumo-total">
            <span>Total</span>
            <span>{formatarBRL(pedido.total)}</span>
          </div>
        </div>
      </div>

      <div className="rodape-fixo">
        <button type="button" className="acao acao-centro" onClick={aoNovoPedido}>
          Fazer outro pedido
        </button>
      </div>
    </>
  );
}
