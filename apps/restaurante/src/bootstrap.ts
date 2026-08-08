import { setProvider } from '@pedeja/data';

/**
 * Único ponto do app que conhece uma implementação concreta.
 * VITE_DATA_PROVIDER decide qual entra; nenhum componente muda.
 */
export async function configurarDados(): Promise<void> {
  const alvo = import.meta.env.VITE_DATA_PROVIDER ?? 'mock';

  if (alvo === 'supabase') {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !chave) {
      throw new Error(
        'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias com VITE_DATA_PROVIDER=supabase',
      );
    }
    const { criarSupabaseProvider } = await import('@pedeja/data/supabase');
    setProvider(criarSupabaseProvider({ url, chaveAnon: chave }));
    return;
  }

  const { mockProvider } = await import('@pedeja/data/mock');
  setProvider(mockProvider);
}
