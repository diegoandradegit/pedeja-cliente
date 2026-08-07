import type { Pedido } from '@pedeja/domain';

export type EventoPedido =
  | { tipo: 'PEDIDO_CRIADO'; pedido: Pedido }
  | { tipo: 'STATUS_MUDOU'; pedido: Pedido }
  | { tipo: 'CORRIDA_DISPONIVEL'; pedidoId: string };

export interface RealtimeRepo {
  /**
   * Canal do restaurante. No Supabase isto fica protegido por RLS — diferente
   * do ws/:id original, onde bastava trocar o numero na URL para escutar os
   * pedidos de qualquer loja.
   */
  assinarEstabelecimento(id: string, cb: (e: EventoPedido) => void): () => void;
  assinarPedido(pedidoId: string, cb: (e: EventoPedido) => void): () => void;
  assinarCorridas(cb: (e: EventoPedido) => void): () => void;
}
