import { type LinhaExtrato, getProvider } from '@pedeja/data';
import { formatarBRL, somar } from '@pedeja/domain';
import { useEffect, useState } from 'react';

type Props = { entregadorId: string; aoSair: () => void };

type Periodo = { rotulo: string; dias: number };
const PERIODOS: Periodo[] = [
  { rotulo: 'Hoje', dias: 1 },
  { rotulo: '7 dias', dias: 7 },
  { rotulo: '30 dias', dias: 30 },
];

export function Extrato({ entregadorId, aoSair }: Props) {
  const [dias, setDias] = useState(7);
  const [linhas, setLinhas] = useState<LinhaExtrato[] | null>(null);

  useEffect(() => {
    const desde = new Date();
    if (dias === 1) desde.setHours(0, 0, 0, 0);
    else desde.setDate(desde.getDate() - dias);

    getProvider()
      .delivery.extrato(entregadorId, desde.toISOString())
      .then(setLinhas)
      .catch(() => setLinhas([]));
  }, [entregadorId, dias]);

  const total = somar(...(linhas ?? []).map((l) => l.ganho));

  return (
    <>
      <header className="topo">
        <h1>Extrato</h1>
        <p>O que você recebeu pelas entregas</p>
      </header>

      <div className="pagina">
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {PERIODOS.map((p) => (
            <button
              key={p.dias}
              type="button"
              className="acao-vazada"
              style={dias === p.dias ? { borderColor: 'var(--verde)', color: 'var(--verde)' } : {}}
              onClick={() => setDias(p.dias)}
            >
              {p.rotulo}
            </button>
          ))}
        </div>

        {!linhas && <p className="dica">Carregando…</p>}

        {linhas?.length === 0 && (
          <div className="vazio">
            <p className="vazio-t">Nenhuma entrega no período</p>
            <p>As entregas concluídas aparecem aqui com o valor recebido.</p>
          </div>
        )}

        {linhas?.map((l) => (
          <div className="linha-extrato" key={l.pedidoId}>
            <span>
              #{String(l.numero).padStart(3, '0')} ·{' '}
              {new Date(l.em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
            <span>{formatarBRL(l.ganho)}</span>
          </div>
        ))}

        {linhas && linhas.length > 0 && (
          <div className="extrato-total">
            <span>Total</span>
            <span>{formatarBRL(total)}</span>
          </div>
        )}

        <div style={{ height: 32 }} />
        <button type="button" className="acao-vazada" onClick={aoSair}>
          Sair
        </button>
      </div>
    </>
  );
}
