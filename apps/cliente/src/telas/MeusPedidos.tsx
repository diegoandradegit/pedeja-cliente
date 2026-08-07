import { getProvider } from '@pedeja/data';
import { type Pedido, type StatusPedido, formatarBRL } from '@pedeja/domain';
import { useEffect, useState } from 'react';
import { listar } from '../lib/historico.js';

type Props = { aoAbrir: (pedido: Pedido) => void };

const ROTULO: Record<StatusPedido, string> = {
  PENDENTE: 'Aguardando o restaurante',
  ACEITO: 'Aceito',
  EM_PREPARO: 'Preparando',
  PRONTO: 'Pronto',
  AGUARDANDO_ENTREGADOR: 'Aguardando entregador',
  EM_ROTA: 'A caminho',
  ENTREGUE: 'Entregue',
  RETIRADO: 'Retirado',
  CANCELADO: 'Cancelado',
};

const EM_ANDAMENTO: StatusPedido[] = [
  'PENDENTE',
  'ACEITO',
  'EM_PREPARO',
  'PRONTO',
  'AGUARDANDO_ENTREGADOR',
  'EM_ROTA',
];

export function MeusPedidos({ aoAbrir }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

  useEffect(() => {
    const p = getProvider().orders;
    void Promise.all(listar().map((id) => p.obter(id))).then((lista) =>
      setPedidos(lista.filter((x): x is Pedido => x !== null)),
    );
  }, []);

  return (
    <>
      <div className="barra-topo">
        <h1 className="barra-titulo">Meus pedidos</h1>
      </div>

      <div className="pagina">
        {!pedidos && (
          <p className="dica" style={{ marginTop: 16 }}>
            Carregando…
          </p>
        )}

        {pedidos?.length === 0 && (
          <div className="vazio">
            <p className="vazio-t">Nenhum pedido ainda</p>
            <p>
              Os pedidos feitos neste aparelho aparecem aqui. Quando o login entrar, você vai poder
              ver de qualquer celular.
            </p>
          </div>
        )}

        {pedidos?.map((p) => (
          <button type="button" className="loja" key={p.id} onClick={() => aoAbrir(p)}>
            <p className="loja-nome">Pedido #{String(p.numero).padStart(3, '0')}</p>
            <p className="loja-desc">
              {new Date(p.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              {' · '}
              {p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'} · {formatarBRL(p.total)}
            </p>
            <span className="estado" data-fechado={!EM_ANDAMENTO.includes(p.status)}>
              {ROTULO[p.status]}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
