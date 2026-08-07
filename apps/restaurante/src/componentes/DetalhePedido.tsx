import { type Pedido, type StatusPedido, formatarBRL, proximosStatus } from '@pedeja/domain';
import { useEffect, useRef, useState } from 'react';
import { ACAO_STATUS, ROTULO_PAGAMENTO, ROTULO_STATUS } from '../lib/rotulos.js';
import { formatarEspera, minutosDesde } from '../lib/tempo.js';

type Props = {
  pedido: Pedido;
  aoFechar: () => void;
  aoMudarStatus: (novo: StatusPedido) => Promise<void>;
};

export function DetalhePedido({ pedido, aoFechar, aoMudarStatus }: Props) {
  const [ocupado, setOcupado] = useState<StatusPedido | null>(null);
  const opcoes = proximosStatus(pedido.status, 'RESTAURANTE');
  const espera = formatarEspera(minutosDesde(pedido.criadoEm));

  const ref = useRef<HTMLDialogElement>(null);

  // <dialog> nativo cuida de Esc, foco preso e inerte do resto da pagina.
  // O fechar-ao-tocar-fora fica aqui (e nao num onClick no JSX) porque so o
  // proprio elemento sabe distinguir um toque no backdrop de um toque na folha.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();
    const forouFolha = (e: MouseEvent) => {
      if (e.target === el) aoFechar();
    };
    el.addEventListener('click', forouFolha);
    return () => el.removeEventListener('click', forouFolha);
  }, [aoFechar]);

  async function acionar(novo: StatusPedido) {
    setOcupado(novo);
    try {
      await aoMudarStatus(novo);
    } finally {
      setOcupado(null);
    }
  }

  return (
    <dialog
      ref={ref}
      className="fundo"
      aria-label={`Pedido ${pedido.numero}`}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
    >
      <div className="folha">
        <div className="puxador" />

        <h2>
          #{String(pedido.numero).padStart(3, '0')} · {pedido.clienteNome}
        </h2>
        <p className="folha-meta">
          {ROTULO_STATUS[pedido.status]} · há {espera.valor}
          {espera.unidade && ` ${espera.unidade}`} · {pedido.clienteTelefone}
        </p>

        {pedido.itens.map((item, i) => (
          <div className="item" key={`${item.produtoId}-${i}`}>
            <span className="item-q">{item.quantidade}×</span>
            <div>
              <div className="item-n">{item.nomeProduto}</div>
              {item.adicionais.length > 0 && (
                <p className="item-ad">+ {item.adicionais.map((a) => a.nome).join(', ')}</p>
              )}
              {item.observacao && <p className="item-obs">“{item.observacao}”</p>}
            </div>
            <span className="item-v">{formatarBRL(item.subtotal)}</span>
          </div>
        ))}

        <div className="bloco">
          <div className="conta">
            <span>Subtotal</span>
            <span>{formatarBRL(pedido.subtotal)}</span>
          </div>
          {pedido.tipoEntrega === 'ENTREGA' && (
            <div className="conta">
              <span>Entrega{pedido.distanciaKm !== null && ` · ${pedido.distanciaKm} km`}</span>
              <span>{pedido.frete === 0 ? 'Grátis' : formatarBRL(pedido.frete)}</span>
            </div>
          )}
          <div className="conta conta-total">
            <span>Total</span>
            <span>{formatarBRL(pedido.total)}</span>
          </div>
        </div>

        <div className="bloco">
          <p className="bloco-t">Pagamento</p>
          <p>
            {ROTULO_PAGAMENTO[pedido.formaPagamento]}
            {pedido.trocoPara !== null && ` · troco para ${formatarBRL(pedido.trocoPara)}`}
          </p>
        </div>

        {pedido.endereco && (
          <div className="bloco">
            <p className="bloco-t">Entregar em</p>
            <p>
              {pedido.endereco.logradouro}, {pedido.endereco.numero}
              {pedido.endereco.complemento && ` — ${pedido.endereco.complemento}`}
              <br />
              {pedido.endereco.bairro} · {pedido.endereco.cidade}/{pedido.endereco.uf}
            </p>
          </div>
        )}

        <div className="acoes">
          {opcoes.map((novo) => (
            <button
              type="button"
              key={novo}
              className="acao"
              data-tom={novo === 'CANCELADO' ? 'perigo' : undefined}
              disabled={ocupado !== null}
              onClick={() => void acionar(novo)}
            >
              {ocupado === novo ? 'Salvando…' : ACAO_STATUS[novo]}
            </button>
          ))}
          <button type="button" className="acao" data-tom="discreto" onClick={aoFechar}>
            Fechar
          </button>
        </div>
      </div>
    </dialog>
  );
}
