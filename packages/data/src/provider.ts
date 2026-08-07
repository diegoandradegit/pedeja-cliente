import type { DataProvider } from './contracts/index.js';

let atual: DataProvider | null = null;

/**
 * A UI só conhece esta função. Trocar mock -> supabase na Fase 6 é trocar o
 * setProvider() feito no bootstrap de cada app; nenhum componente muda.
 */
export function setProvider(p: DataProvider): void {
  atual = p;
}

export function getProvider(): DataProvider {
  if (!atual) {
    throw new Error(
      'DataProvider nao configurado. Chame setProvider() no bootstrap do app antes de renderizar.',
    );
  }
  return atual;
}
