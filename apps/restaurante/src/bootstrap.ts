import { setProvider } from '@pedeja/data';

/**
 * Único ponto do app que conhece uma implementação concreta. Na Fase 6,
 * adicionamos o caso 'supabase' aqui e nada mais no app muda.
 */
export async function configurarDados(): Promise<void> {
  const alvo = import.meta.env.VITE_DATA_PROVIDER ?? 'mock';

  if (alvo === 'supabase') {
    throw new Error('Provider supabase ainda não implementado (Fase 6).');
  }

  const { mockProvider } = await import('@pedeja/data/mock');
  setProvider(mockProvider);
}
