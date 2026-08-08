import type {
  Adicional,
  Ator,
  Categoria,
  ConfigFrete,
  Coordenada,
  Estabelecimento,
  ItemCarrinho,
  Pedido,
  Produto,
  StatusPedido,
} from '@pedeja/domain';
import type { AuthRepo, Papel, Sessao } from '../contracts/auth.repo.js';
import type { Corrida, DeliveryRepo, LinhaExtrato } from '../contracts/delivery.repo.js';
import type { MenuRepo } from '../contracts/menu.repo.js';
import type { Cotacao, NovoPedido, OrdersRepo } from '../contracts/orders.repo.js';
import type { EventoPedido, RealtimeRepo } from '../contracts/realtime.repo.js';
import { erroLegivel, sb } from './cliente.js';
import {
  SELECT_LOJA,
  SELECT_PEDIDO,
  SELECT_PRODUTO,
  paraAdicional,
  paraCategoria,
  paraConfigFrete,
  paraEstabelecimento,
  paraPedido,
  paraProduto,
} from './mapas.js';

/** O formato que as RPCs esperam: sabores como array, sem preço nenhum. */
const paraRpc = (itens: ItemCarrinho[]) =>
  itens.map((i) => ({
    sabores: [i.produtoId, ...(i.saboresExtras ?? [])],
    quantidade: i.quantidade,
    adicionais: i.adicionaisIds,
    ...(i.observacao ? { observacao: i.observacao } : {}),
  }));

// ── Auth ────────────────────────────────────────────────────────────────────
export const authSupabase: AuthRepo = {
  async sessaoAtual(): Promise<Sessao | null> {
    const { data } = await sb().auth.getUser();
    if (!data.user) return null;

    const { data: perfil } = await sb()
      .from('perfis')
      .select('nome, telefone, papel')
      .eq('id', data.user.id)
      .maybeSingle();

    const { data: loja } = await sb().rpc('meu_estabelecimento');

    return {
      usuarioId: data.user.id,
      nome: perfil?.nome ?? '',
      email: data.user.email ?? '',
      papel: (perfil?.papel as Papel) ?? 'CLIENTE',
      estabelecimentoId: (loja as string | null) ?? null,
    };
  },

  async entrar(email, senha) {
    const { error } = await sb().auth.signInWithPassword({ email, password: senha });
    if (error) throw erroLegivel(error, 'E-mail ou senha incorretos');
    const sessao = await authSupabase.sessaoAtual();
    if (!sessao) throw new Error('Não foi possível carregar o perfil');
    return sessao;
  },

  async sair() {
    await sb().auth.signOut();
  },

  aoMudarSessao(cb) {
    const { data } = sb().auth.onAuthStateChange(() => {
      void authSupabase.sessaoAtual().then(cb);
    });
    return () => data.subscription.unsubscribe();
  },
};

// ── Cardápio ────────────────────────────────────────────────────────────────
export const menuSupabase: MenuRepo = {
  async listarEstabelecimentos(): Promise<Estabelecimento[]> {
    const { data, error } = await sb()
      .from('estabelecimentos')
      .select(SELECT_LOJA)
      .eq('ativo', true);
    if (error) throw erroLegivel(error, 'Não foi possível carregar os restaurantes');
    return (data ?? []).map(paraEstabelecimento);
  },

  async obterEstabelecimento(id) {
    const { data, error } = await sb()
      .from('estabelecimentos')
      .select(SELECT_LOJA)
      .eq('id', id)
      .maybeSingle();
    if (error) throw erroLegivel(error, 'Não foi possível carregar o restaurante');
    return data ? paraEstabelecimento(data) : null;
  },

  async listarCategorias(estabelecimentoId): Promise<Categoria[]> {
    const { data, error } = await sb()
      .from('categorias')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('ordem');
    if (error) throw erroLegivel(error, 'Não foi possível carregar as categorias');
    return (data ?? []).map(paraCategoria);
  },

  async listarProdutos(estabelecimentoId): Promise<Produto[]> {
    const { data, error } = await sb()
      .from('produtos')
      .select(SELECT_PRODUTO)
      .eq('estabelecimento_id', estabelecimentoId)
      .order('nome');
    if (error) throw erroLegivel(error, 'Não foi possível carregar o cardápio');
    return (data ?? []).map(paraProduto);
  },

  async listarAdicionais(estabelecimentoId): Promise<Adicional[]> {
    const { data, error } = await sb()
      .from('adicionais')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId);
    if (error) throw erroLegivel(error, 'Não foi possível carregar os adicionais');
    return (data ?? []).map(paraAdicional);
  },

  async salvarProduto(p): Promise<Produto> {
    const linha = {
      ...(p.id ? { id: p.id } : {}),
      estabelecimento_id: p.estabelecimentoId,
      categoria_id: p.categoriaId,
      nome: p.nome,
      descricao: p.descricao,
      preco: p.preco,
      imagem: p.imagem,
      ativo: p.ativo,
    };
    const { data, error } = await sb()
      .from('produtos')
      .upsert(linha)
      .select(SELECT_PRODUTO)
      .single();
    if (error) throw erroLegivel(error, 'Não foi possível salvar o produto');

    // vínculo com adicionais: reescreve o conjunto
    await sb().from('produto_adicionais').delete().eq('produto_id', data.id);
    if (p.adicionaisIds.length > 0) {
      await sb()
        .from('produto_adicionais')
        .insert(p.adicionaisIds.map((a) => ({ produto_id: data.id, adicional_id: a })));
    }
    return paraProduto({
      ...data,
      produto_adicionais: p.adicionaisIds.map((a) => ({ adicional_id: a })),
    });
  },

  async removerProduto(id) {
    const { error } = await sb().from('produtos').delete().eq('id', id);
    if (error) throw erroLegivel(error, 'Não foi possível remover o produto');
  },

  async salvarCategoria(c): Promise<Categoria> {
    const { data, error } = await sb()
      .from('categorias')
      .upsert({
        ...(c.id ? { id: c.id } : {}),
        estabelecimento_id: c.estabelecimentoId,
        nome: c.nome,
        ordem: c.ordem,
        max_sabores: c.maxSabores,
      })
      .select('*')
      .single();
    if (error) throw erroLegivel(error, 'Não foi possível salvar a categoria');
    return paraCategoria(data);
  },
};

