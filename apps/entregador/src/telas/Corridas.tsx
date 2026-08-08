import { type Corrida, getProvider } from '@pedeja/data';
import { type Pedido, deveEnviarLocalizacao, formatarBRL } from '@pedeja/domain';
import { useCallback, useEffect, useState } from 'react';
import { seguirEEnviar } from '../lib/gps.js';
import { linkNavegacao } from '../lib/mapas.js';

type Props = { entregadorId: string; aoAvisar: (t: string, erro?: boolean) => void };

/** Deep link: a navegação passo a passo fica com o app de mapas do aparelho. */
const linkMapa = (p: Pedido): string => (p.endereco ? linkNavegacao(p.endereco.coordenada) : '');

export function Corridas({ entregadorId, aoAvisar }: Props) {
  const [ativa, setAtiva] = useState<Pedido | null>(null);
  const [disponiveis, setDisponiveis] = useState<Corrida[] | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const p = getProvider();
    const [emRota, lista] = await Promise.all([
      p.delivery.corridaAtiva(entregadorId),
      p.delivery.corridasDisponiveis(),
    ]);
    setAtiva(emRota);
    setDisponiveis(lista);
  }, [entregadorId]);

  useEffect(() => {
    void carregar();
    return getProvider().realtime.assinarCorridas(() => void carregar());
  }, [carregar]);

  // Rastreamento: liga ao entrar em rota e desliga sozinho ao concluir.
  useEffect(() => {
    if (!ativa || !deveEnviarLocalizacao(ativa.status)) return;
    return seguirEEnviar(ativa.id, (msg) => aoAvisar(msg, true));
  }, [ativa, aoAvisar]);

  async function aceitar(pedidoId: string) {
    setOcupado(true);
    try {
      const pedido = await getProvider().delivery.aceitarCorrida(pedidoId, entregadorId);
      if (!pedido) {
        aoAvisar('Outro entregador pegou essa corrida antes', true);
      } else {
        aoAvisar(`Corrida #${pedido.numero} é sua`);
      }
      await carregar();
    } catch (e) {
      aoAvisar(e instanceof Error ? e.message : 'Não foi possível aceitar', true);
    } finally {
      setOcupado(false);
    }
  }

  async function concluir() {
    if (!ativa) return;
    setOcupado(true);
    try {
      await getProvider().orders.mudarStatus(ativa.id, 'ENTREGUE', 'ENTREGADOR');
      aoAvisar(`Entrega #${ativa.numero} concluída`);
      await carregar();
    } catch (e) {
      aoAvisar(e instanceof Error ? e.message : 'Não foi possível concluir', true);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <header className="topo">
        <h1>Corridas</h1>
        <p>
          {ativa ? 'Você tem uma entrega em andamento' : 'Pedidos prontos esperando entregador'}
        </p>
      </header>

      <div className="pagina">
        {ativa && (
          <div className="ativa">
            <p className="ativa-rotulo">Entrega em andamento</p>
            <h2>
              #{String(ativa.numero).padStart(3, '0')} · {ativa.clienteNome}
            </h2>
            <p>
              {ativa.endereco
                ? `${ativa.endereco.logradouro}, ${ativa.endereco.numero}${
                    ativa.endereco.complemento ? ` — ${ativa.endereco.complemento}` : ''
                  } · ${ativa.endereco.bairro}`
                : 'Sem endereço'}
            </p>
            <p style={{ marginTop: 8 }}>
              {formatarBRL(ativa.total)} · {ativa.formaPagamento}
              {ativa.trocoPara !== null && ` · troco para ${formatarBRL(ativa.trocoPara)}`}
            </p>

            {ativa.endereco && (
              <>
                <a className="mapa" href={linkMapa(ativa)} target="_blank" rel="noreferrer">
                  Abrir navegação
                </a>
                <p style={{ margin: '10px 0 0', fontSize: '0.88rem', color: '#c6dbcd' }}>
                  Sua posição está sendo enviada ao cliente enquanto a entrega estiver em rota.
                </p>
              </>
            )}
            <button
              type="button"
              className="acao"
              disabled={ocupado}
              onClick={() => void concluir()}
            >
              {ocupado ? 'Salvando…' : 'Confirmar entrega'}
            </button>
          </div>
        )}

        {!disponiveis && (
          <div className="vazio">
            <p>Carregando corridas…</p>
          </div>
        )}

        {disponiveis?.length === 0 && !ativa && (
          <div className="vazio">
            <p className="vazio-t">Nenhuma corrida agora</p>
            <p>Assim que um pedido ficar pronto, ele aparece aqui sozinho.</p>
          </div>
        )}

        {!ativa &&
          disponiveis?.map((c) => (
            <article className="corrida" key={c.pedidoId}>
              <div className="corrida-topo">
                <span className="corrida-num">#{String(c.numero).padStart(3, '0')}</span>
                <span className="ganho">{formatarBRL(c.ganho)}</span>
              </div>
              <p className="corrida-loja">{c.estabelecimentoNome}</p>
              <p className="corrida-end">{c.enderecoResumo}</p>
              <span className="corrida-dist">{c.distanciaKm} km de entrega</span>
              <button
                type="button"
                className="acao"
                disabled={ocupado}
                onClick={() => void aceitar(c.pedidoId)}
              >
                Aceitar corrida
              </button>
            </article>
          ))}

        {ativa && disponiveis && disponiveis.length > 0 && (
          <p className="dica">
            {disponiveis.length} corrida(s) esperando. Conclua a atual para aceitar outra.
          </p>
        )}
      </div>
    </>
  );
}
