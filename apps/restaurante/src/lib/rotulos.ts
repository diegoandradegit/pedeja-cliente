import type { FormaPagamento, StatusPedido } from '@pedeja/domain';

/** Rotulo do status como o restaurante fala, nao como o sistema guarda. */
export const ROTULO_STATUS: Record<StatusPedido, string> = {
  PENDENTE: 'Aguardando aceite',
  ACEITO: 'Aceito',
  EM_PREPARO: 'Na cozinha',
  PRONTO: 'Pronto',
  AGUARDANDO_ENTREGADOR: 'Aguardando entregador',
  EM_ROTA: 'Saiu para entrega',
  ENTREGUE: 'Entregue',
  RETIRADO: 'Retirado',
  CANCELADO: 'Cancelado',
};

/** Texto do botao: o que acontece ao tocar, em voz ativa. */
export const ACAO_STATUS: Record<StatusPedido, string> = {
  PENDENTE: 'Voltar para aguardando',
  ACEITO: 'Aceitar pedido',
  EM_PREPARO: 'Mandar para a cozinha',
  PRONTO: 'Marcar como pronto',
  AGUARDANDO_ENTREGADOR: 'Chamar entregador',
  EM_ROTA: 'Saiu para entrega',
  ENTREGUE: 'Confirmar entrega',
  RETIRADO: 'Cliente retirou',
  CANCELADO: 'Cancelar pedido',
};

export const ROTULO_PAGAMENTO: Record<FormaPagamento, string> = {
  PIX: 'Pix',
  CREDITO: 'Cartão de crédito',
  DEBITO: 'Cartão de débito',
  DINHEIRO: 'Dinheiro',
};

/** Colunas do trilho, na ordem em que o pedido caminha. */
export const COLUNAS: StatusPedido[] = [
  'PENDENTE',
  'ACEITO',
  'EM_PREPARO',
  'PRONTO',
  'AGUARDANDO_ENTREGADOR',
  'EM_ROTA',
];
