import type { Coordenada } from '@pedeja/domain';
import {
  formatarDistancia,
  formatarEta,
  interpolar,
  origemDaRota,
  precisaRecalcularRota,
} from '@pedeja/domain';
import { useEffect, useRef, useState } from 'react';
import {
  MAP_ID,
  type Rota,
  calcularRota,
  carregar,
  pinoCliente,
  pinoEntregador,
  pinoLoja,
  temMapas,
} from '../lib/mapas.js';

type Props = {
  loja: Coordenada;
  logoLoja: string | null;
  cliente: Coordenada;
  entregador: Coordenada | null;
};

export function MapaEntrega({ loja, logoLoja, cliente, entregador }: Props) {
  const alvo = useRef<HTMLDivElement>(null);
  const mapa = useRef<google.maps.Map | null>(null);
  const marcadores = useRef<Record<string, google.maps.marker.AdvancedMarkerElement>>({});
  const linha = useRef<google.maps.Polyline | null>(null);
  const animacao = useRef<number | null>(null);
  const ultimaOrigem = useRef<Coordenada | null>(null);
  const calculadoEm = useRef(0);

  const [rota, setRota] = useState<Rota | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // ── Monta o mapa uma vez ─────────────────────────────────────────────────
  useEffect(() => {
    if (!temMapas()) {
      setErro('Mapa indisponível no momento.');
      return;
    }
    let vivo = true;

    void (async () => {
      try {
        const [maps, marker, core] = await Promise.all([
          carregar<google.maps.MapsLibrary>('maps'),
          carregar<google.maps.MarkerLibrary>('marker'),
          carregar<google.maps.CoreLibrary>('core'),
        ]);
        if (!vivo || !alvo.current) return;

        const m = new maps.Map(alvo.current, {
          mapId: MAP_ID,
          center: cliente,
          zoom: 14,
          disableDefaultUI: true,
          gestureHandling: 'cooperative',
          clickableIcons: false,
        });
        mapa.current = m;

        marcadores.current.loja = new marker.AdvancedMarkerElement({
          map: m,
          position: loja,
          content: pinoLoja(logoLoja),
          title: 'Restaurante',
        });
        marcadores.current.cliente = new marker.AdvancedMarkerElement({
          map: m,
          position: cliente,
          content: pinoCliente(),
          title: 'Entrega',
        });

        const limites = new core.LatLngBounds();
        limites.extend(loja);
        limites.extend(cliente);
        m.fitBounds(limites, 64);
      } catch {
        if (vivo) setErro('Não foi possível carregar o mapa.');
      }
    })();

    return () => {
      vivo = false;
      if (animacao.current) cancelAnimationFrame(animacao.current);
    };
  }, [loja, cliente, logoLoja]);

  // ── Move o pino do entregador com transição suave ────────────────────────
  useEffect(() => {
    const m = mapa.current;
    if (!m || !entregador) return;
    let cancelado = false;

    void (async () => {
      const marker = await carregar<google.maps.MarkerLibrary>('marker');
      if (cancelado || !mapa.current) return;

      const atual = marcadores.current.entregador;
      if (!atual) {
        marcadores.current.entregador = new marker.AdvancedMarkerElement({
          map: mapa.current,
          position: entregador,
          content: pinoEntregador(),
          title: 'Entregador',
        });
        return;
      }

      // sem interpolação o pino salta a cada atualização e parece travamento
      const de = atual.position as google.maps.LatLngLiteral | null;
      if (!de) {
        atual.position = entregador;
        return;
      }
      const inicio = performance.now();
      const duracao = 1800;

      const passo = (agora: number) => {
        const fracao = Math.min(1, (agora - inicio) / duracao);
        atual.position = interpolar({ lat: de.lat, lng: de.lng }, entregador, fracao);
        if (fracao < 1 && !cancelado) animacao.current = requestAnimationFrame(passo);
      };
      animacao.current = requestAnimationFrame(passo);
    })();

    return () => {
      cancelado = true;
    };
  }, [entregador]);

  // ── Rota, recalculada só quando vale a pena ──────────────────────────────
  useEffect(() => {
    const { origem } = origemDaRota(entregador, loja);
    if (!precisaRecalcularRota(ultimaOrigem.current, origem, calculadoEm.current)) return;

    let cancelado = false;
    void (async () => {
      const r = await calcularRota(origem, cliente);
      if (cancelado || !r || !mapa.current) return;

      ultimaOrigem.current = origem;
      calculadoEm.current = Date.now();
      setRota(r);

      const maps = await carregar<google.maps.MapsLibrary>('maps');
      if (cancelado || !mapa.current) return;

      linha.current?.setMap(null);
      linha.current = new maps.Polyline({
        map: mapa.current,
        path: r.caminho,
        strokeColor: '#ee4b41',
        strokeWeight: 5,
        strokeOpacity: 0.9,
      });

      const core = await carregar<google.maps.CoreLibrary>('core');
      if (cancelado || !mapa.current) return;
      const limites = new core.LatLngBounds();
      for (const p of r.caminho) limites.extend(p);
      mapa.current.fitBounds(limites, 64);
    })();

    return () => {
      cancelado = true;
    };
  }, [entregador, loja, cliente]);

  if (erro) {
    return (
      <div className="cartao">
        <p className="dica" style={{ margin: 0 }}>
          {erro}
        </p>
      </div>
    );
  }

  return (
    <div className="cartao" style={{ padding: 0, overflow: 'hidden' }}>
      <div ref={alvo} className="mapa-tela" />
      <div className="mapa-eta">
        <div>
          <strong>{formatarEta(rota?.segundos ?? null)}</strong>
          <span>{entregador ? 'até a entrega' : 'quando sair do restaurante'}</span>
        </div>
        {rota && <span className="mapa-distancia">{formatarDistancia(rota.metros)}</span>}
      </div>
    </div>
  );
}
