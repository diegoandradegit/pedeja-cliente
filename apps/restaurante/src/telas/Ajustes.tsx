import { type EntregadorDaLoja, getProvider } from '@pedeja/data';
import {
  type ConfigFrete,
  type Estabelecimento,
  type FaixaHorario,
  centavosParaReais,
  reaisParaCentavos,
} from '@pedeja/domain';
import { useCallback, useEffect, useState } from 'react';

type Props = {
  estabelecimentoId: string;
  aoAvisar: (t: string, erro?: boolean) => void;
  aoSair: () => void;
};

type Secao = 'loja' | 'entrega' | 'horario' | 'entregadores';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const emReais = (c: number | null) =>
  c === null ? '' : centavosParaReais(c).toFixed(2).replace('.', ',');
const paraCentavos = (s: string) => reaisParaCentavos(Number(s.replace(',', '.')) || 0);

export function Ajustes({ estabelecimentoId, aoAvisar, aoSair }: Props) {
  const [secao, setSecao] = useState<Secao>('loja');
  const [loja, setLoja] = useState<Estabelecimento | null>(null);
  const [frete, setFrete] = useState<ConfigFrete | null>(null);
  const [faixas, setFaixas] = useState<
    Record<number, { abre: string; fecha: string; aberto: boolean }>
  >({});
  const [entregadores, setEntregadores] = useState<EntregadorDaLoja[]>([]);
  const [convite, setConvite] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    const p = getProvider();
    const [e, c] = await Promise.all([
      p.menu.obterEstabelecimento(estabelecimentoId),
      p.orders.obterConfigFrete(estabelecimentoId),
    ]);
    setLoja(e);
    setFrete(c);

    const grade: Record<number, { abre: string; fecha: string; aberto: boolean }> = {};
    for (let d = 0; d < 7; d += 1) {
      const f = e?.horarios.find((h) => h.diaSemana === d);
      grade[d] = { abre: f?.abre ?? '18:00', fecha: f?.fecha ?? '23:00', aberto: Boolean(f) };
    }
    setFaixas(grade);

    try {
      setEntregadores(await p.delivery.entregadoresDaLoja(estabelecimentoId));
    } catch {
      setEntregadores([]);
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function tentar(acao: () => Promise<void>, sucesso: string) {
    try {
      await acao();
      await carregar();
      aoAvisar(sucesso);
    } catch (e) {
      aoAvisar(e instanceof Error ? e.message : 'Não foi possível salvar', true);
    }
  }

  async function pedidoDeTeste() {
    setCriando(true);
    try {
      const p = getProvider();
      const produtos = (await p.menu.listarProdutos(estabelecimentoId)).filter((x) => x.ativo);
      const primeiro = produtos[0];
      if (!primeiro) throw new Error('Cadastre ao menos um produto disponível');
      const nomes = ['Marcos', 'Juliana', 'Ana Paula', 'Rafael', 'Bruno'];
      const pedido = await p.orders.criar({
        estabelecimentoId,
        itens: [{ produtoId: primeiro.id, quantidade: 1, adicionaisIds: [] }],
        tipoEntrega: 'ENTREGA',
        endereco: {
          cep: '87020000',
          logradouro: 'Av. Brasil',
          numero: String(100 + Math.floor(Math.random() * 900)),
          bairro: 'Centro',
          cidade: 'Maringá',
          uf: 'PR',
          coordenada: { lat: -23.425, lng: -51.938 },
        },
        formaPagamento: 'PIX',
        trocoPara: null,
        clienteNome: nomes[Math.floor(Math.random() * nomes.length)] ?? 'Cliente',
        clienteTelefone: '44999990000',
      });
      aoAvisar(`Pedido #${pedido.numero} criado — veja em Comandas`);
    } catch (e) {
      aoAvisar(e instanceof Error ? e.message : 'Não foi possível criar', true);
    } finally {
      setCriando(false);
    }
  }

  return (
    <>
      <header className="topo">
        <h1 className="topo-titulo">Ajustes</h1>
        <p className="topo-sub">{loja?.nome ?? 'Carregando…'}</p>
        <fieldset className="filtros">
          <legend className="oculto">Seção de ajustes</legend>
          {(['loja', 'entrega', 'horario', 'entregadores'] as Secao[]).map((s) => (
            <button
              key={s}
              type="button"
              className="filtro"
              aria-pressed={secao === s}
              onClick={() => setSecao(s)}
            >
              {s === 'horario' ? 'horário' : s}
            </button>
          ))}
        </fieldset>
      </header>

      <div className="pagina">
        {/* ── Loja ─────────────────────────────────────────────────────── */}
        {secao === 'loja' && loja && (
          <>
            <div className="grupo">
              <label htmlFor="l-nome">Nome do restaurante</label>
              <input
                id="l-nome"
                value={loja.nome}
                onChange={(e) => setLoja({ ...loja, nome: e.target.value })}
              />
            </div>
            <div className="grupo">
              <label htmlFor="l-desc">Descrição</label>
              <input
                id="l-desc"
                value={loja.descricao}
                onChange={(e) => setLoja({ ...loja, descricao: e.target.value })}
              />
            </div>
            <div className="grupo">
              <label htmlFor="l-end">Endereço</label>
              <input
                id="l-end"
                value={loja.endereco}
                onChange={(e) => setLoja({ ...loja, endereco: e.target.value })}
              />
            </div>
            <div className="grupo">
              <label htmlFor="l-logo">Logo (endereço da imagem)</label>
              <input
                id="l-logo"
                value={loja.imagem ?? ''}
                onChange={(e) => setLoja({ ...loja, imagem: e.target.value || null })}
              />
            </div>
            <div className="grupo">
              <label htmlFor="l-capa">Capa (endereço da imagem)</label>
              <input
                id="l-capa"
                value={loja.capa ?? ''}
                onChange={(e) => setLoja({ ...loja, capa: e.target.value || null })}
              />
            </div>
            <div className="grupo">
              <label htmlFor="l-retirada">Aceita retirada no local</label>
              <select
                id="l-retirada"
                value={loja.aceitaRetirada ? 'sim' : 'nao'}
                onChange={(e) => setLoja({ ...loja, aceitaRetirada: e.target.value === 'sim' })}
              >
                <option value="sim">Sim</option>
                <option value="nao">Não, só entrega</option>
              </select>
            </div>
            <div className="grupo">
              <label htmlFor="l-regra">Preço do item com mais de um sabor</label>
              <select
                id="l-regra"
                value={loja.regraPrecoFracionado}
                onChange={(e) =>
                  setLoja({ ...loja, regraPrecoFracionado: e.target.value as 'MAIOR' | 'MEDIA' })
                }
              >
                <option value="MAIOR">Cobrar o sabor mais caro</option>
                <option value="MEDIA">Cobrar a média dos sabores</option>
              </select>
              <p className="dica">
                Vale para pizza meio a meio. Numa pizza de R$ 49 com uma de R$ 46, a primeira regra
                cobra R$ 49 e a segunda R$ 47,50.
              </p>
            </div>
            <div className="grupo">
              <label htmlFor="l-lat">Coordenadas do restaurante</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  id="l-lat"
                  inputMode="decimal"
                  value={String(loja.coordenada.lat)}
                  onChange={(e) =>
                    setLoja({
                      ...loja,
                      coordenada: { ...loja.coordenada, lat: Number(e.target.value) || 0 },
                    })
                  }
                />
                <input
                  aria-label="Longitude"
                  inputMode="decimal"
                  value={String(loja.coordenada.lng)}
                  onChange={(e) =>
                    setLoja({
                      ...loja,
                      coordenada: { ...loja.coordenada, lng: Number(e.target.value) || 0 },
                    })
                  }
                />
              </div>
              <p className="dica">Latitude e longitude. É daqui que sai a distância do frete.</p>
            </div>

            <button
              type="button"
              className="botao-claro"
              onClick={() =>
                void tentar(
                  () =>
                    getProvider()
                      .menu.salvarEstabelecimento(loja)
                      .then(() => undefined),
                  'Restaurante salvo',
                )
              }
            >
              Salvar restaurante
            </button>

            <h2 className="secao-t">Testes</h2>
            <button
              type="button"
              className="botao-vazado"
              disabled={criando}
              onClick={() => void pedidoDeTeste()}
            >
              {criando ? 'Criando…' : 'Criar pedido de exemplo'}
            </button>

            <h2 className="secao-t">Conta</h2>
            <button type="button" className="botao-vazado" onClick={aoSair}>
              Sair do painel
            </button>
          </>
        )}

        {/* ── Entrega ──────────────────────────────────────────────────── */}
        {secao === 'entrega' && frete && (
          <>
            <div className="grupo">
              <label htmlFor="f-taxa">Taxa fixa (R$)</label>
              <input
                id="f-taxa"
                inputMode="decimal"
                value={emReais(frete.taxaFixa)}
                onChange={(e) => setFrete({ ...frete, taxaFixa: paraCentavos(e.target.value) })}
              />
            </div>
            <div className="grupo">
              <label htmlFor="f-km">Adicional por quilômetro (R$)</label>
              <input
                id="f-km"
                inputMode="decimal"
                value={emReais(frete.precoPorKm)}
                onChange={(e) => setFrete({ ...frete, precoPorKm: paraCentavos(e.target.value) })}
              />
            </div>
            <div className="grupo">
              <label htmlFor="f-raio">Raio máximo de entrega (km)</label>
              <input
                id="f-raio"
                inputMode="decimal"
                value={String(frete.raioMaximoKm)}
                onChange={(e) =>
                  setFrete({
                    ...frete,
                    raioMaximoKm: Number(e.target.value.replace(',', '.')) || 0,
                  })
                }
              />
              <p className="dica">Endereços fora do raio não conseguem fechar pedido.</p>
            </div>
            <div className="grupo">
              <label htmlFor="f-gratis">Frete grátis a partir de (R$)</label>
              <input
                id="f-gratis"
                inputMode="decimal"
                value={emReais(frete.freteGratisAcimaDe)}
                placeholder="deixe vazio para nunca"
                onChange={(e) =>
                  setFrete({
                    ...frete,
                    freteGratisAcimaDe:
                      e.target.value.trim() === '' ? null : paraCentavos(e.target.value),
                  })
                }
              />
            </div>
            <button
              type="button"
              className="botao-claro"
              onClick={() => {
                if (frete.raioMaximoKm <= 0) return aoAvisar('Informe um raio válido', true);
                void tentar(
                  () =>
                    getProvider()
                      .orders.salvarConfigFrete(frete)
                      .then(() => undefined),
                  'Regras de entrega salvas',
                );
              }}
            >
              Salvar regras de entrega
            </button>
          </>
        )}

        {/* ── Horário ──────────────────────────────────────────────────── */}
        {secao === 'horario' && (
          <>
            <p className="dica" style={{ marginBottom: 16 }}>
              Faixa que passa da meia-noite funciona: abrir 18:00 e fechar 02:00 mantém a loja
              aberta na madrugada seguinte.
            </p>
            {DIAS.map((nome, dia) => {
              const f = faixas[dia];
              if (!f) return null;
              return (
                <div key={nome} className="linha-item" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ minWidth: 78 }}>
                    <div className="li-nome">{nome}</div>
                  </div>
                  <button
                    type="button"
                    className="filtro"
                    aria-pressed={f.aberto}
                    onClick={() => setFaixas({ ...faixas, [dia]: { ...f, aberto: !f.aberto } })}
                  >
                    {f.aberto ? 'aberto' : 'fechado'}
                  </button>
                  {f.aberto && (
                    <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                      <input
                        type="time"
                        aria-label={`Abre ${nome}`}
                        value={f.abre}
                        onChange={(e) =>
                          setFaixas({ ...faixas, [dia]: { ...f, abre: e.target.value } })
                        }
                        style={{
                          padding: 8,
                          background: 'var(--trilho-alto)',
                          color: 'var(--papel)',
                          border: '1px solid #343a44',
                          borderRadius: 4,
                        }}
                      />
                      <input
                        type="time"
                        aria-label={`Fecha ${nome}`}
                        value={f.fecha}
                        onChange={(e) =>
                          setFaixas({ ...faixas, [dia]: { ...f, fecha: e.target.value } })
                        }
                        style={{
                          padding: 8,
                          background: 'var(--trilho-alto)',
                          color: 'var(--papel)',
                          border: '1px solid #343a44',
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ height: 16 }} />
            <button
              type="button"
              className="botao-claro"
              onClick={() => {
                const lista: FaixaHorario[] = Object.entries(faixas)
                  .filter(([, f]) => f.aberto)
                  .map(([d, f]) => ({ diaSemana: Number(d), abre: f.abre, fecha: f.fecha }));
                void tentar(
                  () => getProvider().menu.salvarHorarios(estabelecimentoId, lista),
                  'Horário salvo',
                );
              }}
            >
              Salvar horário
            </button>
          </>
        )}

        {/* ── Entregadores ─────────────────────────────────────────────── */}
        {secao === 'entregadores' && (
          <>
            <p className="dica" style={{ marginBottom: 14 }}>
              Você gera um código, o entregador baixa o app e cria a conta dele com esse código.
              Assim ninguém precisa te passar senha, e você não cria conta no nome de outra pessoa.
            </p>

            {convite && (
              <div
                className="linha-item"
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}
              >
                <div className="li-desc">Código gerado — vale por 7 dias, uso único</div>
                <div
                  style={{
                    fontFamily: 'var(--fonte-dado)',
                    fontSize: '1.9rem',
                    letterSpacing: '0.12em',
                  }}
                >
                  {convite}
                </div>
                <button
                  type="button"
                  className="botao-vazado"
                  onClick={() => {
                    void navigator.clipboard?.writeText(convite);
                    aoAvisar('Código copiado');
                  }}
                >
                  Copiar código
                </button>
              </div>
            )}

            <button
              type="button"
              className="botao-claro"
              onClick={() =>
                void (async () => {
                  try {
                    setConvite(await getProvider().delivery.gerarConvite(estabelecimentoId));
                  } catch (e) {
                    aoAvisar(e instanceof Error ? e.message : 'Não foi possível gerar', true);
                  }
                })()
              }
            >
              Gerar código de convite
            </button>

            <h2 className="secao-t">Entregadores</h2>
            {entregadores.length === 0 && (
              <p className="dica">Nenhum entregador cadastrado ainda.</p>
            )}
            {entregadores.map((e) => (
              <div key={e.usuarioId} className={`linha-item ${e.ativo ? '' : 'inativo'}`}>
                <div>
                  <div className="li-nome">{e.nome}</div>
                  <p className="li-desc">{e.telefone || 'sem telefone'}</p>
                </div>
                <button
                  type="button"
                  className="filtro"
                  style={{ marginLeft: 'auto' }}
                  aria-pressed={e.ativo}
                  onClick={() =>
                    void tentar(
                      () => getProvider().delivery.definirEntregadorAtivo(e.usuarioId, !e.ativo),
                      e.ativo ? 'Entregador desativado' : 'Entregador ativado',
                    )
                  }
                >
                  {e.ativo ? 'ativo' : 'inativo'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
