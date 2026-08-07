import { beforeEach, describe, expect, it } from 'vitest';
import type { DataProvider } from './contracts/index.js';
import { mockProvider, resetarMock } from './mock/index.js';

/**
 * Suite de contrato. Na Fase 6 basta trocar `providers` por
 * [['mock', mockProvider], ['supabase', supabaseProvider]] e os mesmos testes
 * validam que o banco real se comporta igual ao mock.
 */
const providers: [string, DataProvider][] = [['mock', mockProvider]];

const endereco = {
  cep: '87020-000',
  logradouro: 'Av. Brasil',
  numero: '500',
  bairro: 'Centro',
  cidade: 'Maringa',
  uf: 'PR',
  coordenada: { lat: -23.425, lng: -51.938 },
};

for (const [nome, p] of providers) {
  describe(`contrato: ${nome}`, () => {
    beforeEach(() => resetarMock());

    it('cotar usa preco do catalogo', async () => {
      const c = await p.orders.cotar(
        'e1',
        [{ produtoId: 'p1', quantidade: 2, adicionaisIds: ['a1'] }],
        endereco.coordenada,
      );
      expect(c.subtotal).toBe(6000);
      expect(c.frete).toBeGreaterThan(0);
      expect(c.total).toBe(c.subtotal + c.frete);
    });

    it('criar pedido ignora qualquer preco vindo do cliente', async () => {
      const pedido = await p.orders.criar({
        estabelecimentoId: 'e1',
        itens: [{ produtoId: 'p1', quantidade: 1, adicionaisIds: [] }],
        tipoEntrega: 'ENTREGA',
        endereco,
        formaPagamento: 'PIX',
        trocoPara: null,
        clienteNome: 'Teste',
        clienteTelefone: '44999990000',
      });
      expect(pedido.itens[0]?.precoUnitario).toBe(2500);
      expect(pedido.status).toBe('PENDENTE');
      expect(pedido.total).toBe(pedido.subtotal + pedido.frete);
    });

    it('recusa transicao invalida de status', async () => {
      const pedido = await p.orders.criar({
        estabelecimentoId: 'e1',
        itens: [{ produtoId: 'p1', quantidade: 1, adicionaisIds: [] }],
        tipoEntrega: 'RETIRADA',
        endereco: null,
        formaPagamento: 'DINHEIRO',
        trocoPara: null,
        clienteNome: 'Teste',
        clienteTelefone: '44999990000',
      });
      await expect(p.orders.mudarStatus(pedido.id, 'ENTREGUE', 'CLIENTE')).rejects.toThrow();
    });

    it('emite evento realtime ao criar pedido', async () => {
      const recebidos: string[] = [];
      const off = p.realtime.assinarEstabelecimento('e1', (e) => recebidos.push(e.tipo));
      await p.orders.criar({
        estabelecimentoId: 'e1',
        itens: [{ produtoId: 'p3', quantidade: 1, adicionaisIds: [] }],
        tipoEntrega: 'RETIRADA',
        endereco: null,
        formaPagamento: 'PIX',
        trocoPara: null,
        clienteNome: 'Teste',
        clienteTelefone: '44999990000',
      });
      off();
      expect(recebidos).toContain('PEDIDO_CRIADO');
    });

    it('so um entregador leva a corrida', async () => {
      const pedido = await p.orders.criar({
        estabelecimentoId: 'e1',
        itens: [{ produtoId: 'p1', quantidade: 1, adicionaisIds: [] }],
        tipoEntrega: 'ENTREGA',
        endereco,
        formaPagamento: 'PIX',
        trocoPara: null,
        clienteNome: 'Teste',
        clienteTelefone: '44999990000',
      });
      await p.orders.mudarStatus(pedido.id, 'ACEITO', 'RESTAURANTE');
      await p.orders.mudarStatus(pedido.id, 'EM_PREPARO', 'RESTAURANTE');
      await p.orders.mudarStatus(pedido.id, 'PRONTO', 'RESTAURANTE');
      await p.orders.mudarStatus(pedido.id, 'AGUARDANDO_ENTREGADOR', 'RESTAURANTE');

      const [a, b] = await Promise.all([
        p.delivery.aceitarCorrida(pedido.id, 'ent1'),
        p.delivery.aceitarCorrida(pedido.id, 'ent2'),
      ]);
      expect([a, b].filter(Boolean)).toHaveLength(1);
    });
  });
}
