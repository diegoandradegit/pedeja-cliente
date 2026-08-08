import type {
  Ator,
  Centavos,
  ConfigFrete,
  Coordenada,
  EnderecoEntrega,
  FormaPagamento,
  ItemCarrinho,
  Pedido,
  StatusPedido,
  TipoEntrega,
} from '@pedeja/domain';

/**
 * Entrada do checkout. Nao existe campo de preco, frete ou total: quem calcula
 * e o servidor. Essa assinatura e a barreira de tipo que impede o bug do
 * projeto original, onde o cliente enviava o pedido ja precificado.
 */
export type NovoPedido = {
  estabelecimentoId: string;
  itens: ItemCarrinho[];
  tipoEntrega: TipoEntrega;
  endereco: EnderecoEntrega | null;
  formaPagamento: FormaPagamento;
  trocoPara: Centavos | null;
  clienteNome: string;
  clienteTelefone: string;
};

export type Cotacao = {
  distanciaKm: number | null;
  subtotal: Centavos;
  frete: Centavos;
  total: Centavos;
};

/** Pedido com tudo que a tela de acompanhamento precisa, em uma chamada. */
export type Acompanhamento = {
  pedido: Pedido;
  estabelecimento: { id: string; nome: string; imagem: string | null; endereco: string };
  historico: { de: StatusPedido | null; para: StatusPedido; em: string }[];
};

export interface OrdersRepo {
  /**
   * Acompanhar pelo id do pedido, sem login. O id e a credencial: quem o tem
   * ve aquele pedido, e ninguem consegue listar os dos outros.
   */
  acompanhar(pedidoId: string): Promise<Acompanhamento>;
  /** Adota, para a conta logada, os pedidos feitos antes como visitante. */
  vincularPedidos(pedidoIds: string[]): Promise<number>;
  cotar(
    estabelecimentoId: string,
    itens: ItemCarrinho[],
    destino: Coordenada | null,
  ): Promise<Cotacao>;
  criar(entrada: NovoPedido): Promise<Pedido>;
  obter(id: string): Promise<Pedido | null>;
  listarPorEstabelecimento(estabelecimentoId: string, apenasAtivos?: boolean): Promise<Pedido[]>;
  listarPorCliente(clienteId: string): Promise<Pedido[]>;
  mudarStatus(pedidoId: string, novo: StatusPedido, ator: Ator): Promise<Pedido>;
  obterConfigFrete(estabelecimentoId: string): Promise<ConfigFrete>;
  salvarConfigFrete(config: ConfigFrete): Promise<ConfigFrete>;
}
