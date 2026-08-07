import { getProvider } from '@pedeja/data';
import { type Estabelecimento, type Produto, formatarBRL } from '@pedeja/domain';
import { useEffect, useMemo, useState } from 'react';

type Achado = { produto: Produto; loja: Estabelecimento };
type Props = { aoEscolher: (loja: Estabelecimento, produto: Produto) => void };

/** Ignora acento e caixa: "acai" acha "Açaí". */
const normalizar = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function Busca({ aoEscolher }: Props) {
  const [termo, setTermo] = useState('');
  const [tudo, setTudo] = useState<Achado[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const p = getProvider().menu;
    void p.listarEstabelecimentos().then(async (lojas) => {
      const listas = await Promise.all(
        lojas.map(async (loja) =>
          (await p.listarProdutos(loja.id))
            .filter((x) => x.ativo)
            .map((produto) => ({ produto, loja })),
        ),
      );
      setTudo(listas.flat());
      setCarregando(false);
    });
  }, []);

  const achados = useMemo(() => {
    const alvo = normalizar(termo.trim());
    if (alvo.length < 2) return [];
    return tudo.filter(
      ({ produto, loja }) =>
        normalizar(produto.nome).includes(alvo) ||
        normalizar(produto.descricao).includes(alvo) ||
        normalizar(loja.nome).includes(alvo),
    );
  }, [termo, tudo]);

  return (
    <>
      <div className="barra-topo">
        <h1 className="barra-titulo">Buscar</h1>
      </div>

      <div className="pagina">
        <div className="campo" style={{ marginTop: 16 }}>
          <input
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Pizza, hambúrguer, nome do restaurante…"
            aria-label="Buscar no cardápio"
          />
        </div>

        {carregando && <p className="dica">Carregando cardápios…</p>}

        {!carregando && termo.trim().length < 2 && (
          <div className="vazio">
            <p className="vazio-t">O que você está com vontade?</p>
            <p>Digite pelo menos duas letras para procurar em todos os restaurantes.</p>
          </div>
        )}

        {!carregando && termo.trim().length >= 2 && achados.length === 0 && (
          <div className="vazio">
            <p className="vazio-t">Nada com “{termo.trim()}”</p>
            <p>Tente outro termo ou veja os restaurantes na tela inicial.</p>
          </div>
        )}

        {achados.map(({ produto, loja }) => (
          <button
            type="button"
            className="prato"
            key={`${loja.id}-${produto.id}`}
            onClick={() => aoEscolher(loja, produto)}
          >
            <span className="prato-corpo">
              <span className="prato-texto">
                <span className="prato-linha">
                  <span className="prato-nome">{produto.nome}</span>
                  <span className="prato-guia" aria-hidden="true" />
                  <span className="prato-preco">{formatarBRL(produto.preco)}</span>
                </span>
                <span className="prato-desc">{loja.nome}</span>
              </span>
              {produto.imagem && (
                <img className="prato-foto" src={produto.imagem} alt="" loading="lazy" />
              )}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
