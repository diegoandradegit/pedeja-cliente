import {
  type Adicional,
  type Ator,
  type Categoria,
  type ConfigFrete,
  type Coordenada,
  type Estabelecimento,
  type ItemCarrinho,
  type Pedido,
  type Produto,
  type StatusPedido,
  calcularFrete,
  calcularSubtotal,
  calcularTotal,
  distanciaKm,
  garantirTransicao,
  precificarItens,
} from '@pedeja/domain';
import type { AuthRepo, Papel, Sessao } from '../contracts/auth.repo.js';
import type { Corrida, DeliveryRepo, LinhaExtrato } from '../contracts/delivery.repo.js';
import type { MenuRepo } from '../contracts/menu.repo.js';
import type { Cotacao, NovoPedido, OrdersRepo } from '../contracts/orders.repo.js';
import type { RealtimeRepo } from '../contracts/realtime.repo.js';
import { CANAL_CORRIDAS, assinar, canalEstabelecimento, canalPedido, publicar } from './bus.js';
import { atraso, gravar, ler, novoId } from './store.js';

const CHAVE_SESSAO = 'pedeja:mock:sessao';

export const authMock: AuthRepo = {
  async sessaoAtual() {
    await atraso(60);
    if (typeof localStorage === 'undefined') return null;
    const bruto = localStorage.getItem(CHAVE_SESSAO);
    return bruto ? (JSON.parse(bruto) as Sessao) : null;
  },
  async entrar(email: string, _senha: string, papel: Papel) {
    await atraso();
    const sessao: Sessao = {
      usuarioId: `u_${papel.toLowerCase()}`,
      nome: email.split('@')[0] ?? 'Usuario',
      email,
      papel,
      estabelecimentoId: papel === 'RESTAURANTE' ? 'e1' : null,
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    }
    for (const cb of ouvintesSessao) cb(sessao);
    return sessao;
  },
  async criarConta({ email, nome, telefone }) {
    await atraso();
    const sessao: Sessao = {
      usuarioId: `u_${email}`,
      nome,
      email,
      papel: 'ENTREGADOR',
      estabelecimentoId: null,
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ ...sessao, telefone }));
    }
    for (const cb of ouvintesSessao) cb(sessao);
    return sessao;
  },

  async sair() {
    await atraso(60);
    if (typeof localStorage !== 'undefined') localStorage.removeItem(CHAVE_SESSAO);
    for (const cb of ouvintesSessao) cb(null);
  },
  aoMudarSessao(cb) {
    ouvintesSessao.add(cb);
    return () => {
      ouvintesSessao.delete(cb);
    };
  },
};

const ouvintesSessao = new Set<(s: Sessao | null) => void>();