// ── Pedidos ─────────────────────────────────────────────────────────────────
export const ordersSupabase: OrdersRepo = {
  async cotar(estabelecimentoId, itens, destino: Coordenada | null): Promise<Cotacao> {
    const { data, error } = await sb().rpc('cotar_pedido', {
      p_estabelecimento: estabelecimentoId,
      p_itens: paraRpc(itens),
      p_lat: destino?.lat ?? null,
      p_lng: destino?.lng ?? null,
    });
    if (error) throw erroLegivel(error, 'Não foi possível calcular o total');
    const c = data as {
      distancia_km: string | null;
      subtotal: number;
      frete: number;
      total: number;
    };
    return {
      distanciaKm: c.distancia_km === null ? null : Number(c.distancia_km),
      subtotal: c.subtotal,
      frete: c.frete,
      total: c.total,
    };
  },

  async criar(entrada: NovoPedido): Promise<Pedido> {
    const { data: id, error } = await sb().rpc('criar_pedido', {
      p_estabelecimento: entrada.estabelecimentoId,
      p_itens: paraRpc(entrada.itens),
      p_tipo_entrega: entrada.tipoEntrega,
      p_endereco: entrada.endereco,
      p_forma_pagamento: entrada.formaPagamento,
      p_cliente_nome: entrada.clienteNome,
      p_cliente_telefone: entrada.clienteTelefone,
      p_troco_para: entrada.trocoPara,
    });
    if (error) throw erroLegivel(error, 'Não foi possível enviar o pedido');

    const pedido = await ordersSupabase.obter(id as string);
    if (!pedido) throw new Error('Pedido criado, mas não foi possível carregá-lo');
    return pedido;
  },

  async obter(id) {
    const { data, error } = await sb()
      .from('pedidos')
      .select(SELECT_PEDIDO)
      .eq('id', id)
      .maybeSingle();
    if (error) throw erroLegivel(error, 'Não foi possível carregar o pedido');
    return data ? paraPedido(data) : null;
  },

  async listarPorEstabelecimento(estabelecimentoId, apenasAtivos = false) {
    let q = sb()
      .from('pedidos')
      .select(SELECT_PEDIDO)
      .eq('estabelecimento_id', estabelecimentoId)
      .order('numero', { ascending: false });
    if (apenasAtivos) q = q.not('status', 'in', '("ENTREGUE","RETIRADO","CANCELADO")');
    const { data, error } = await q;
    if (error) throw erroLegivel(error, 'Não foi possível carregar os pedidos');
    return (data ?? []).map(paraPedido);
  },

  async listarPorCliente(clienteId) {
    const { data, error } = await sb()
      .from('pedidos')
      .select(SELECT_PEDIDO)
      .or(`cliente_id.eq.${clienteId},cliente_local_id.eq.${clienteId}`)
      .order('numero', { ascending: false });
    if (error) throw erroLegivel(error, 'Não foi possível carregar seus pedidos');
    return (data ?? []).map(paraPedido);
  },

  async mudarStatus(pedidoId, novo: StatusPedido, ator: Ator): Promise<Pedido> {
    const { data, error } = await sb().rpc('mudar_status', {
      p_pedido: pedidoId,
      p_novo: novo,
      p_ator: ator,
    });
    if (error) throw erroLegivel(error, 'Não foi possível mudar o status');
    const linha = Array.isArray(data) ? data[0] : data;
    const completo = await ordersSupabase.obter((linha as { id: string }).id);
    if (!completo) throw new Error('Status alterado, mas o pedido não pôde ser recarregado');
    return completo;
  },

  async obterConfigFrete(estabelecimentoId): Promise<ConfigFrete> {
    const { data, error } = await sb()
      .from('config_frete')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .single();
    if (error) throw erroLegivel(error, 'Não foi possível carregar as regras de entrega');
    return paraConfigFrete(data);
  },

  async salvarConfigFrete(config) {
    const { data, error } = await sb()
      .from('config_frete')
      .upsert({
        estabelecimento_id: config.estabelecimentoId,
        taxa_fixa: config.taxaFixa,
        preco_por_km: config.precoPorKm,
        raio_maximo_km: config.raioMaximoKm,
        frete_gratis_acima_de: config.freteGratisAcimaDe,
      })
      .select('*')
      .single();
    if (error) throw erroLegivel(error, 'Não foi possível salvar as regras de entrega');
    return paraConfigFrete(data);
  },
};

