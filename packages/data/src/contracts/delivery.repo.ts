import type { Centavos, Pedido } from '@pedeja/domain';

export type Corrida = {
  pedidoId: string;
  numero: number;
  estabelecimentoNome: string;
  enderecoResumo: string;
  distanciaKm: number;
  ganho: Centavos;
  criadoEm: string;
};

export type LinhaExtrato = { pedidoId: string; numero: number; ganho: Centavos; em: string };

export interface DeliveryRepo {
  corridasDisponiveis(): Promise<Corrida[]>;
  /** Aceite com trava: retorna null se outro entregador pegou primeiro. */
  aceitarCorrida(pedidoId: string, entregadorId: string): Promise<Pedido | null>;
  corridaAtiva(entregadorId: string): Promise<Pedido | null>;
  extrato(entregadorId: string, desde: string): Promise<LinhaExtrato[]>;
}
