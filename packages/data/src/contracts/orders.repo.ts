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

export interface OrdersRepo {
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
