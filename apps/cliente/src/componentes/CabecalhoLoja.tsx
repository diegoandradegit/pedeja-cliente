import { type Estabelecimento, estabelecimentoAberto } from '@pedeja/domain';
import { Clock } from 'lucide-react';

type Props = { loja: Estabelecimento; aberto: boolean };

/** Capa larga com a marca sobreposta — o arranjo dos cardápios online. */
export function CabecalhoLoja({ loja, aberto }: Props) {
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
