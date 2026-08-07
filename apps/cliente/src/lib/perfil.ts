/**
 * melhoria: dados do cliente guardados neste aparelho. No original a aba
 * Configuracoes existia sem conteudo e o checkout pedia tudo de novo a cada
 * pedido. Aqui a aba tem funcao e o checkout ja vem preenchido.
 */
const CHAVE = 'pedeja:perfil:v1';

export type Perfil = {
  nome: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export const PERFIL_VAZIO: Perfil = {
  nome: '',
  telefone: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
};

export function ler(): Perfil {
  if (typeof localStorage === 'undefined') return PERFIL_VAZIO;
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? { ...PERFIL_VAZIO, ...(JSON.parse(bruto) as Partial<Perfil>) } : PERFIL_VAZIO;
  } catch {
    return PERFIL_VAZIO;
  }
}

export function gravar(p: Perfil): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(CHAVE, JSON.stringify(p));
}
