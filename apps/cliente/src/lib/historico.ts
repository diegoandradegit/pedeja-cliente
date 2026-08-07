/**
 * Historico local dos pedidos feitos neste aparelho. Sem login nao ha como
 * saber quem e o cliente, entao guardamos os ids aqui. Na Fase 6 o Supabase
 * Auth passa a ser a fonte e isto vira so um fallback para visitante.
 */
const CHAVE = 'pedeja:meus-pedidos:v1';

export function registrar(pedidoId: string): void {
  if (typeof localStorage === 'undefined') return;
  const atuais = listar().filter((id) => id !== pedidoId);
  localStorage.setItem(CHAVE, JSON.stringify([pedidoId, ...atuais].slice(0, 40)));
}

export function listar(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as string[]) : [];
  } catch {
    return [];
  }
}
