import { getProvider } from '@pedeja/data';
import type { Pedido, StatusPedido } from '@pedeja/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DetalhePedido } from '../componentes/DetalhePedido.js';
import { Ticket } from '../componentes/Ticket.js';
import { COLUNAS, ROTULO_STATUS } from '../lib/rotulos.js';
import { bipe, vibrar } from '../lib/som.js';
import { minutosDesde } from '../lib/tempo.js';

type Props = { estabelecimentoId: string; aoAvisar: (texto: string, erro?: boolean) => void };

export function Pedidos({ estabelecimentoId, aoAvisar }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [filtro, setFiltro] = useState<StatusPedido | 'TODOS'>('TODOS');
  const [aberto, setAberto] = useState<Pedido | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const conhecidos = useRef<Set<string>>(new Set());

  const carregar = useCallback(async () => {
    const lista = await getProvider().orders.listarPorEstabelecimento(estabelecimentoId, true);
    setPedidos(lista);
    return lista;
  }, [estabelecimentoId]);

  useEffect(() => {
    void carregar().then((lista) => {
      for (const p of lista) conhecidos.current.add(p.id);
    });
  }, [carregar]);

  // Realtime: recarrega e avisa quando entra pedido que ainda nao conheciamos.
  useEffect(() => {
    return getProvider().realtime.assinarEstabelecimento(estabelecimentoId, (evento) => {
      void carregar().then((lista) => {
        for (const p of lista) {
          if (!conhecidos.current.has(p.id)) {
            conhecidos.current.add(p.id);
            if (evento.tipo === 'PEDIDO_CRIADO') {
              bipe();
              vibrar();
            }
          }
        }
      });
    });
  }, [estabelecimentoId, carregar]);

  // O relogio de cada ticket precisa andar sozinho.
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);

  async function mudarStatus(pedido: Pedido, novo: StatusPedido) {
    try {
      const atualizado = await getProvider().orders.mudarStatus(pedido.id, novo, 'RESTAURANTE');
      await carregar();
      setAberto(null);
      aoAvisar(`Pedido #${atualizado.numero} · ${ROTULO_STATUS[novo].toLowerCase()}`);
    } catch (erro) {
      aoAvisar(erro instanceof Error ? erro.message : 'Não foi possível mudar o status', true);
    }
  }

  const visiveis = (pedidos ?? [])
    .filter((p) => filtro === 'TODOS' || p.status === filtro)
    .sort((a, b) => minutosDesde(b.criadoEm, agora) - minutosDesde(a.criadoEm, agora));

  const contar = (s: StatusPedido) => (pedidos ?? []).filter((p) => p.status === s).length;

  return (
    <>
      <header className="topo">
        <h1 className="topo-titulo">Comandas</h1>
        <p className="topo-sub">Mais antigo primeiro · toque para agir</p>

        <fieldset className="filtros">
          <legend className="oculto">Filtrar por etapa</legend>
          <button
            type="button"
            className="filtro"
            aria-pressed={filtro === 'TODOS'}
            onClick={() => setFiltro('TODOS')}
          >
            Tudo<span className="filtro-n">{pedidos?.length ?? 0}</span>
          </button>
          {COLUNAS.filter((s) => contar(s) > 0 || filtro === s).map((s) => (
            <button
              type="button"
              key={s}
              className="filtro"
              aria-pressed={filtro === s}
              onClick={() => setFiltro(s)}
            >
              {ROTULO_STATUS[s]}
              <span className="filtro-n">{contar(s)}</span>
            </button>
          ))}
        </fieldset>
      </header>

      {!pedidos && (
        <div className="vazio">
          <p>Carregando comandas…</p>
        </div>
      )}

      {pedidos && visiveis.length === 0 && (
        <div className="vazio">
          <p className="vazio-t">Trilho vazio</p>
          <p>
            {filtro === 'TODOS'
              ? 'Nenhum pedido em aberto. Crie um pedido de teste em Ajustes para ver o trilho funcionando.'
              : 'Nenhum pedido nesta etapa.'}
          </p>
        </div>
      )}

      <div className="rail">
        {visiveis.map((p) => (
          <Ticket key={p.id} pedido={p} agora={agora} aoAbrir={setAberto} />
        ))}
      </div>

      {aberto && (
        <DetalhePedido
          pedido={pedidos?.find((p) => p.id === aberto.id) ?? aberto}
          aoFechar={() => setAberto(null)}
          aoMudarStatus={(novo) => mudarStatus(aberto, novo)}
        />
      )}
    </>
  );
}
