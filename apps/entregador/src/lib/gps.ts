import { getProvider } from '@pedeja/data';
import { podeEnviarAgora } from '@pedeja/domain';

/**
 * Envia a posição enquanto a corrida está em rota.
 *
 * O GPS dispara várias vezes por segundo. Enviar tudo queimaria bateria do
 * entregador e cota da API sem mudar nada na tela do cliente, então o envio
 * passa pelo throttle do domínio (testado lá, não aqui).
 */
export function seguirEEnviar(pedidoId: string, aoErro: (mensagem: string) => void): () => void {
  if (!('geolocation' in navigator)) {
    aoErro('Este aparelho não informa localização — o cliente não verá você no mapa.');
    return () => undefined;
  }

  let ultimoEnvio: number | null = null;
  let avisouErro = false;

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      if (!podeEnviarAgora(ultimoEnvio)) return;
      ultimoEnvio = Date.now();
      void getProvider()
        .localizacao.atualizar(pedidoId, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        .catch(() => {
          // falha de rede é passageira: não vale interromper a entrega
        });
    },
    () => {
      if (avisouErro) return;
      avisouErro = true;
      aoErro('Sem permissão de localização — o cliente não consegue te acompanhar no mapa.');
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );

  return () => navigator.geolocation.clearWatch(id);
}
