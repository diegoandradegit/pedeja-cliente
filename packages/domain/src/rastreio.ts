import { distanciaKm } from './geo.js';
import type { StatusPedido } from './order-status.js';
import type { Coordenada, Pedido } from './types.js';

/**
 * Regras puras do rastreamento. Ficam aqui, e nao na tela, porque sao
 * testaveis sem navegador nem API do Google — e sao as que erram calado.
 */

/**
 * De onde parte a rota mostrada ao cliente. Antes de existir posicao do
 * entregador, o ponto de partida e o restaurante: mostrar um mapa vazio
 * enquanto o pedido esta pronto e pior que mostrar de onde ele vai sair.
 */
export function origemDaRota(
  posicaoEntregador: Coordenada | null,
  coordenadaLoja: Coordenada,
): { origem: Coordenada; deQuem: 'ENTREGADOR' | 'LOJA' } {
  return posicaoEntregador
    ? { origem: posicaoEntregador, deQuem: 'ENTREGADOR' }
    : { origem: coordenadaLoja, deQuem: 'LOJA' };
}

/** O mapa so faz sentido a partir do momento em que ha rota a percorrer. */
export function deveMostrarMapa(pedido: Pick<Pedido, 'status' | 'tipoEntrega'>): boolean {
  if (pedido.tipoEntrega !== 'ENTREGA') return false;
  const comMapa: StatusPedido[] = ['PRONTO', 'AGUARDANDO_ENTREGADOR', 'EM_ROTA'];
  return comMapa.includes(pedido.status);
}

/** Enviar posicao so enquanto a corrida existe. */
export function deveEnviarLocalizacao(status: StatusPedido): boolean {
  return status === 'EM_ROTA';
}

/**
 * ETA em texto curto. Abaixo de um minuto vira "chegando" — mostrar "0 min"
 * parece defeito, e o cliente ja esta olhando pela janela.
 */
export function formatarEta(segundos: number | null): string {
  if (segundos === null || !Number.isFinite(segundos)) return 'calculando…';
  const minutos = Math.round(segundos / 60);
  if (minutos < 1) return 'chegando';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

/** Distancia restante em texto: metros abaixo de 1 km. */
export function formatarDistancia(metros: number | null): string {
  if (metros === null || !Number.isFinite(metros)) return '';
  if (metros < 1000) return `${Math.round(metros / 50) * 50} m`;
  return `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Horario previsto de chegada a partir de agora. */
export function horarioDeChegada(segundos: number, agora = new Date()): Date {
  return new Date(agora.getTime() + segundos * 1000);
}

/**
 * Recalcular rota a cada respiro do GPS queima cota e nao muda nada na tela.
 * So vale recalcular se o entregador andou o bastante ou passou tempo demais.
 */
export function precisaRecalcularRota(
  anterior: Coordenada | null,
  atual: Coordenada,
  ultimoCalculoEm: number,
  agora = Date.now(),
): boolean {
  if (!anterior) return true;
  if (agora - ultimoCalculoEm > 60_000) return true;
  return distanciaKm(anterior, atual) >= 0.15;
}

/**
 * Throttle de envio: o GPS dispara varias vezes por segundo. Enviar tudo
 * gasta bateria do entregador e cota da API sem ganho nenhum.
 */
export function podeEnviarAgora(ultimoEnvioEm: number | null, agora = Date.now()): boolean {
  return ultimoEnvioEm === null || agora - ultimoEnvioEm >= 8_000;
}

/**
 * Passos de uma animacao entre duas posicoes. Sem isso o pino salta de um
 * ponto a outro a cada atualizacao, o que parece travamento.
 */
export function interpolar(de: Coordenada, para: Coordenada, fracao: number): Coordenada {
  const t = Math.min(1, Math.max(0, fracao));
  return {
    lat: de.lat + (para.lat - de.lat) * t,
    lng: de.lng + (para.lng - de.lng) * t,
  };
}
