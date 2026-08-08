import { type Cotacao, type NovoPedido, getProvider } from '@pedeja/data';
import {
  type Estabelecimento,
  type FormaPagamento,
  type Pedido,
  type TipoEntrega,
  formatarBRL,
  reaisParaCentavos,
} from '@pedeja/domain';
import { Banknote, Check, CreditCard, Plus, QrCode, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Linha, previaSubtotal } from '../lib/carrinho.js';
import {
  type Coordenada,
  buscarCep,
  formatarCep,
  formatarTelefone,
  localizacaoDoAparelho,
} from '../lib/cep.js';
import { gravar as gravarPerfil, ler as lerPerfil } from '../lib/perfil.js';

type Props = {
  loja: Estabelecimento;
  linhas: Linha[];
  lojaAberta: boolean;
  aoFechar: () => void;
  aoMudarQuantidade: (chave: string, quantidade: number) => void;
  aoConfirmar: (pedido: Pedido) => void;
  aoAvisar: (texto: string, erro?: boolean) => void;
};

const PAGAMENTOS: [FormaPagamento, string, typeof QrCode][] = [
  ['PIX', 'PIX', QrCode],
  ['CREDITO', 'Cartão de crédito', CreditCard],
  ['DEBITO', 'Cartão de débito', CreditCard],
  ['DINHEIRO', 'Dinheiro', Banknote],
];

