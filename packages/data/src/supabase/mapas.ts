import type {
  Adicional,
  Categoria,
  ConfigFrete,
  Estabelecimento,
  FaixaHorario,
  ItemPedido,
  Pedido,
  Produto,
} from '@pedeja/domain';

/**
 * Traducao entre o banco (snake_case, numeric como string) e o dominio
 * (camelCase, numeros). Isolada aqui para que nenhum outro arquivo precise
 * conhecer o formato das linhas.
 */

type LinhaEstabelecimento = {
  id: string;
  nome: string;
  descricao: string;
  imagem: string | null;
  capa: string | null;
  endereco: string;
  lat: number;
  lng: number;
  aceita_retirada: boolean;
  avaliacao: string | number | null;
  avaliacoes_total: number;
  tempo_min: number;
  tempo_max: number;
  regra_preco_fracionado: 'MAIOR' | 'MEDIA';
  ativo: boolean;
  horarios?: { dia_semana: number; abre: string; fecha: string }[];
};

const hhmm = (t: string): string => t.slice(0, 5);

export function paraEstabelecimento(l: LinhaEstabelecimento): Estabelecimento {
  const horarios: FaixaHorario[] = (l.horarios ?? []).map((h) => ({
    diaSemana: h.dia_semana,
    abre: hhmm(h.abre),
    fecha: hhmm(h.fecha),
  }));
  return {
    id: l.id,
    nome: l.nome,
    descricao: l.descricao,
    imagem: l.imagem,
    capa: l.capa,
    coordenada: { lat: l.lat, lng: l.lng },
    endereco: l.endereco,
    horarios,
    aceitaRetirada: l.aceita_retirada,
    avaliacao: l.avaliacao === null ? null : Number(l.avaliacao),
    avaliacoesTotal: l.avaliacoes_total,
    tempoMin: l.tempo_min,
    tempoMax: l.tempo_max,
    regraPrecoFracionado: l.regra_preco_fracionado,
    ativo: l.ativo,
  };
}

export function paraCategoria(l: {
  id: string;
  estabelecimento_id: string;
  nome: string;
  ordem: number;
  max_sabores: number;
}): Categoria {
  return {
    id: l.id,
    estabelecimentoId: l.estabelecimento_id,
    nome: l.nome,
    ordem: l.ordem,
    maxSabores: l.max_sabores,
  };
}

export function paraProduto(l: {
  id: string;
  estabelecimento_id: string;
  categoria_id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem: string | null;
  ativo: boolean;
  produto_adicionais?: { adicional_id: string }[];
}): Produto {
  return {
    id: l.id,
    estabelecimentoId: l.estabelecimento_id,
    categoriaId: l.categoria_id,
    nome: l.nome,
    descricao: l.descricao,
    preco: l.preco,
    imagem: l.imagem,
    adicionaisIds: (l.produto_adicionais ?? []).map((x) => x.adicional_id),
    ativo: l.ativo,
  };
}

export function paraAdicional(l: {
  id: string;
  nome: string;
  preco: number;
  ativo: boolean;
}): Adicional {
  return { id: l.id, nome: l.nome, preco: l.preco, ativo: l.ativo };
}

export function paraConfigFrete(l: {
  estabelecimento_id: string;
  taxa_fixa: number;
  preco_por_km: number;
  raio_maximo_km: string | number;
  frete_gratis_acima_de: number | null;
}): ConfigFrete {
  return {
    estabelecimentoId: l.estabelecimento_id,
    taxaFixa: l.taxa_fixa,
    precoPorKm: l.preco_por_km,
    // numeric chega como string no driver
    raioMaximoKm: Number(l.raio_maximo_km),
    freteGratisAcimaDe: l.frete_gratis_acima_de,
  };
}

type LinhaItem = {
  quantidade: number;
  nome_produto: string;
  preco_unitario: number;
  subtotal: number;
  observacao: string | null;
  sabores: { id: string; nome: string }[];
  adicionais: { id: string; nome: string; preco: number }[];
};

function paraItem(l: LinhaItem): ItemPedido {
  const sabores = l.sabores ?? [];
  return {
    produtoId: sabores[0]?.id ?? '',
    sabores,
    nomeProduto: l.nome_produto,
    quantidade: l.quantidade,
    precoUnitario: l.preco_unitario,
    adicionais: l.adicionais ?? [],
    subtotal: l.subtotal,
    ...(l.observacao ? { observacao: l.observacao } : {}),
  };
}

type LinhaPedido = {
  id: string;
  numero: number;
  estabelecimento_id: string;
  cliente_id: string | null;
  cliente_local_id: string | null;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_entrega: 'ENTREGA' | 'RETIRADA';
  endereco: Pedido['endereco'];
  distancia_km: string | number | null;
  subtotal: number;
  frete: number;
  desconto: number;
  total: number;
  forma_pagamento: Pedido['formaPagamento'];
  troco_para: number | null;
  status: Pedido['status'];
  entregador_id: string | null;
  criado_em: string;
  atualizado_em: string;
  itens_pedido?: LinhaItem[];
};

export function paraPedido(l: LinhaPedido): Pedido {
  return {
    id: l.id,
    numero: l.numero,
    estabelecimentoId: l.estabelecimento_id,
    clienteId: l.cliente_id ?? l.cliente_local_id ?? '',
    clienteNome: l.cliente_nome,
    clienteTelefone: l.cliente_telefone,
    itens: (l.itens_pedido ?? []).map(paraItem),
    tipoEntrega: l.tipo_entrega,
    endereco: l.endereco,
    distanciaKm: l.distancia_km === null ? null : Number(l.distancia_km),
    subtotal: l.subtotal,
    frete: l.frete,
    desconto: l.desconto,
    total: l.total,
    formaPagamento: l.forma_pagamento,
    trocoPara: l.troco_para,
    status: l.status,
    entregadorId: l.entregador_id,
    criadoEm: l.criado_em,
    atualizadoEm: l.atualizado_em,
  };
}

export const SELECT_PEDIDO = '*, itens_pedido(*)';
export const SELECT_LOJA = '*, horarios(dia_semana, abre, fecha)';
export const SELECT_PRODUTO = '*, produto_adicionais(adicional_id)';

/** Resposta da RPC acompanhar_pedido: pedido + loja + itens + histórico. */
export function paraAcompanhamento(d: Record<string, unknown>): {
  pedido: Pedido;
  estabelecimento: { id: string; nome: string; imagem: string | null; endereco: string };
  historico: { de: Pedido['status'] | null; para: Pedido['status']; em: string }[];
} {
  const bruto = d.pedido as Record<string, unknown>;
  const itens = (d.itens ?? []) as LinhaItem[];
  return {
    pedido: paraPedido({ ...bruto, itens_pedido: itens } as unknown as LinhaPedido),
    estabelecimento: d.estabelecimento as {
      id: string;
      nome: string;
      imagem: string | null;
      endereco: string;
    },
    historico: (d.historico ?? []) as {
      de: Pedido['status'] | null;
      para: Pedido['status'];
      em: string;
    }[],
  };
}
