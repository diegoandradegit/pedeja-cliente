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

export type EntregadorDaLoja = {
  usuarioId: string;
  nome: string;
  telefone: string;
  ativo: boolean;
  criadoEm: string;
};

export interface DeliveryRepo {
  /** Convite: o restaurante gera o codigo, o entregador se cadastra com ele. */
  gerarConvite(estabelecimentoId: string): Promise<string>;
  usarConvite(codigo: string): Promise<void>;
  entregadoresDaLoja(estabelecimentoId: string): Promise<EntregadorDaLoja[]>;
  definirEntregadorAtivo(usuarioId: string, ativo: boolean): Promise<void>;
  corridasDisponiveis(): Promise<Corrida[]>;
  /** Aceite com trava: retorna null se outro entregador pegou primeiro. */
  aceitarCorrida(pedidoId: string, entregadorId: string): Promise<Pedido | null>;
  corridaAtiva(entregadorId: string): Promise<Pedido | null>;
  extrato(entregadorId: string, desde: string): Promise<LinhaExtrato[]>;
}
