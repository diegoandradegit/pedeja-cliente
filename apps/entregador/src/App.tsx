import { type Corrida, getProvider } from '@pedeja/data';
import { formatarBRL } from '@pedeja/domain';
import { useEffect, useState } from 'react';

export function App() {
  const [corridas, setCorridas] = useState<Corrida[] | null>(null);

  useEffect(() => {
    const p = getProvider();
    const carregar = () => {
      p.delivery
        .corridasDisponiveis()
        .then(setCorridas)
        .catch(() => setCorridas([]));
    };
    carregar();
    return p.realtime.assinarCorridas(carregar);
  }, []);

  return (
    <main>
      <h1>Corridas</h1>
      <p className="sub">Pedidos prontos aguardando entregador</p>

      {!corridas && <div className="vazio">Carregando…</div>}
      {corridas?.length === 0 && (
        <div className="vazio">Nenhuma corrida disponível no momento.</div>
      )}

      {corridas?.map((c) => (
        <article className="card" key={c.pedidoId}>
          <div className="linha">
            <strong>
              #{c.numero} · {c.estabelecimentoNome}
            </strong>
            <span className="tag">{formatarBRL(c.ganho)}</span>
          </div>
          <p className="sub" style={{ margin: '6px 0 0' }}>
            {c.enderecoResumo} · {c.distanciaKm} km
          </p>
        </article>
      ))}

      <p className="fase">
        Fase 0 concluída. Já escutando o canal de corridas em tempo real (mock via BroadcastChannel
        — abra o painel em outra aba e mande um pedido para PRONTO).
        <br />
        Próximo: Fase 5 (aceite com trava, navegação, extrato).
      </p>
    </main>
  );
}
