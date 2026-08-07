import type { Pedido } from '@pedeja/domain';
import { adicionais, categorias, configsFrete, estabelecimentos, produtos } from './seed.js';

const CHAVE = 'pedeja:mock:v1';

export type Estado = {
  estabelecimentos: typeof estabelecimentos;
  categorias: typeof categorias;
  produtos: typeof produtos;
  adicionais: typeof adicionais;
  configsFrete: typeof configsFrete;
  pedidos: Pedido[];
  proximoNumero: number;
};

const inicial = (): Estado => ({
  estabelecimentos: structuredClone(estabelecimentos),
  categorias: structuredClone(categorias),
  produtos: structuredClone(produtos),
  adicionais: structuredClone(adicionais),
  configsFrete: structuredClone(configsFrete),
  pedidos: [],
  proximoNumero: 1,
});

let estado: Estado | null = null;

const temStorage = (): boolean => typeof localStorage !== 'undefined';

export function ler(): Estado {
  if (estado) return estado;
  if (temStorage()) {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      try {
        estado = JSON.parse(bruto) as Estado;
        return estado;
      } catch {
        // storage corrompido: recomeca do seed
      }
    }
  }
  estado = inicial();
  return estado;
}

export function gravar(mutacao: (e: Estado) => void): void {
  const e = ler();
  mutacao(e);
  if (temStorage()) localStorage.setItem(CHAVE, JSON.stringify(e));
}

export function resetar(): void {
  estado = inicial();
  if (temStorage()) localStorage.removeItem(CHAVE);
}

/** Latencia artificial: obriga a UI a lidar com loading desde o mock. */
export const atraso = (ms = 180): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const novoId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2, 10)}`;
