import type { Coordenada } from '@pedeja/domain';
import type { LocalizacaoEntregador, LocationRepo } from '../contracts/location.repo.js';
import { erroLegivel, sb } from './cliente.js';

type LinhaPos = { lat: number; lng: number; em: string };

export const localizacaoSupabase: LocationRepo = {
  async atualizar(pedidoId, coordenada: Coordenada) {
    const { error } = await sb().rpc('atualizar_localizacao', {
      p_pedido: pedidoId,
      p_lat: coordenada.lat,
      p_lng: coordenada.lng,
    });
    if (error) throw erroLegivel(error, 'Não foi possível enviar sua localização');
  },

  async obter(pedidoId): Promise<LocalizacaoEntregador | null> {
    const { data, error } = await sb().rpc('localizacao_do_pedido', { p_pedido: pedidoId });
    if (error) throw erroLegivel(error, 'Não foi possível localizar o entregador');
    if (!data) return null;
    const p = data as LinhaPos;
    return { pedidoId, coordenada: { lat: p.lat, lng: p.lng }, em: p.em };
  },

  /**
   * Postgres Changes respeita RLS, entao so recebe quem poderia ler a linha.
   * Quem pediu sem cadastro nao tem sessao e nao recebe evento — por isso a
   * tela tambem consulta obter() periodicamente.
   */
  assinar(pedidoId, cb) {
    const canal = sb()
      .channel(`posicao:${pedidoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'localizacao_entrega',
          filter: `pedido_id=eq.${pedidoId}`,
        },
        (msg) => {
          const linha = msg.new as Partial<LinhaPos> | null;
          if (typeof linha?.lat !== 'number' || typeof linha?.lng !== 'number') return;
          cb({
            pedidoId,
            coordenada: { lat: linha.lat, lng: linha.lng },
            em: linha.em ?? new Date().toISOString(),
          });
        },
      )
      .subscribe();
    return () => void sb().removeChannel(canal);
  },
};
