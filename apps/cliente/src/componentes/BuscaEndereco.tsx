import type { Coordenada } from '@pedeja/domain';
import { MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { carregar, temMapas } from '../lib/mapas.js';

export type EnderecoEscolhido = {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  coordenada: Coordenada;
};

type Props = { aoEscolher: (e: EnderecoEscolhido) => void; aoFalhar: (msg: string) => void };

/** Traduz os componentes do Google para os campos do nosso endereço. */
function extrair(place: google.maps.places.Place): EnderecoEscolhido | null {
  const loc = place.location;
  if (!loc) return null;

  const pegar = (tipo: string): string =>
    place.addressComponents?.find((c) => c.types.includes(tipo))?.longText ?? '';

  return {
    logradouro: pegar('route'),
    numero: pegar('street_number'),
    bairro: pegar('sublocality_level_1') || pegar('sublocality') || pegar('neighborhood'),
    cidade: pegar('administrative_area_level_2') || pegar('locality'),
    uf:
      place.addressComponents?.find((c) => c.types.includes('administrative_area_level_1'))
        ?.shortText ?? '',
    cep: pegar('postal_code').replace(/\D/g, ''),
    coordenada: { lat: loc.lat(), lng: loc.lng() },
  };
}

/**
 * Autocomplete do Places (New). Carregado só quando a tela pede, e sempre
 * como atalho: os campos manuais e o CEP continuam funcionando por baixo.
 */
export function BuscaEndereco({ aoEscolher, aoFalhar }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!temMapas() || !caixa.current) return;
    let vivo = true;
    const alvo = caixa.current;

    void (async () => {
      try {
        const places = await carregar<google.maps.PlacesLibrary>('places');
        if (!vivo) return;

        const campo = new places.PlaceAutocompleteElement({
          includedRegionCodes: ['br'],
        });
        campo.id = 'busca-endereco';
        alvo.replaceChildren(campo);
        setPronto(true);

        campo.addEventListener('gmp-select', (async (ev: Event) => {
          const detalhe = (
            ev as CustomEvent<{ placePrediction: { toPlace: () => google.maps.places.Place } }>
          ).detail;
          const place = detalhe.placePrediction.toPlace();
          await place.fetchFields({
            fields: ['location', 'addressComponents', 'formattedAddress'],
          });
          const endereco = extrair(place);
          if (endereco) aoEscolher(endereco);
          else aoFalhar('Não consegui as coordenadas desse endereço. Preencha à mão.');
        }) as EventListener);
      } catch {
        if (vivo) setPronto(false);
      }
    })();

    return () => {
      vivo = false;
      alvo.replaceChildren();
    };
  }, [aoEscolher, aoFalhar]);

  if (!temMapas()) return null;

  return (
    <div className="campo">
      <label htmlFor="busca-endereco">
        <MapPin size={15} strokeWidth={2.4} style={{ verticalAlign: '-2px', marginRight: 5 }} />
        Buscar endereço
      </label>
      <div ref={caixa} className="autocomplete" />
      <p className="dica">
        {pronto
          ? 'Comece a digitar a rua e escolha na lista — preenchemos o resto.'
          : 'Se a busca não carregar, preencha os campos abaixo normalmente.'}
      </p>
    </div>
  );
}
