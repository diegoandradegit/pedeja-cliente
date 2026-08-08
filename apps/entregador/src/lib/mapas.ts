import { Loader } from '@googlemaps/js-api-loader';
import type { Coordenada } from '@pedeja/domain';

/**
 * Camada única de acesso ao Google Maps. Nenhum componente importa o loader
 * nem toca em `google.maps` direto — mesma regra dos repositórios de dados.
 */

const CHAVE = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
/** Map ID exigido pelos marcadores avançados; DEMO_MAP_ID vale até criar o seu. */
export const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? 'DEMO_MAP_ID';

export const temMapas = (): boolean => CHAVE.length > 0;

let loader: Loader | null = null;
const carregados = new Map<string, Promise<unknown>>();

function obterLoader(): Loader {
  if (!CHAVE) throw new Error('Mapa indisponível: chave do Google Maps não configurada');
  if (!loader) {
    // uma instância por app: o Loader do Google injeta o script uma vez só
    loader = new Loader({ apiKey: CHAVE, version: 'weekly', language: 'pt-BR', region: 'BR' });
  }
  return loader;
}

/** Carrega uma biblioteca sob demanda, reaproveitando o que já veio. */
export function carregar<T>(nome: 'core' | 'maps' | 'marker' | 'places' | 'geometry'): Promise<T> {
  const existente = carregados.get(nome);
  if (existente) return existente as Promise<T>;
  const p = obterLoader().importLibrary(nome);
  carregados.set(nome, p);
  return p as Promise<T>;
}

// ── Rota ────────────────────────────────────────────────────────────────────
export type Rota = {
  /** Pontos já decodificados, prontos para desenhar. */
  caminho: Coordenada[];
  metros: number;
  segundos: number;
};

/**
 * Rota pela Routes API (computeRoutes). É a sucessora da Directions e devolve
 * duração considerando trânsito. Chamada por HTTP porque a biblioteca JS ainda
 * não expõe o computeRoutes v2.
 */
export async function calcularRota(origem: Coordenada, destino: Coordenada): Promise<Rota | null> {
  if (!CHAVE) return null;

  const resposta = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': CHAVE,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origem.lat, longitude: origem.lng } } },
      destination: { location: { latLng: { latitude: destino.lat, longitude: destino.lng } } },
      travelMode: 'TWO_WHEELER',
      routingPreference: 'TRAFFIC_AWARE',
      languageCode: 'pt-BR',
      units: 'METRIC',
    }),
  });

  if (!resposta.ok) return null;

  const dados = (await resposta.json()) as {
    routes?: {
      duration?: string;
      distanceMeters?: number;
      polyline?: { encodedPolyline?: string };
    }[];
  };
  const rota = dados.routes?.[0];
  const codificada = rota?.polyline?.encodedPolyline;
  if (!rota || !codificada) return null;

  const geometry = await carregar<google.maps.GeometryLibrary>('geometry');
  const pontos = geometry.encoding.decodePath(codificada);

  return {
    caminho: pontos.map((p) => ({ lat: p.lat(), lng: p.lng() })),
    metros: rota.distanceMeters ?? 0,
    segundos: Number.parseInt(rota.duration?.replace('s', '') ?? '0', 10),
  };
}

// ── Marcadores ──────────────────────────────────────────────────────────────
const CORES = { vermelho: '#ee4b41', tinta: '#1c1c1e', branco: '#ffffff' };

function elemento(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html.trim();
  return div.firstElementChild as HTMLElement;
}

export function pinoLoja(logo: string | null): HTMLElement {
  return elemento(`
    <div style="width:44px;height:44px;border-radius:50%;background:${CORES.branco};
      border:3px solid ${CORES.branco};box-shadow:0 3px 10px rgba(0,0,0,.3);overflow:hidden;
      display:flex;align-items:center;justify-content:center">
      ${
        logo
          ? `<img src="${logo}" alt="" style="width:100%;height:100%;object-fit:cover">`
          : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${CORES.vermelho}"
              stroke-width="2.2" stroke-linecap="round"><path d="M3 9h18M5 9V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/></svg>`
      }
    </div>`);
}

export function pinoCliente(): HTMLElement {
  return elemento(`
    <div style="width:38px;height:38px;border-radius:50%;background:${CORES.tinta};
      border:3px solid ${CORES.branco};box-shadow:0 3px 10px rgba(0,0,0,.3);
      display:flex;align-items:center;justify-content:center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${CORES.branco}"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/></svg>
    </div>`);
}

export function pinoEntregador(): HTMLElement {
  return elemento(`
    <div style="width:42px;height:42px;border-radius:50%;background:${CORES.vermelho};
      border:3px solid ${CORES.branco};box-shadow:0 4px 12px rgba(238,75,65,.5);
      display:flex;align-items:center;justify-content:center">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${CORES.branco}"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/>
        <path d="M15 6h3l2 4M5.5 17.5 9 9h6l1.5 4.5"/></svg>
    </div>`);
}

/** Deep link para navegação passo a passo — a API JS não faz turn-by-turn. */
export function linkNavegacao(destino: Coordenada): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}&travelmode=driving`;
}
