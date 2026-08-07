import { getProvider } from '@pedeja/data';
import { type Pedido, type StatusPedido, formatarBRL } from '@pedeja/domain';
import { useEffect, useState } from 'react';

const COLUNAS: StatusPedido[] = ['PENDENTE', 'ACEITO', 'EM_PREPARO', 'PRONTO'];
const ESTABELECIMENTO = 'e1';

export function App() {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

  useEffect(() => {
    const p = getProvider();
    const carregar = () => {
      p.orders
        .listarPorEstabelecimento(ESTABELECIMENTO, true)
        .then(setPedidos)
        .catch(() => setPedidos([]));
    };
    carregar();
    return p.realtime.assinarEstabelecimento(ESTABELECIMENTO, carregar);
  }, []);

  return (
    <main>
      <h1>Painel do restaurante</h1>
      <p className="sub">Pedidos ativos · atualiza em tempo real</p>

      {!pedidos && <div className="vazio">Carregando…</div>}
      {pedidos?.length === 0 && <div className="vazio">Nenhum pedido ativo.</div>}

      {COLUNAS.map((coluna) => {
        const daColuna = pedidos?.filter((p) => p.status === coluna) ?? [];
        if (daColuna.length === 0) return null;
        return (
          <section key={coluna}>
            <p className="sub" style={{ margin: '20px 0 8px', fontWeight: 600 }}>
              {coluna}
            </p>
            {daColuna.map((p) => (
              <article className="card" key={p.id}>
                <div className="linha">
                  <strong>
                    #{p.numero} · {p.clienteNome}
                  </strong>
                  <span className="tag">{formatarBRL(p.total)}</span>
                </div>
                <p className="sub" style={{ margin: '6px 0 0' }}>
                  {p.itens.length} item(ns) · {p.tipoEntrega} · {p.formaPagamento}
                </p>
              </article>
            ))}
          </section>
        );
      })}

      <p className="fase">
        Fase 0 concluída. Kanban lendo do provider <code>mock</code>, já assinando o canal do
        estabelecimento.
        <br />
        Próximo: Fase 3 (drag-and-drop, gestor de cardápio, config de frete e horários).
      </p>
    </main>
  );
}