export function Conta({
  loja,
  linhas,
  lojaAberta,
  aoFechar,
  aoMudarQuantidade,
  aoConfirmar,
  aoAvisar,
}: Props) {
  const salvo = lerPerfil();
  const [tipo, setTipo] = useState<TipoEntrega>('ENTREGA');
  const [nome, setNome] = useState(salvo.nome);
  const [telefone, setTelefone] = useState(salvo.telefone);
  const [cep, setCep] = useState(salvo.cep);
  const [logradouro, setLogradouro] = useState(salvo.logradouro);
  const [numero, setNumero] = useState(salvo.numero);
  const [complemento, setComplemento] = useState(salvo.complemento);
  const [bairro, setBairro] = useState(salvo.bairro);
  const [cidade, setCidade] = useState(salvo.cidade);
  const [uf, setUf] = useState(salvo.uf);
  const [coord, setCoord] = useState<Coordenada | null>(null);
  const [pagamento, setPagamento] = useState<FormaPagamento>('PIX');
  const [troco, setTroco] = useState('');
  const [cotacao, setCotacao] = useState<Cotacao | null>(null);
  const [erroCotacao, setErroCotacao] = useState<string | null>(null);
  const [buscandoLocal, setBuscandoLocal] = useState(false);
  const [enviando, setEnviando] = useState(false);

  /** Só identificadores: o servidor busca os preços no catálogo. */
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

  const cotar = useCallback(async () => {
    setErroCotacao(null);
    try {
      setCotacao(
        await getProvider().orders.cotar(
          loja.id,
          itensParaCotar,
          tipo === 'ENTREGA' ? coord : null,
        ),
      );
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
    if (!achado) return aoAvisar('CEP não encontrado. Preencha à mão.', true);
    setLogradouro(achado.logradouro);
    setBairro(achado.bairro);
    setCidade(achado.cidade);
    setUf(achado.uf);
  }

  async function pegarLocalizacao() {
    setBuscandoLocal(true);
    try {
      setCoord(await localizacaoDoAparelho());
      aoAvisar('Localização confirmada');
    } catch (erro) {
      aoAvisar(erro instanceof Error ? erro.message : 'Não foi possível localizar', true);
    } finally {
      setBuscandoLocal(false);
    }
  }

  const faltando: string[] = [];
  if (!nome.trim()) faltando.push('seu nome');
  if (telefone.replace(/\D/g, '').length < 10) faltando.push('um telefone válido');
  if (tipo === 'ENTREGA') {
    if (!logradouro.trim() || !numero.trim()) faltando.push('o endereço');
    if (!coord) faltando.push('a localização para o frete');
  }
  const pronto = faltando.length === 0 && cotacao !== null && !erroCotacao;

  async function finalizar() {
    if (!pronto) return;
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
      const pedido = await getProvider().orders.criar(entrada);
      // melhoria: guarda os dados para o próximo pedido não pedir tudo de novo
      gravarPerfil({ nome, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf });
      aoConfirmar(pedido);
    } catch (erro) {
      aoAvisar(erro instanceof Error ? erro.message : 'Não foi possível enviar', true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="sacola-topo">
        <button
          type="button"
          className="fechar-folha"
          onClick={aoFechar}
          aria-label="Fechar sacola"
        >
          <X size={22} strokeWidth={2.4} />
        </button>
        <div style={{ flex: 1 }}>
          <h2>Sua sacola</h2>
          <p>{loja.nome}</p>
        </div>
        {loja.imagem && (
          <img
            src={loja.imagem}
            alt=""
            style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover' }}
          />
        )}
      </div>

      <div className="pagina">
        {linhas.length === 0 && (
          <div className="vazio">
            <p className="vazio-t">Sacola vazia</p>
            <p>Volte ao cardápio e escolha alguma coisa.</p>
          </div>
        )}

        {linhas.map((l) => (
          <div className="sacola-item" key={l.chave}>
            {l.imagem && <img className="sacola-item-foto" src={l.imagem} alt="" loading="lazy" />}
            <div className="sacola-item-corpo">
              <div className="sacola-item-nome">{l.nome}</div>
              {l.adicionais.length > 0 && (
                <p className="sacola-item-extra">+ {l.adicionais.map((a) => a.nome).join(', ')}</p>
              )}
              {l.observacao && <p className="sacola-item-extra">“{l.observacao}”</p>}
              <div className="sacola-item-pe">
                <div className="passo-mini">
                  <button
                    type="button"
                    onClick={() => aoMudarQuantidade(l.chave, l.quantidade - 1)}
                    aria-label={l.quantidade === 1 ? `Tirar ${l.nome}` : `Menos ${l.nome}`}
                  >
                    {l.quantidade === 1 ? <X size={16} strokeWidth={2.6} /> : '−'}
                  </button>
                  <span>{l.quantidade}</span>
                  <button
                    type="button"
                    onClick={() => aoMudarQuantidade(l.chave, l.quantidade + 1)}
                    aria-label={`Mais ${l.nome}`}
                  >
                    +
                  </button>
                </div>
                <span className="sacola-item-preco">
                  {formatarBRL(l.previaUnitaria * l.quantidade)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {linhas.length > 0 && (
          <button type="button" className="adicionar-mais" onClick={aoFechar}>
            <Plus size={18} strokeWidth={2.4} />
            Adicionar mais itens
          </button>
        )}

        {linhas.length > 0 && (
          <>
            <p className="bloco-titulo">Como quer receber</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="secundaria"
                style={
                  tipo === 'ENTREGA'
                    ? { borderColor: 'var(--vermelho)', color: 'var(--vermelho)' }
                    : {}
                }
                onClick={() => setTipo('ENTREGA')}
              >
                Entrega
              </button>
              <button
                type="button"
                className="secundaria"
                disabled={!loja.aceitaRetirada}
                style={
                  tipo === 'RETIRADA'
                    ? { borderColor: 'var(--vermelho)', color: 'var(--vermelho)' }
                    : {}
                }
                onClick={() => setTipo('RETIRADA')}
              >
                Retirar no local
              </button>
            </div>

            <p className="bloco-titulo">Seus dados</p>
            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
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
                <p className="bloco-titulo">Endereço</p>
                <div className="campo">
                  <label htmlFor="cep">CEP</label>
                  <input
                    id="cep"
                    inputMode="numeric"
                    value={cep}
                    onChange={(e) => void preencherPorCep(e.target.value)}
                    placeholder="87020-000"
                  />
                </div>
                <div className="campo">
                  <label htmlFor="rua">Rua</label>
                  <input
                    id="rua"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                  />
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
                    <input
                      id="uf"
                      maxLength={2}
                      value={uf}
                      onChange={(e) => setUf(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="secundaria"
                  onClick={() => void pegarLocalizacao()}
                  disabled={buscandoLocal}
                >
                  {buscandoLocal
                    ? 'Procurando…'
                    : coord
                      ? 'Localização confirmada ✓'
                      : 'Usar minha localização'}
                </button>
                <p className="dica">O frete usa a distância real até o restaurante.</p>
              </>
            )}

            <p className="bloco-titulo">Resumo de Valores</p>
            <div className="resumo-linha">
              <span>Subtotal:</span>
              <span>{formatarBRL(cotacao?.subtotal ?? previaSubtotal(linhas))}</span>
            </div>
            {tipo === 'ENTREGA' && (
              <div className="resumo-linha">
                <span>Entrega:</span>
                <span>
                  {!coord
                    ? '—'
                    : cotacao?.frete === 0
                      ? 'Grátis'
                      : formatarBRL(cotacao?.frete ?? 0)}
                </span>
              </div>
            )}
            <div className="resumo-linha resumo-total">
              <span>Total:</span>
              <span>{cotacao ? formatarBRL(cotacao.total) : '—'}</span>
            </div>

            <p className="bloco-titulo">Pagamento</p>
            {PAGAMENTOS.map(([valor, rotulo, Icone]) => (
              <button
                type="button"
                key={valor}
                className="pagamento"
                aria-pressed={pagamento === valor}
                onClick={() => setPagamento(valor)}
              >
                <span className="pagamento-bolha">
                  <Icone size={22} />
                </span>
                <span className="pagamento-nome">{rotulo}</span>
              </button>
            ))}

            {pagamento === 'DINHEIRO' && (
              <div className="campo" style={{ marginTop: 10 }}>
                <label htmlFor="troco">Troco para quanto?</label>
                <input
                  id="troco"
                  inputMode="decimal"
                  value={troco}
                  onChange={(e) => setTroco(e.target.value)}
                  placeholder="50,00"
                />
              </div>
            )}

            {erroCotacao && <p className="dica dica-erro">{erroCotacao}</p>}
            {!erroCotacao && faltando.length > 0 && (
              <p className="dica">Falta {faltando.join(', ')}.</p>
            )}
          </>
        )}
      </div>

      <div className="folha-rodape">
        {linhas.length === 0 ? (
          <button type="button" className="acao acao-centro" onClick={aoFechar}>
            Ver cardápio
          </button>
        ) : (
          <button
            type="button"
            className={lojaAberta ? 'acao' : 'acao acao-centro'}
            disabled={!lojaAberta || !pronto || enviando}
            onClick={() => void finalizar()}
          >
            {lojaAberta ? (
              <>
                <span>{enviando ? 'Enviando…' : 'Finalizar pedido'}</span>
                <Check size={22} strokeWidth={3} />
              </>
            ) : (
              <span>Restaurante fechado</span>
            )}
          </button>
        )}
      </div>
    </>
  );
}
