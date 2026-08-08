import { type Estabelecimento, estabelecimentoAberto, formatarBRL } from '@pedeja/domain';
import { Bike, Clock, Star } from 'lucide-react';

type Props = { loja: Estabelecimento; aberto: boolean; taxaBase: number | null };

/** Capa larga com a marca sobreposta — o arranjo dos cardápios online. */
export function CabecalhoLoja({ loja, aberto, taxaBase }: Props) {
  const hoje = loja.horarios.find((h) => h.diaSemana === new Date().getDay()) ?? loja.horarios[0];

  return (
    <>
      {loja.capa ? (
        <div className="capa" data-fechado={!aberto}>
          <img src={loja.capa} alt="" />
        </div>
      ) : (
        <div className="capa capa-vazia" />
      )}

      <header className="loja-cabecalho">
        {loja.imagem && <img className="loja-marca" src={loja.imagem} alt="" />}
        <h1>{loja.nome}</h1>
        <p className="descricao">{loja.descricao}</p>

        <span className="funcionamento" data-fechado={!aberto}>
          <span className="bolinha" aria-hidden="true" />
          {aberto ? 'Aberto agora' : 'Fechado'}
          {hoje && <small>· {aberto ? `até ${hoje.fecha}` : `abre ${hoje.abre}`}</small>}
        </span>

        <div className="vitrine">
          {loja.avaliacao !== null && (
            <span>
              <Star size={17} strokeWidth={2.2} />
              {loja.avaliacao.toFixed(1).replace('.', ',')}
              {loja.avaliacoesTotal > 0 && (
                <small>
                  (
                  {loja.avaliacoesTotal >= 1000
                    ? `${(loja.avaliacoesTotal / 1000).toFixed(1).replace('.', ',')}k`
                    : loja.avaliacoesTotal}
                  )
                </small>
              )}
            </span>
          )}
          <span>
            <Clock size={17} strokeWidth={2.2} />
            {loja.tempoMin}-{loja.tempoMax} min
          </span>
          {taxaBase !== null && (
            <span>
              <Bike size={17} strokeWidth={2.2} />
              {taxaBase === 0 ? (
                <em className="gratis">Grátis</em>
              ) : (
                `a partir de ${formatarBRL(taxaBase)}`
              )}
            </span>
          )}
        </div>
      </header>

      {!aberto && (
        <div className="aviso-fechado">
          <Clock size={20} strokeWidth={2.2} style={{ flex: '0 0 auto', marginTop: 1 }} />
          <span>
            O restaurante está fechado. Você pode ver o cardápio, mas só dá para pedir quando
            {hoje ? ` abrir, às ${hoje.abre}.` : ' abrir.'}
          </span>
        </div>
      )}
    </>
  );
}

export const lojaEstaAberta = (loja: Estabelecimento): boolean =>
  estabelecimentoAberto(loja.horarios, new Date());
