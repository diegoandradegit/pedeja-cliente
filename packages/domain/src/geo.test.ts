import { describe, expect, it } from 'vitest';
import { dentroDoRaio, distanciaKm } from './geo.js';

const maringa = { lat: -23.4205, lng: -51.9331 };
const sarandi = { lat: -23.4437, lng: -51.8739 };

describe('geo', () => {
  it('mede distancia conhecida com tolerancia', () => {
    const d = distanciaKm(maringa, sarandi);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(8);
  });

  it('distancia de um ponto a ele mesmo e zero', () => {
    expect(distanciaKm(maringa, maringa)).toBe(0);
  });

  it('avalia raio de entrega', () => {
    expect(dentroDoRaio(maringa, sarandi, 10)).toBe(true);
    expect(dentroDoRaio(maringa, sarandi, 2)).toBe(false);
  });
});