export const menuMock: MenuRepo = {
  async listarEstabelecimentos(): Promise<Estabelecimento[]> {
    await atraso();
    return ler().estabelecimentos.filter((e) => e.ativo);
  },
  async obterEstabelecimento(id) {
    await atraso();
    return ler().estabelecimentos.find((e) => e.id === id) ?? null;
  },
  async listarCategorias(estabelecimentoId): Promise<Categoria[]> {
    await atraso();
    return ler()
      .categorias.filter((c) => c.estabelecimentoId === estabelecimentoId)
      .sort((a, b) => a.ordem - b.ordem);
  },
  async listarProdutos(estabelecimentoId): Promise<Produto[]> {
    await atraso();
    return ler().produtos.filter((p) => p.estabelecimentoId === estabelecimentoId);
  },
  async listarAdicionais(_estabelecimentoId): Promise<Adicional[]> {
    await atraso();
    return ler().adicionais;
  },
  async salvarProduto(p) {
    await atraso();
    const id = p.id ?? novoId();
    const produto: Produto = { ...p, id };
    gravar((e) => {
      const i = e.produtos.findIndex((x) => x.id === id);
      if (i >= 0) e.produtos[i] = produto;
      else e.produtos.push(produto);
    });
    return produto;
  },
  async removerProduto(id) {
    await atraso();
    gravar((e) => {
      e.produtos = e.produtos.filter((p) => p.id !== id);
    });
  },
  async removerCategoria(id) {
    await atraso();
    gravar((e) => {
      if (e.produtos.some((p) => p.categoriaId === id)) {
        throw new Error('Esta categoria tem produtos. Mova ou remova antes de excluir.');
      }
      e.categorias = e.categorias.filter((c) => c.id !== id);
    });
  },

  async salvarAdicional(a) {
    await atraso();
    const id = a.id ?? novoId();
    const adicional: Adicional = { id, nome: a.nome, preco: a.preco, ativo: a.ativo };
    gravar((e) => {
      const i = e.adicionais.findIndex((x) => x.id === id);
      if (i >= 0) e.adicionais[i] = adicional;
      else e.adicionais.push(adicional);
    });
    return adicional;
  },

  async removerAdicional(id) {
    await atraso();
    gravar((e) => {
      e.adicionais = e.adicionais.filter((a) => a.id !== id);
      e.produtos = e.produtos.map((p) => ({
        ...p,
        adicionaisIds: p.adicionaisIds.filter((x) => x !== id),
      }));
    });
  },

  async salvarEstabelecimento(loja) {
    await atraso();
    gravar((e) => {
      const i = e.estabelecimentos.findIndex((x) => x.id === loja.id);
      if (i >= 0) e.estabelecimentos[i] = loja;
    });
    return loja;
  },

  async salvarHorarios(estabelecimentoId, faixas) {
    await atraso();
    gravar((e) => {
      const i = e.estabelecimentos.findIndex((x) => x.id === estabelecimentoId);
      const loja = e.estabelecimentos[i];
      if (i >= 0 && loja) e.estabelecimentos[i] = { ...loja, horarios: faixas };
    });
  },

  async salvarCategoria(c) {
    await atraso();
    const id = c.id ?? novoId();
    const categoria: Categoria = { ...c, id };
    gravar((e) => {
      const i = e.categorias.findIndex((x) => x.id === id);
      if (i >= 0) e.categorias[i] = categoria;
      else e.categorias.push(categoria);
    });
    return categoria;
  },
};

function catalogo(estabelecimentoId: string) {
  const e = ler();
  return {
    produtos: new Map(
      e.produtos.filter((p) => p.estabelecimentoId === estabelecimentoId).map((p) => [p.id, p]),
    ),
    categorias: new Map(
      e.categorias.filter((c) => c.estabelecimentoId === estabelecimentoId).map((c) => [c.id, c]),
    ),
    adicionais: new Map(e.adicionais.map((a) => [a.id, a])),
    config: e.configsFrete.find((c) => c.estabelecimentoId === estabelecimentoId),
    estabelecimento: e.estabelecimentos.find((x) => x.id === estabelecimentoId),
  };
}

/** Precifica sempre a partir do catalogo. Espelha o que a RPC do Supabase fara. */
function precificar(estabelecimentoId: string, itens: ItemCarrinho[], destino: Coordenada | null) {
  const { produtos, categorias, adicionais, config, estabelecimento } = catalogo(estabelecimentoId);
  if (!config || !estabelecimento) throw new Error(`Estabelecimento ${estabelecimentoId} invalido`);

  const itensPrecificados = precificarItens(
    itens,
    produtos,
    adicionais,
    categorias,
    estabelecimento.regraPrecoFracionado,
  );
  const subtotal = calcularSubtotal(itensPrecificados);
  const dist = destino ? distanciaKm(estabelecimento.coordenada, destino) : null;
  const frete = dist === null ? 0 : calcularFrete(dist, config, subtotal);
  return { itensPrecificados, subtotal, dist, frete, total: calcularTotal(subtotal, frete, 0) };
}

