import { type Cotacao, type NovoPedido, getProvider } from '@pedeja/data';
import {
  type Estabelecimento,
  type FormaPagamento,
  type Pedido,
  type TipoEntrega,
  formatarBRL,
  reaisParaCentavos,
} from '@pedeja/domain';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Linha, previaSubtotal } from '../lib/carrinho.js';
import {
  type Coordenada,
  buscarCep,
  formatarCep,
  formatarTelefone,
  localizacaoDoAparelho,
} from '../lib/cep.js';

type Props = {
  loja: Estabelecimento;
  linhas: Linha[];
  aoVoltar: () => void;
  aoTirar: (chave: string) => void;
  aoConfirmar: (pedido: Pedido) => void;
  aoAvisar: (texto: string, erro?: boolean) => void;
};

const PAGAMENTOS: [FormaPagamento, string][] = [
  ['PIX', 'Pix'],
  ['CREDITO', 'Cartão de crédito'],
  ['DEBITO', 'Cartão de débito'],
  ['DINHEIRO', 'Dinheiro'],
];

export function Checkout({ loja, linhas, aoVoltar, aoTirar, aoConfirmar, aoAvisar }: Props) {
  const [tipo, setTipo] = useState<TipoEntrega>(loja.aceitaRetirada ? 'ENTREGA' : 'ENTREGA');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [coord, setCoord] = useState<Coordenada | null>(null);
  const [pagamento, setPagamento] = useState<FormaPagamento>('PIX');
  const [troco, setTroco] = useState('');
  const [cotacao, setCotacao] = useState<Cotacao | null>(null);
  const [erroCotacao, setErroCotacao] = useState<string | null>(null);
  const [buscandoLocal, setBuscandoLocal] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // Só identificadores: o servidor busca os preços no catálogo.
  const itensParaCotar = useMemo(
    () =>
      linhas.map((l) => ({
        produtoId: l.produtoId,
        quantidade: l.quantidade,
        adicionaisIds: l.adicionais.map((a) => a.id),
        ...(l.observacao ? { observacao: l.observacao } : {}),
      })),
    [linhas],
  );

  /** O valor mostrado vem sempre do servidor, nunca da soma feita aqui. */
  const cotar = useCallback(async () => {
    setErroCotacao(null);
    try {
      const destino = tipo === 'ENTREGA' ? coord : null;
      const c = await getProvider().orders.cotar(loja.id, itensParaCotar, destino);
      setCotacao(c);
    } catch (erro) {
      setCotacao(null);
      setErroCotacao(erro instanceof Error ? erro.message : 'Não foi possível calcular o total');
    }
  }, [loja.id, tipo, coord, itensParaCotar]);

  useEffect(() => {
    if (itensParaCotar.length > 0) void cotar();
  }, [cotar, itensParaCotar.length]);

  async function preencherPorCep(valor: string) {
    setCep(formatarCep(valor));
    if (valor.replace(/\D/g, '').length !== 8) return;
    const achado = await buscarCep(valor);
    if (!achado) {
      aoAvisar('CEP não encontrado. Preencha o endereço à mão.', true);
      return;
    }
    setLogradouro(achado.logradouro);
    setBairro(achado.bairro);
    setCidade(achado.cidade);
    setUf(achado.uf);
  }

  async function pegarLocalizacao() {
    setBuscandoLocal(true);
    try {
      setCoord(await localizacaoDoAparelho());
      aoAvisar('Localização confirmada — frete calculado');
    } catch (erro) {
      aoAvisar(erro instanceof Error ? erro.message : 'Não foi possível obter a localização', true);
    } finally {
      setBuscandoLocal(false);
    }
  }

  const faltando: string[] = [];
  if (!nome.trim()) faltando.push('seu nome');
  if (telefone.replace(/\D/g, '').length < 10) faltando.push('um telefone válido');
  if (tipo === 'ENTREGA') {
    if (!logradouro.trim() || !numero.trim()) faltando.push('o endereço completo');
    if (!coord) faltando.push('a localização para calcular o frete');
  }
  const pronto = faltando.length === 0 && cotacao !== null && !erroCotacao;

  async function confirmar() {
    if (!pronto || !cotacao) return;
    setEnviando(true);
    try {
      const entrada: NovoPedido = {
        estabelecimentoId: loja.id,
        itens: itensParaCotar,
        tipoEntrega: tipo,
        endereco:
          tipo === 'ENTREGA' && coord
            ? {
                cep: cep.replace(/\D/g, ''),
                logradouro: logradouro.trim(),
                numero: numero.trim(),
                ...(complemento.trim() ? { complemento: complemento.trim() } : {}),
                bairro: bairro.trim(),
                cidade: cidade.trim(),
                uf: uf.trim().toUpperCase(),
                coordenada: coord,
              }
            : null,
        formaPagamento: pagamento,
        trocoPara:
          pagamento === 'DINHEIRO' && troco.trim()
            ? reaisParaCentavos(Number(troco.replace(',', '.')) || 0)
            : null,
        clienteNome: nome.trim(),
        clienteTelefone: telefone.replace(/\D/g, ''),
      };
      aoConfirmar(await getProvider().orders.criar(entrada));
    } catch (erro) {
      aoAvisar(erro instanceof Error ? erro.message : 'Não foi possível enviar o pedido', true);
    } finally {
      setEnviando(false);
    }
  }

  if (linhas.length === 0) {
    return (
      <>
        <div className="barra-topo">
          <button type="button" className="voltar" onClick={aoVoltar} aria-label="Voltar">
            ←
          </button>
          <h1 className="barra-titulo">Sua conta</h1>
        </div>
        <div className="vazio">
          <p className="vazio-t">Conta vazia</p>
          <p>Volte ao cardápio e escolha alguma coisa.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="barra-topo">
        <button type="button" className="voltar" onClick={aoVoltar} aria-label="Voltar ao cardápio">
          ←
        </button>
        <h1 className="barra-titulo">Sua conta</h1>
      </div>

      <div className="pagina">
        {linhas.map((l) => (
          <div className="item-conta" key={l.chave}>
            <span className="item-q">{l.quantidade}×</span>
            <div>
              <div className="item-nome">{l.nome}</div>
              {l.adicionais.length > 0 && (
                <p className="item-extra">+ {l.adicionais.map((a) => a.nome).join(', ')}</p>
              )}
              {l.observacao && <p className="item-extra">“{l.observacao}”</p>}
              <button type="button" className="item-tirar" onClick={() => aoTirar(l.chave)}>
                Tirar
              </button>
            </div>
            <span className="item-v">{formatarBRL(l.previaUnitaria * l.quantidade)}</span>
          </div>
        ))}

        <p className="bloco-t">Como quer receber</p>
        <div className="escolhas">
          <button
            type="button"
            className="escolha"
            aria-pressed={tipo === 'ENTREGA'}
            onClick={() => setTipo('ENTREGA')}
          >
            Entrega
          </button>
          <button
            type="button"
            className="escolha"
            aria-pressed={tipo === 'RETIRADA'}
            disabled={!loja.aceitaRetirada}
            onClick={() => setTipo('RETIRADA')}
          >
            {loja.aceitaRetirada ? 'Retirar no local' : 'Sem retirada'}
          </button>
        </div>

        <p className="bloco-t">Seus dados</p>
        <div className="campo">
          <label htmlFor="nome">Nome</label>
          <input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como te chamar"
          />
        </div>
        <div className="campo">
          <label htmlFor="tel">Telefone</label>
          <input
            id="tel"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            placeholder="(44) 99999-0000"
          />
        </div>

        {tipo === 'ENTREGA' && (
          <>
            <p className="bloco-t">Endereço</p>
            <div className="campo">
              <label htmlFor="cep">CEP</label>
              <input
                id="cep"
                inputMode="numeric"
                value={cep}
                onChange={(e) => void preencherPorCep(e.target.value)}
                placeholder="87020-000"
              />
              <p className="dica">Preenche rua, bairro e cidade automaticamente.</p>
            </div>
            <div className="campo">
              <label htmlFor="rua">Rua</label>
              <input id="rua" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
            </div>
            <div className="campo-duplo">
              <div className="campo" style={{ flex: 1 }}>
                <label htmlFor="num">Número</label>
                <input
                  id="num"
                  inputMode="numeric"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                />
              </div>
              <div className="campo" style={{ flex: 2 }}>
                <label htmlFor="compl">Complemento</label>
                <input
                  id="compl"
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto, bloco"
                />
              </div>
            </div>
            <div className="campo-duplo">
              <div className="campo" style={{ flex: 2 }}>
                <label htmlFor="bairro">Bairro</label>
                <input id="bairro" value={bairro} onChange={(e) => setBairro(e.target.value)} />
              </div>
              <div className="campo" style={{ flex: 2 }}>
                <label htmlFor="cid">Cidade</label>
                <input id="cid" value={cidade} onChange={(e) => setCidade(e.target.value)} />
              </div>
              <div className="campo" style={{ flex: 1 }}>
                <label htmlFor="uf">UF</label>
                <input id="uf" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value)} />
              </div>
            </div>

            <button
              type="button"
              className="secundario"
              onClick={() => void pegarLocalizacao()}
              disabled={buscandoLocal}
            >
              {buscandoLocal
                ? 'Procurando…'
                : coord
                  ? 'Localização confirmada ✓'
                  : 'Usar minha localização'}
            </button>
            <p className="dica">
              O frete é calculado pela distância real até o restaurante, então precisamos da
              localização do aparelho. Sem ela, escolha retirar no local.
            </p>
          </>
        )}

        <p className="bloco-t">Pagamento na entrega</p>
        <div className="campo">
          <label htmlFor="pag">Forma</label>
          <select
            id="pag"
            value={pagamento}
            onChange={(e) => setPagamento(e.target.value as FormaPagamento)}
          >
            {PAGAMENTOS.map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {pagamento === 'DINHEIRO' && (
          <div className="campo">
            <label htmlFor="troco">Precisa de troco para quanto?</label>
            <input
              id="troco"
              inputMode="decimal"
              value={troco}
              onChange={(e) => setTroco(e.target.value)}
              placeholder="50,00"
            />
          </div>
        )}

        <p className="bloco-t">Total</p>
        <div className="soma">
          <span>Itens</span>
          <span>{formatarBRL(cotacao?.subtotal ?? previaSubtotal(linhas))}</span>
        </div>
        {tipo === 'ENTREGA' && (
          <div className="soma">
            <span>
              Entrega
              {cotacao?.distanciaKm != null && ` · ${cotacao.distanciaKm} km`}
            </span>
            <span>
              {!coord ? '—' : cotacao?.frete === 0 ? 'Grátis' : formatarBRL(cotacao?.frete ?? 0)}
            </span>
          </div>
        )}
        <div className="soma soma-total">
          <span>Total</span>
          <span>{cotacao ? formatarBRL(cotacao.total) : '—'}</span>
        </div>

        {erroCotacao && <p className="erro-campo">{erroCotacao}</p>}
        {!erroCotacao && faltando.length > 0 && (
          <p className="dica">Falta {faltando.join(', ')}.</p>
        )}

        <div style={{ height: 18 }} />
        <button
          type="button"
          className="principal"
          disabled={!pronto || enviando}
          onClick={() => void confirmar()}
        >
          {enviando ? 'Enviando…' : 'Enviar pedido'}
        </button>
      </div>
    </>
  );
}
