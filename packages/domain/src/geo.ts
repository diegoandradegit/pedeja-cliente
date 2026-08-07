import type { Coordenada } from './types.js';

const RAIO_TERRA_KM = 6371;

const rad = (g: number): number => (g * Math.PI) / 180;

/** Distancia em linha reta (haversine), em km, arredondada a 2 casas. */
export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(RAIO_TERRA_KM * 2 * Math.asin(Math.sqrt(h)) * 100) / 100;
}

export function dentroDoRaio(origem: Coordenada, destino: Coordenada, raioKm: number): boolean {
  return distanciaKm(origem, destino) <= raioKm;
}
