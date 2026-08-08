import { type SupabaseClient, createClient } from '@supabase/supabase-js';

export type ConfigSupabase = { url: string; chaveAnon: string };

let cliente: SupabaseClient | null = null;

export function conectar(config: ConfigSupabase): SupabaseClient {
  cliente = createClient(config.url, config.chaveAnon, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return cliente;
}

export function sb(): SupabaseClient {
  if (!cliente) throw new Error('Supabase nao conectado. Chame conectar() antes.');
  return cliente;
}

/**
 * O PostgREST devolve a mensagem do RAISE EXCEPTION do Postgres. Como as regras
 * de negocio vivem no banco, essa mensagem ja e legivel para o usuario final
 * ("Restaurante fechado no momento", "Endereco a 12 km, fora do raio de 10 km").
 */
export function erroLegivel(erro: unknown, padrao: string): Error {
  if (erro && typeof erro === 'object' && 'message' in erro) {
    const msg = String((erro as { message: unknown }).message);
    // erros de infraestrutura nao devem vazar para a tela
    if (/JWT|permission denied|violates row-level|PGRST|fetch failed/i.test(msg)) {
      return new Error(padrao);
    }
    return new Error(msg);
  }
  return new Error(padrao);
}
