import { type Pedido, formatarBRL } from '@pedeja/domain';
import { Check } from 'lucide-react';
import { useEffect } from 'react';

type Props = { pedido: Pedido; aoAcompanhar: () => void };

/**
 * Confirmação explícita depois de criar. Existe para o cliente saber, sem
 * dúvida, que o pedido foi registrado — e o número mostrado é o do pedido
 * recém-criado, vindo do banco, não um otimista da tela.
 */
export function PedidoRecebido({ pedido, aoAcompanhar }: Props) {
  // segue sozinho para o acompanhamento; o botão só antecipa
  useEffect(() => {
    const t = setTimeout(aoAcompanhar, 3200);
    return () => clearTimeout(t);
  }, [aoAcompanhar]);

  const itens = pedido.itens.reduce((n, i) => n + i.quantidade, 0);

  return (
    <div className="recebido">
      <div className="recebido-selo">
        <Check size={46} strokeWidth={3} />
      </div>
      <h1>Pedido #{String(pedido.numero).padStart(3, '0')} recebido!</h1>
      <p>
        {pedido.tipoEntrega === 'ENTREGA'
          ? 'O restaurante já foi avisado e vai começar o preparo.'
          : 'O restaurante já foi avisado. Avisamos quando estiver pronto para retirada.'}
      </p>

      <div className="cartao" style={{ textAlign: 'left', marginTop: 28 }}>
        <div className="resumo-linha">
          <span>
            {itens} {itens === 1 ? 'item' : 'itens'}
          </span>
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

      <div style={{ height: 12 }} />
      <button type="button" className="acao acao-centro" onClick={aoAcompanhar}>
        Acompanhar pedido
      </button>
    </div>
  );
}