export const ordersMock: OrdersRepo = {
  async cotar(estabelecimentoId, itens, destino): Promise<Cotacao> {
    await atraso();
    const r = precificar(estabelecimentoId, itens, destino);
    return { distanciaKm: r.dist, subtotal: r.subtotal, frete: r.frete, total: r.total };
  },

  async acompanhar(pedidoId) {
    await atraso(80);
    const e = ler();
    const pedido = e.pedidos.find((p) => p.id === pedidoId);
    if (!pedido) throw new Error('Pedido nao encontrado');
    const loja = e.estabelecimentos.find((x) => x.id === pedido.estabelecimentoId);
    return {
      pedido,
      estabelecimento: {
        id: loja?.id ?? '',
        nome: loja?.nome ?? '',
        imagem: loja?.imagem ?? null,
        endereco: loja?.endereco ?? '',
        coordenada: loja?.coordenada ?? { lat: 0, lng: 0 },
      },
      historico: e.historico.filter((h) => h.pedidoId === pedidoId),
    };
  },

  async vincularPedidos(pedidoIds) {
    await atraso(80);
    return pedidoIds.length;
  },

  async criar(entrada: NovoPedido): Promise<Pedido> {
    await atraso(300);
    const destino =
      entrada.tipoEntrega === 'ENTREGA' ? (entrada.endereco?.coordenada ?? null) : null;
    const r = precificar(entrada.estabelecimentoId, entrada.itens, destino);
    const agora = new Date().toISOString();

    let pedido!: Pedido;
    gravar((e) => {
      pedido = {
        id: novoId(),
        numero: e.proximoNumero,
        estabelecimentoId: entrada.estabelecimentoId,
        clienteId: 'u_cliente',
        clienteNome: entrada.clienteNome,
        clienteTelefone: entrada.clienteTelefone,
        itens: r.itensPrecificados,
        tipoEntrega: entrada.tipoEntrega,
        endereco: entrada.endereco,
        distanciaKm: r.dist,
        subtotal: r.subtotal,
        frete: r.frete,
        desconto: 0,
        total: r.total,
        formaPagamento: entrada.formaPagamento,
        trocoPara: entrada.trocoPara,
        status: 'PENDENTE',
        entregadorId: null,
        criadoEm: agora,
        atualizadoEm: agora,
      };
      e.proximoNumero += 1;
      e.pedidos.push(pedido);
      e.historico.push({ pedidoId: pedido.id, de: null, para: 'PENDENTE', em: agora });
    });

    publicar(canalEstabelecimento(pedido.estabelecimentoId), { tipo: 'PEDIDO_CRIADO', pedido });
    return pedido;
  },

  async obter(id) {
    await atraso(80);
    return ler().pedidos.find((p) => p.id === id) ?? null;
  },

  async listarPorEstabelecimento(estabelecimentoId, apenasAtivos = false) {
    await atraso();
    const finais: StatusPedido[] = ['ENTREGUE', 'RETIRADO', 'CANCELADO'];
    return ler()
      .pedidos.filter(
        (p) =>
          p.estabelecimentoId === estabelecimentoId &&
          (!apenasAtivos || !finais.includes(p.status)),
      )
      .sort((a, b) => b.numero - a.numero);
  },

  async listarPorCliente(clienteId) {
    await atraso();
    return ler()
      .pedidos.filter((p) => p.clienteId === clienteId)
      .sort((a, b) => b.numero - a.numero);
  },

  async mudarStatus(pedidoId, novo, ator: Ator): Promise<Pedido> {
    await atraso(150);
    const atual = ler().pedidos.find((p) => p.id === pedidoId);
    if (!atual) throw new Error(`Pedido ${pedidoId} nao encontrado`);
    garantirTransicao(atual.status, novo, ator);

    let atualizado!: Pedido;
    gravar((e) => {
      const i = e.pedidos.findIndex((p) => p.id === pedidoId);
      const alvo = e.pedidos[i];
      if (i < 0 || !alvo) throw new Error(`Pedido ${pedidoId} nao encontrado`);
      const em = new Date().toISOString();
      atualizado = { ...alvo, status: novo, atualizadoEm: em };
      e.pedidos[i] = atualizado;
      e.historico.push({ pedidoId: alvo.id, de: alvo.status, para: novo, em });
    });

    publicar(canalEstabelecimento(atualizado.estabelecimentoId), {
      tipo: 'STATUS_MUDOU',
      pedido: atualizado,
    });
    publicar(canalPedido(atualizado.id), { tipo: 'STATUS_MUDOU', pedido: atualizado });
    if (novo === 'AGUARDANDO_ENTREGADOR') {
      publicar(CANAL_CORRIDAS, { tipo: 'CORRIDA_DISPONIVEL', pedidoId: atualizado.id });
    }
    return atualizado;
  },

  async obterConfigFrete(estabelecimentoId): Promise<ConfigFrete> {
    await atraso();
    const c = ler().configsFrete.find((x) => x.estabelecimentoId === estabelecimentoId);
    if (!c) throw new Error(`Sem config de frete para ${estabelecimentoId}`);
    return c;
  },

  async salvarConfigFrete(config) {
    await atraso();
    gravar((e) => {
      const i = e.configsFrete.findIndex((x) => x.estabelecimentoId === config.estabelecimentoId);
      if (i >= 0) e.configsFrete[i] = config;
      else e.configsFrete.push(config);
    });
    return config;
  },
};

