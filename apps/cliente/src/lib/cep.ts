export type EnderecoCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

/** Consulta o ViaCEP. Retorna null se o CEP nao existir ou a rede falhar. */
export async function buscarCep(cepBruto: string): Promise<EnderecoCep | null> {
  const cep = cepBruto.replace(/\D/g, '');
  if (cep.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!r.ok) return null;
    const d = (await r.json()) as {
      erro?: boolean | string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (d.erro) return null;
    return {
      logradouro: d.logradouro ?? '',
      bairro: d.bairro ?? '',
      cidade: d.localidade ?? '',
      uf: d.uf ?? '',
    };
  } catch {
    return null;
  }
}

export function formatarCep(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 8);
  return n.length > 5 ? `${n.slice(0, 5)}-${n.slice(5)}` : n;
}

export function formatarTelefone(v: string): string {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

export type Coordenada = { lat: number; lng: number };

/**
 * O frete depende de coordenada real, e nao ha geocodificador de CEP aqui.
 * Entao pedimos a localizacao do aparelho — e, se negada, o pedido segue como
 * retirada em vez de inventar uma distancia.
 */
export function localizacaoDoAparelho(): Promise<Coordenada> {
  return new Promise((ok, falha) => {
    if (!('geolocation' in navigator)) {
      falha(new Error('Este aparelho não informa localização'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => falha(new Error('Permissão de localização negada')),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  });
}
