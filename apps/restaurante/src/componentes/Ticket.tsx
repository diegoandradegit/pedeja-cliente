import { type Pedido, formatarBRL } from '@pedeja/domain';
import { formatarEspera, minutosDesde, nivelDeEspera } from '../lib/tempo.js';

type Props = { pedido: Pedido; agora: number; aoAbrir: (p: Pedido) => void };

export function Ticket({ pedido, agora, aoAbrir }: Props) {
  const minutos = minutosDesde(pedido.criadoEm, agora);
  const nivel = nivelDeEspera(minutos);
  const { valor, unidade } = formatarEspera(minutos);

  const resumo = pedido.itens.map((i) => `${i.quantidade}× ${i.nomeProduto}`).join(' · ');

  return (
    <button type="button" className="ticket" onClick={() => aoAbrir(pedido)}>
      <div className="ticket-topo">
        <span className="ticket-num">#{String(pedido.numero).padStart(3, '0')}</span>
        <span className="espera" data-nivel={nivel}>
          {valor}
          {unidade && <span className="espera-un">{unidade}</span>}
        </span>
      </div>

      <p className="ticket-cliente">{pedido.clienteNome}</p>
      <p className="ticket-itens">{resumo}</p>

      <div className="ticket-rodape">
        <span className="selo" data-tom={pedido.tipoEntrega === 'ENTREGA' ? 'entrega' : 'retirada'}>
          {pedido.tipoEntrega === 'ENTREGA' ? 'Entrega' : 'Retirada'}
        </span>
        {pedido.entregadorId && <span className="selo">Com entregador</span>}
        <span className="ticket-total">{formatarBRL(pedido.total)}</span>
      </div>
    </button>
  );
}
