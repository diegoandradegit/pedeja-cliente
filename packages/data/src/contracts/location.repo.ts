import type { Coordenada } from '@pedeja/domain';

export type LocalizacaoEntregador = {
  pedidoId: string;
  coordenada: Coordenada;
  em: string;
};

/**
 * Posicao do entregador durante a corrida. Igual aos outros contratos: a UI
 * so conhece esta interface, nao sabe se vem do mock ou do Supabase.
 */
export interface LocationRepo {
  /** Enviado pelo app do entregador enquanto o pedido esta EM_ROTA. */
  atualizar(pedidoId: string, coordenada: Coordenada): Promise<void>;
  /** Ultima posicao conhecida, ou null se ainda nao ha. */
  obter(pedidoId: string): Promise<LocalizacaoEntregador | null>;
  /** Acompanha as atualizacoes; devolve a funcao de cancelar. */
  assinar(pedidoId: string, cb: (loc: LocalizacaoEntregador) => void): () => void;
}
