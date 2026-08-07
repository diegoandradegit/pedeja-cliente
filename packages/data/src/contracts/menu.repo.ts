import type { Adicional, Categoria, Estabelecimento, Produto } from '@pedeja/domain';

export interface MenuRepo {
  listarEstabelecimentos(): Promise<Estabelecimento[]>;
  obterEstabelecimento(id: string): Promise<Estabelecimento | null>;
  listarCategorias(estabelecimentoId: string): Promise<Categoria[]>;
  listarProdutos(estabelecimentoId: string): Promise<Produto[]>;
  listarAdicionais(estabelecimentoId: string): Promise<Adicional[]>;
  salvarProduto(p: Omit<Produto, 'id'> & { id?: string }): Promise<Produto>;
  removerProduto(id: string): Promise<void>;
  salvarCategoria(c: Omit<Categoria, 'id'> & { id?: string }): Promise<Categoria>;
}
