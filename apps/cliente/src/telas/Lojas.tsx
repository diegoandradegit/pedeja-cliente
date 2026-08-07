import { getProvider } from '@pedeja/data';
import { type Estabelecimento, estabelecimentoAberto } from '@pedeja/domain';
import { useEffect, useState } from 'react';

type Props = { aoEscolher: (loja: Estabelecimento) => void };

export function Lojas({ aoEscolher }: Props) {
  const [lojas, setLojas] = useState<Estabelecimento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    getProvider()
      .menu.listarEstabelecimentos()
      .then(setLojas)
      .catch(() =>
        setErro('Não foi possível carregar os restaurantes. Tente de novo em instantes.'),
      );
  }, []);

  return (
    <>
      <header className="capa">
        <h1 className="capa-marca">PedeJá</h1>
        <p className="capa-sub">Restaurantes que entregam perto de você</p>
      </header>

      <div className="pagina">
        {erro && (
          <div className="vazio">
            <p className="vazio-t">Sem conexão com os restaurantes</p>
            <p>{erro}</p>
          </div>
        )}

        {!lojas && !erro && (
          <div className="vazio">
            <p>Carregando…</p>
          </div>
        )}

        {lojas?.map((loja) => {
          const aberto = estabelecimentoAberto(loja.horarios, new Date());
          return (
            <button type="button" className="loja" key={loja.id} onClick={() => aoEscolher(loja)}>
              <p className="loja-nome">{loja.nome}</p>
              <p className="loja-desc">{loja.descricao}</p>
              <span className="estado" data-fechado={!aberto}>
                {aberto ? 'Aberto agora' : 'Fechado'}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
