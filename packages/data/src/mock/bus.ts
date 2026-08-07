import type { EventoPedido } from '../contracts/realtime.repo.js';

type Ouvinte = (e: EventoPedido) => void;

const locais = new Map<string, Set<Ouvinte>>();

const canalCross: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pedeja:mock') : null;

if (canalCross) {
  canalCross.onmessage = (msg: MessageEvent<{ canal: string; evento: EventoPedido }>) => {
    for (const ou of locais.get(msg.data.canal) ?? []) ou(msg.data.evento);
  };
}

export function assinar(canal: string, cb: Ouvinte): () => void {
  const set = locais.get(canal) ?? new Set<Ouvinte>();
  set.add(cb);
  locais.set(canal, set);
  return () => {
    set.delete(cb);
  };
}

/**
 * Publica em todos os ouvintes desta aba e nas outras abas abertas. Permite
 * testar o fluxo completo (cliente faz pedido -> aparece no kanban) com dois
 * navegadores lado a lado, sem backend nenhum.
 */
export function publicar(canal: string, evento: EventoPedido): void {
  for (const ou of locais.get(canal) ?? []) ou(evento);
  canalCross?.postMessage({ canal, evento });
}

export const canalEstabelecimento = (id: string): string => `estabelecimento:${id}`;
export const canalPedido = (id: string): string => `pedido:${id}`;
export const CANAL_CORRIDAS = 'corridas';
