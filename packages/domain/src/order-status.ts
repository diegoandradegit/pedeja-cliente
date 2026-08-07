/**
 * Maquina de estados do pedido.
 *
 * O sistema original tinha status soltos (AWAIT_APPROVE / REQUEST_APPROVE) sem
 * nenhuma validacao de transicao — era possivel pular de "criado" direto para
 * "entregue" via PUT /orders/status, sem autenticacao. Aqui a transicao e um
 * grafo explicito e cada aresta declara quem pode percorre-la.
 */
export const STATUS_PEDIDO = [
  'PENDENTE',
  'ACEITO',
  'EM_PREPARO',
  'PRONTO',
  'AGUARDANDO_ENTREGADOR',
  'EM_ROTA',
  'ENTREGUE',
  'RETIRADO',
  'CANCELADO',
] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export type Ator = 'CLIENTE' | 'RESTAURANTE' | 'ENTREGADOR' | 'SISTEMA';

export type TipoEntrega = 'ENTREGA' | 'RETIRADA';

type Transicao = { de: StatusPedido; para: StatusPedido; atores: readonly Ator[] };

const TRANSICOES: readonly Transicao[] = [
  { de: 'PENDENTE', para: 'ACEITO', atores: ['RESTAURANTE'] },
  { de: 'PENDENTE', para: 'CANCELADO', atores: ['CLIENTE', 'RESTAURANTE', 'SISTEMA'] },
  { de: 'ACEITO', para: 'EM_PREPARO', atores: ['RESTAURANTE'] },
  { de: 'ACEITO', para: 'CANCELADO', atores: ['CLIENTE', 'RESTAURANTE'] },
  { de: 'EM_PREPARO', para: 'PRONTO', atores: ['RESTAURANTE'] },
  { de: 'EM_PREPARO', para: 'CANCELADO', atores: ['RESTAURANTE'] },
  { de: 'PRONTO', para: 'AGUARDANDO_ENTREGADOR', atores: ['RESTAURANTE', 'SISTEMA'] },
  { de: 'PRONTO', para: 'RETIRADO', atores: ['RESTAURANTE'] },
  { de: 'AGUARDANDO_ENTREGADOR', para: 'EM_ROTA', atores: ['ENTREGADOR'] },
  { de: 'EM_ROTA', para: 'ENTREGUE', atores: ['ENTREGADOR'] },
];

export const STATUS_FINAIS: readonly StatusPedido[] = ['ENTREGUE', 'RETIRADO', 'CANCELADO'];

export function ehStatusFinal(s: StatusPedido): boolean {
  return STATUS_FINAIS.includes(s);
}

export function podeTransicionar(de: StatusPedido, para: StatusPedido, ator: Ator): boolean {
  return TRANSICOES.some((t) => t.de === de && t.para === para && t.atores.includes(ator));
}

export function proximosStatus(de: StatusPedido, ator: Ator): StatusPedido[] {
  return TRANSICOES.filter((t) => t.de === de && t.atores.includes(ator)).map((t) => t.para);
}

export class TransicaoInvalidaError extends Error {
  constructor(
    readonly de: StatusPedido,
    readonly para: StatusPedido,
    readonly ator: Ator,
  ) {
    super(`Transicao invalida: ${de} -> ${para} por ${ator}`);
    this.name = 'TransicaoInvalidaError';
  }
}

export function garantirTransicao(de: StatusPedido, para: StatusPedido, ator: Ator): void {
  if (!podeTransicionar(de, para, ator)) throw new TransicaoInvalidaError(de, para, ator);
}

/** Status inicial do fluxo conforme o tipo de entrega escolhido. */
export function fluxoFinalEsperado(tipo: TipoEntrega): StatusPedido {
  return tipo === 'ENTREGA' ? 'ENTREGUE' : 'RETIRADO';
}
