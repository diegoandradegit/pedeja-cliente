import { beforeEach, describe, expect, it } from 'vitest';
import type { DataProvider } from './contracts/index.js';
import { mockProvider, resetarMock } from './mock/index.js';
import { criarSupabaseProvider } from './supabase/index.js';

/**
 * Suite de contrato: os mesmos testes rodam contra qualquer implementacao.
 * O provider Supabase so entra quando ha credencial no ambiente — assim a
 * suite roda offline (CI, maquina sem rede) sem falhar por falta de banco.
 *
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... pnpm test
 */
const providers: [string, DataProvider][] = [['mock', mockProvider]];

const url = process.env.SUPABASE_URL;
const chave = process.env.SUPABASE_ANON_KEY;
if (url && chave) {
  providers.push(['supabase', criarSupabaseProvider({ url, chaveAnon: chave })]);
}

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
    let lojaId: string;
    let produtoId: string;
    let adicionalId: string;

    beforeEach(async () => {
      if (nome === 'mock') resetarMock();
      const lojas = await p.menu.listarEstabelecimentos();
      const loja = lojas[0];
      if (!loja) throw new Error('Nenhum estabelecimento para testar');
      lojaId = loja.id;

      const produtos = (await p.menu.listarProdutos(lojaId)).filter((x) => x.ativo);
      const comAdicional = produtos.find((x) => x.adicionaisIds.length > 0) ?? produtos[0];
      if (!comAdicional) throw new Error('Nenhum produto para testar');
      produtoId = comAdicional.id;
      adicionalId = comAdicional.adicionaisIds[0] ?? '';
    });

    it('cotar usa preco do catalogo', async () => {
      const c = await p.orders.cotar(
        lojaId,
        [{ produtoId, quantidade: 2, adicionaisIds: adicionalId ? [adicionalId] : [] }],
        endereco.coordenada,
      );
      const produtos = await p.menu.listarProdutos(lojaId);
      const usado = produtos.find((x) => x.id === produtoId);
      const adicional = (await p.menu.listarAdicionais(lojaId)).find((a) => a.id === adicionalId);
      const esperado = ((usado?.preco ?? 0) + (adicional?.preco ?? 0)) * 2;
      expect(c.subtotal).toBe(esperado);
      expect(c.total).toBe(c.subtotal + c.frete);
    });

    it('criar pedido ignora qualquer preco vindo do cliente', async () => {
      const pedido = await p.orders.criar({
        estabelecimentoId: lojaId,
        itens: [{ produtoId, quantidade: 1, adicionaisIds: [] }],
        tipoEntrega: 'ENTREGA',
        endereco,
        formaPagamento: 'PIX',
        trocoPara: null,
        clienteNome: 'Teste',
        clienteTelefone: '44999990000',
      });
      const produtos = await p.menu.listarProdutos(lojaId);
      expect(pedido.itens[0]?.precoUnitario).toBe(produtos.find((x) => x.id === produtoId)?.preco);
      expect(pedido.status).toBe('PENDENTE');
      expect(pedido.total).toBe(pedido.subtotal + pedido.frete);
    });

    it('recusa transicao invalida de status', async () => {
      const pedido = await p.orders.criar({
        estabelecimentoId: lojaId,
        itens: [{ produtoId, quantidade: 1, adicionaisIds: [] }],
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
      const off = p.realtime.assinarEstabelecimento(lojaId, (e) => recebidos.push(e.tipo));
      await p.orders.criar({
        estabelecimentoId: lojaId,
        itens: [{ produtoId, quantidade: 1, adicionaisIds: [] }],
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
        estabelecimentoId: lojaId,
        itens: [{ produtoId, quantidade: 1, adicionaisIds: [] }],
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
