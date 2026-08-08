import type { Adicional, Categoria, Estabelecimento, FaixaHorario, Produto } from '@pedeja/domain';

export interface MenuRepo {
  listarEstabelecimentos(): Promise<Estabelecimento[]>;
  obterEstabelecimento(id: string): Promise<Estabelecimento | null>;
  listarCategorias(estabelecimentoId: string): Promise<Categoria[]>;
  listarProdutos(estabelecimentoId: string): Promise<Produto[]>;
  listarAdicionais(estabelecimentoId: string): Promise<Adicional[]>;
  salvarProduto(p: Omit<Produto, 'id'> & { id?: string }): Promise<Produto>;
  removerProduto(id: string): Promise<void>;
  salvarCategoria(c: Omit<Categoria, 'id'> & { id?: string }): Promise<Categoria>;
  removerCategoria(id: string): Promise<void>;
  salvarAdicional(
    a: Omit<Adicional, 'id'> & { id?: string; estabelecimentoId: string },
  ): Promise<Adicional>;
  removerAdicional(id: string): Promise<void>;
  salvarEstabelecimento(e: Estabelecimento): Promise<Estabelecimento>;
  salvarHorarios(estabelecimentoId: string, faixas: FaixaHorario[]): Promise<void>;
}
