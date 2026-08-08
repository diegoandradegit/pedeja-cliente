import { getProvider } from '@pedeja/data';
import {
  type ConfigFrete,
  type Estabelecimento,
  centavosParaReais,
  reaisParaCentavos,
} from '@pedeja/domain';
import { useCallback, useEffect, useState } from 'react';

type Props = {
  estabelecimentoId: string;
  aoAvisar: (texto: string, erro?: boolean) => void;
  aoSair: () => void;
};

const paraCampo = (c: number | null): string =>
  c === null ? '' : centavosParaReais(c).toFixed(2).replace('.', ',');

const paraCentavos = (s: string): number => reaisParaCentavos(Number(s.replace(',', '.')) || 0);

export function Ajustes({ estabelecimentoId, aoAvisar, aoSair }: Props) {
  const [loja, setLoja] = useState<Estabelecimento | null>(null);
  const [config, setConfig] = useState<ConfigFrete | null>(null);
  const [taxa, setTaxa] = useState('');
  const [porKm, setPorKm] = useState('');
  const [raio, setRaio] = useState('');
  const [gratis, setGratis] = useState('');
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    const p = getProvider();
    const [e, c] = await Promise.all([
      p.menu.obterEstabelecimento(estabelecimentoId),
      p.orders.obterConfigFrete(estabelecimentoId),
    ]);
    setLoja(e);
    setConfig(c);
    setTaxa(paraCampo(c.taxaFixa));
    setPorKm(paraCampo(c.precoPorKm));
    setRaio(String(c.raioMaximoKm));
    setGratis(paraCampo(c.freteGratisAcimaDe));
  }, [estabelecimentoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvarFrete() {
    if (!config) return;
    const raioNum = Number(raio.replace(',', '.'));
    if (!Number.isFinite(raioNum) || raioNum <= 0) return aoAvisar('Informe um raio válido', true);

    try {
      await getProvider().orders.salvarConfigFrete({
        estabelecimentoId,
        taxaFixa: paraCentavos(taxa),
        precoPorKm: paraCentavos(porKm),
        raioMaximoKm: raioNum,
        freteGratisAcimaDe: gratis.trim() === '' ? null : paraCentavos(gratis),
      });
      aoAvisar('Regras de entrega salvas');
    } catch (erro) {
      aoAvisar(erro instanceof Error ? erro.message : 'Não foi possível salvar', true);
    }
  }

  /**
   * Atalho de desenvolvimento: monta um pedido real passando pela mesma RPC de
   * criacao que o app do cliente usa. Some quando o Supabase entrar.
   */
  async function pedidoDeTeste() {
    setCriando(true);
    try {
      const p = getProvider();
      const produtos = (await p.menu.listarProdutos(estabelecimentoId)).filter((x) => x.ativo);
      const primeiro = produtos[0];
      if (!primeiro) throw new Error('Cadastre ao menos um produto disponível');

      const nomes = ['Marcos', 'Juliana', 'Ana Paula', 'Rafael', 'Cláudia', 'Bruno'];
      const escolhido = nomes[Math.floor(Math.random() * nomes.length)] ?? 'Cliente';
      const segundo = produtos[1];

      const pedido = await p.orders.criar({
        estabelecimentoId,
        itens: [
          {
            produtoId: primeiro.id,
            quantidade: 1 + Math.floor(Math.random() * 2),
            adicionaisIds: [],
          },
          ...(segundo ? [{ produtoId: segundo.id, quantidade: 1, adicionaisIds: [] }] : []),
        ],
        tipoEntrega: 'ENTREGA',
        endereco: {
          cep: '87020-000',
          logradouro: 'Av. Brasil',
          numero: String(100 + Math.floor(Math.random() * 900)),
          bairro: 'Centro',
          cidade: 'Maringá',
          uf: 'PR',
          coordenada: { lat: -23.425, lng: -51.938 },
        },
        formaPagamento: 'PIX',
        trocoPara: null,
        clienteNome: escolhido,
        clienteTelefone: '44999990000',
      });
      aoAvisar(`Pedido #${pedido.numero} criado — veja em Comandas`);
    } catch (erro) {
      aoAvisar(erro instanceof Error ? erro.message : 'Não foi possível criar', true);
    } finally {
      setCriando(false);
    }
  }

  return (
    <>
      <header className="topo">
        <h1 className="topo-titulo">Ajustes</h1>
        <p className="topo-sub">{loja?.nome ?? 'Carregando…'}</p>
      </header>

      <div className="pagina">
        <h2 className="secao-t">Entrega</h2>

        <div className="grupo">
          <label htmlFor="taxa">Taxa fixa (R$)</label>
          <input
            id="taxa"
            inputMode="decimal"
            value={taxa}
            onChange={(e) => setTaxa(e.target.value)}
          />
        </div>

        <div className="grupo">
          <label htmlFor="km">Adicional por quilômetro (R$)</label>
          <input
            id="km"
            inputMode="decimal"
            value={porKm}
            onChange={(e) => setPorKm(e.target.value)}
          />
        </div>

        <div className="grupo">
          <label htmlFor="raio">Raio máximo de entrega (km)</label>
          <input
            id="raio"
            inputMode="decimal"
            value={raio}
            onChange={(e) => setRaio(e.target.value)}
          />
          <p className="dica">Endereços fora do raio não conseguem fechar pedido.</p>
        </div>

        <div className="grupo">
          <label htmlFor="gratis">Frete grátis a partir de (R$)</label>
          <input
            id="gratis"
            inputMode="decimal"
            value={gratis}
            onChange={(e) => setGratis(e.target.value)}
            placeholder="deixe vazio para nunca"
          />
        </div>

        <button type="button" className="botao-claro" onClick={() => void salvarFrete()}>
          Salvar regras de entrega
        </button>

        <h2 className="secao-t">Horário</h2>
        <p className="dica">
          {loja?.horarios[0]
            ? `Abre ${loja.horarios[0].abre} e fecha ${loja.horarios[0].fecha}, todos os dias.`
            : 'Sem horário cadastrado.'}{' '}
          A edição por dia entra junto com o cadastro da loja.
        </p>

        <h2 className="secao-t">Testes</h2>
        <p className="dica">
          Cria um pedido passando pelo mesmo caminho do app do cliente — inclusive o cálculo de
          preço e frete no servidor. Sai do ar quando o banco entrar.
        </p>
        <div style={{ height: 10 }} />
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
      </div>
    </>
  );
}
