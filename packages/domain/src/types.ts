import type { Centavos } from './money.js';
import type { StatusPedido, TipoEntrega } from './order-status.js';

export type Coordenada = { lat: number; lng: number };

export type Adicional = {
  id: string;
  nome: string;
  preco: Centavos;
  ativo: boolean;
};

export type Produto = {
  id: string;
  estabelecimentoId: string;
  nome: string;
  descricao: string;
  preco: Centavos;
  imagem: string | null;
  categoriaId: string;
  adicionaisIds: string[];
  ativo: boolean;
};

export type Categoria = {
  id: string;
  estabelecimentoId: string;
  nome: string;
  ordem: number;
  /** Sabores por item. 1 = normal; 2 = pizza meio a meio. */
  maxSabores: number;
};

export type ConfigFrete = {
  estabelecimentoId: string;
  taxaFixa: Centavos;
  precoPorKm: Centavos;
  raioMaximoKm: number;
  freteGratisAcimaDe: Centavos | null;
};

export type FaixaHorario = { diaSemana: number; abre: string; fecha: string };

export type Estabelecimento = {
  id: string;
  nome: string;
  descricao: string;
  /** Marca redonda, exibida sobreposta a capa. */
  imagem: string | null;
  /** Foto larga de topo. */
  capa: string | null;
  coordenada: Coordenada;
  endereco: string;
  horarios: FaixaHorario[];
  aceitaRetirada: boolean;
  /** Como cobrar item com mais de um sabor: pelo mais caro ou pela média. */
  regraPrecoFracionado: RegraFracionado;
  ativo: boolean;
};

export const REGRAS_FRACIONADO = ['MAIOR', 'MEDIA'] as const;
export type RegraFracionado = (typeof REGRAS_FRACIONADO)[number];

/**
 * O que o CLIENTE envia no checkout. Repare que nao existe campo de preco:
 * o cliente so escolhe o que quer, o servidor decide quanto custa.
 */
export type ItemCarrinho = {
  produtoId: string;
  /** Meio a meio: sabores além do principal, da mesma categoria. */
  saboresExtras?: string[];
  quantidade: number;
  adicionaisIds: string[];
  observacao?: string;
};

/** Item ja precificado e congelado no pedido. */
export type ItemPedido = {
  produtoId: string;
  /** Todos os sabores do item, na ordem escolhida. */
  sabores: { id: string; nome: string }[];
  nomeProduto: string;
  quantidade: number;
  precoUnitario: Centavos;
  adicionais: { id: string; nome: string; preco: Centavos }[];
  subtotal: Centavos;
  observacao?: string;
};

export type EnderecoEntrega = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  coordenada: Coordenada;
};

export type FormaPagamento = 'PIX' | 'CREDITO' | 'DEBITO' | 'DINHEIRO';

export type Pedido = {
  id: string;
  numero: number;
  estabelecimentoId: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  itens: ItemPedido[];
  tipoEntrega: TipoEntrega;
  endereco: EnderecoEntrega | null;
  distanciaKm: number | null;
  subtotal: Centavos;
  frete: Centavos;
  desconto: Centavos;
  total: Centavos;
  formaPagamento: FormaPagamento;
  trocoPara: Centavos | null;
  status: StatusPedido;
  entregadorId: string | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type EventoStatus = {
  pedidoId: string;
  de: StatusPedido | null;
  para: StatusPedido;
  ator: string;
  em: string;
};
