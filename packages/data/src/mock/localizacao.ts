import { type Coordenada, interpolar } from '@pedeja/domain';
import type { LocalizacaoEntregador, LocationRepo } from '../contracts/location.repo.js';
import { ler } from './store.js';

const posicoes = new Map<string, LocalizacaoEntregador>();
const ouvintes = new Map<string, Set<(l: LocalizacaoEntregador) => void>>();
const simulacoes = new Map<string, ReturnType<typeof setInterval>>();

function emitir(loc: LocalizacaoEntregador): void {
  posicoes.set(loc.pedidoId, loc);
  for (const cb of ouvintes.get(loc.pedidoId) ?? []) cb(loc);
}

/**
 * Sem entregador de verdade, o mock caminha sozinho da loja ate o cliente em
 * ~2 minutos. Serve para ver a tela funcionando sem depender do Supabase nem
 * de alguem andando de moto.
 */
function simular(pedidoId: string): void {
  if (simulacoes.has(pedidoId)) return;
  const e = ler();
  const pedido = e.pedidos.find((p) => p.id === pedidoId);
  const loja = e.estabelecimentos.find((x) => x.id === pedido?.estabelecimentoId);
  const destino = pedido?.endereco?.coordenada;
  if (!pedido || !loja || !destino) return;

  const origem: Coordenada = loja.coordenada;
  let passo = 0;
  const total = 24;

  const t = setInterval(() => {
    passo += 1;
    emitir({
      pedidoId,
      coordenada: interpolar(origem, destino, passo / total),
      em: new Date().toISOString(),
    });
    if (passo >= total) {
      clearInterval(t);
      simulacoes.delete(pedidoId);
    }
  }, 5000);

  simulacoes.set(pedidoId, t);
  emitir({ pedidoId, coordenada: origem, em: new Date().toISOString() });
}

export const localizacaoMock: LocationRepo = {
  async atualizar(pedidoId, coordenada) {
    emitir({ pedidoId, coordenada, em: new Date().toISOString() });
  },

  async obter(pedidoId) {
    return posicoes.get(pedidoId) ?? null;
  },

  assinar(pedidoId, cb) {
    const set = ouvintes.get(pedidoId) ?? new Set();
    set.add(cb);
    ouvintes.set(pedidoId, set);
    simular(pedidoId);
    const atual = posicoes.get(pedidoId);
    if (atual) cb(atual);
    return () => {
      set.delete(cb);
      if (set.size === 0) {
        const t = simulacoes.get(pedidoId);
        if (t) clearInterval(t);
        simulacoes.delete(pedidoId);
      }
    };
  },
};