// ── Entregas ────────────────────────────────────────────────────────────────
export const deliverySupabase: DeliveryRepo = {
  async corridasDisponiveis(): Promise<Corrida[]> {
    // a RLS já limita ao que o entregador pode ver
    const { data, error } = await sb()
      .from('pedidos')
      .select('*, estabelecimentos(nome)')
      .eq('status', 'AGUARDANDO_ENTREGADOR')
      .is('entregador_id', null)
      .order('criado_em');
    if (error) throw erroLegivel(error, 'Não foi possível carregar as corridas');

    return (data ?? []).map((p) => ({
      pedidoId: p.id,
      numero: p.numero,
      estabelecimentoNome: (p.estabelecimentos as { nome: string } | null)?.nome ?? '—',
      enderecoResumo: p.endereco
        ? `${(p.endereco as { logradouro: string }).logradouro}, ${(p.endereco as { numero: string }).numero}`
        : '—',
      distanciaKm: p.distancia_km === null ? 0 : Number(p.distancia_km),
      ganho: p.frete,
      criadoEm: p.criado_em,
    }));
  },

  /** A trava de concorrência mora no WHERE da RPC: só um entregador leva. */
  async aceitarCorrida(pedidoId) {
    const { data, error } = await sb().rpc('aceitar_corrida', { p_pedido: pedidoId });
    if (error) {
      if (/já foi aceita/i.test(String((error as { message?: string }).message))) return null;
      throw erroLegivel(error, 'Não foi possível aceitar a corrida');
    }
    const linha = Array.isArray(data) ? data[0] : data;
    return ordersSupabase.obter((linha as { id: string }).id);
  },

  async corridaAtiva(entregadorId) {
    const { data, error } = await sb()
      .from('pedidos')
      .select(SELECT_PEDIDO)
      .eq('entregador_id', entregadorId)
      .eq('status', 'EM_ROTA')
      .maybeSingle();
    if (error) throw erroLegivel(error, 'Não foi possível carregar a entrega atual');
    return data ? paraPedido(data) : null;
  },

  async extrato(entregadorId, desde): Promise<LinhaExtrato[]> {
    const { data, error } = await sb()
      .from('pedidos')
      .select('id, numero, frete, atualizado_em')
      .eq('entregador_id', entregadorId)
      .eq('status', 'ENTREGUE')
      .gte('atualizado_em', desde)
      .order('atualizado_em', { ascending: false });
    if (error) throw erroLegivel(error, 'Não foi possível carregar o extrato');
    return (data ?? []).map((p) => ({
      pedidoId: p.id,
      numero: p.numero,
      ganho: p.frete,
      em: p.atualizado_em,
    }));
  },
};

// ── Realtime ────────────────────────────────────────────────────────────────
/**
 * Postgres Changes respeita RLS: o canal do estabelecimento só entrega linhas
 * que aquele usuário poderia ler. Diferente do ws/:id do sistema anterior, onde
 * bastava trocar o número na URL para escutar os pedidos de qualquer loja.
 */
export const realtimeSupabase: RealtimeRepo = {
  assinarEstabelecimento(id, cb) {
    const canal = sb()
      .channel(`estabelecimento:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos', filter: `estabelecimento_id=eq.${id}` },
        (msg) => {
          const linha = msg.new as { id?: string } | null;
          if (!linha?.id) return;
          void ordersSupabase.obter(linha.id).then((pedido) => {
            if (!pedido) return;
            cb(
              msg.eventType === 'INSERT'
                ? { tipo: 'PEDIDO_CRIADO', pedido }
                : { tipo: 'STATUS_MUDOU', pedido },
            );
          });
        },
      )
      .subscribe();
    return () => void sb().removeChannel(canal);
  },

  assinarPedido(pedidoId, cb) {
    const canal = sb()
      .channel(`pedido:${pedidoId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos', filter: `id=eq.${pedidoId}` },
        () => {
          void ordersSupabase.obter(pedidoId).then((pedido) => {
            if (pedido) cb({ tipo: 'STATUS_MUDOU', pedido });
          });
        },
      )
      .subscribe();
    return () => void sb().removeChannel(canal);
  },

  assinarCorridas(cb: (e: EventoPedido) => void) {
    const canal = sb()
      .channel('corridas')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, (msg) => {
        const linha = msg.new as { id?: string; status?: string } | null;
        if (linha?.status === 'AGUARDANDO_ENTREGADOR' && linha.id) {
          cb({ tipo: 'CORRIDA_DISPONIVEL', pedidoId: linha.id });
        }
      })
      .subscribe();
    return () => void sb().removeChannel(canal);
  },
};
