export type Papel = 'CLIENTE' | 'RESTAURANTE' | 'ENTREGADOR';

export type Sessao = {
  usuarioId: string;
  nome: string;
  email: string;
  papel: Papel;
  /** Preenchido apenas para papel RESTAURANTE. */
  estabelecimentoId: string | null;
};

export interface AuthRepo {
  sessaoAtual(): Promise<Sessao | null>;
  entrar(email: string, senha: string, papel: Papel): Promise<Sessao>;
  sair(): Promise<void>;
  aoMudarSessao(cb: (s: Sessao | null) => void): () => void;
}