export const deliveryMock: DeliveryRepo = {
  async gerarConvite() {
    await atraso();
    return `MOCK${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  },

  async usarConvite(codigo) {
    await atraso();
    if (!codigo.trim()) throw new Error('Código de convite inválido');
  },

  async entregadoresDaLoja() {
    await atraso();
    return [];
  },

  async definirEntregadorAtivo() {
    await atraso();
  },

  async corridasDisponiveis(): Promise<Corrida[]> {
    await atraso();
    const e = ler();
    return e.pedidos
      .filter((p) => p.status === 'AGUARDANDO_ENTREGADOR' && p.entregadorId === null)
      .map((p) => ({
        pedidoId: p.id,
        numero: p.numero,
        estabelecimentoNome:
          e.estabelecimentos.find((x) => x.id === p.estabelecimentoId)?.nome ?? '—',
        enderecoResumo: p.endereco ? `${p.endereco.logradouro}, ${p.endereco.numero}` : '—',
        distanciaKm: p.distanciaKm ?? 0,
        ganho: p.frete,
        criadoEm: p.criadoEm,
      }));
  },

  /** Trava de concorrencia: so aceita se ainda estiver sem entregador. */
  async aceitarCorrida(pedidoId, entregadorId) {
    await atraso(200);
    let resultado: Pedido | null = null;
    gravar((e) => {
      const i = e.pedidos.findIndex((p) => p.id === pedidoId);
      const alvo = e.pedidos[i];
      if (i < 0 || !alvo) return;
      if (alvo.entregadorId !== null || alvo.status !== 'AGUARDANDO_ENTREGADOR') return;
      resultado = {
        ...alvo,
        entregadorId,
        status: 'EM_ROTA',
        atualizadoEm: new Date().toISOString(),
      };
      e.pedidos[i] = resultado;
    });
    if (resultado) {
      const p = resultado as Pedido;
      publicar(canalEstabelecimento(p.estabelecimentoId), { tipo: 'STATUS_MUDOU', pedido: p });
      publicar(canalPedido(p.id), { tipo: 'STATUS_MUDOU', pedido: p });
    }
    return resultado;
  },

  async corridaAtiva(entregadorId) {
    await atraso();
    return (
      ler().pedidos.find((p) => p.entregadorId === entregadorId && p.status === 'EM_ROTA') ?? null
    );
  },

  async extrato(entregadorId, desde): Promise<LinhaExtrato[]> {
    await atraso();
    return ler()
      .pedidos.filter(
        (p) =>
          p.entregadorId === entregadorId && p.status === 'ENTREGUE' && p.atualizadoEm >= desde,
      )
      .map((p) => ({ pedidoId: p.id, numero: p.numero, ganho: p.frete, em: p.atualizadoEm }));
  },
};

export const realtimeMock: RealtimeRepo = {
  assinarEstabelecimento: (id, cb) => assinar(canalEstabelecimento(id), cb),
  assinarPedido: (id, cb) => assinar(canalPedido(id), cb),
  assinarCorridas: (cb) => assinar(CANAL_CORRIDAS, cb),
};
