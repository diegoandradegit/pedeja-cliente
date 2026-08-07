import { getProvider } from '@pedeja/data';
import { type Categoria, type Estabelecimento, type Produto, formatarBRL } from '@pedeja/domain';
import { useEffect, useMemo, useState } from 'react';

type Props = { loja: Estabelecimento; aoEscolher: (produto: Produto) => void };

/** Ignora acento e caixa: "acai" acha "Açaí". */
const normalizar = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function Busca({ loja, aoEscolher }: Props) {
  const [termo, setTermo] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const p = getProvider().menu;
    void Promise.all([p.listarProdutos(loja.id), p.listarCategorias(loja.id)]).then(([pr, c]) => {
      setProdutos(pr.filter((x) => x.ativo));
      setCategorias(c);
      setCarregando(false);
    });
  }, [loja.id]);

  const achados = useMemo(() => {
    const alvo = normalizar(termo.trim());
    if (alvo.length < 2) return [];
    return produtos.filter(
      (p) => normalizar(p.nome).includes(alvo) || normalizar(p.descricao).includes(alvo),
    );
  }, [termo, produtos]);

  const nomeCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? '';

  return (
    <>
      <div className="barra-topo">
        <h1 className="barra-titulo">Buscar no cardápio</h1>
      </div>

      <div className="pagina">
        <div className="campo" style={{ marginTop: 16 }}>
          <input
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Pizza, hambúrguer, bebida…"
            aria-label="Buscar no cardápio"
          />
        </div>

        {carregando && <p className="dica">Carregando cardápio…</p>}

        {!carregando && termo.trim().length < 2 && (
          <div className="vazio">
            <p className="vazio-t">O que você está com vontade?</p>
            <p>Digite pelo menos duas letras.</p>
          </div>
        )}

        {!carregando && termo.trim().length >= 2 && achados.length === 0 && (
          <div className="vazio">
            <p className="vazio-t">Nada com “{termo.trim()}”</p>
            <p>Tente outro termo ou volte ao cardápio completo.</p>
          </div>
        )}

        {achados.map((p) => (
          <button type="button" className="prato" key={p.id} onClick={() => aoEscolher(p)}>
            <span className="prato-texto">
              <span className="prato-nome">{p.nome}</span>
              <span className="prato-desc">{nomeCategoria(p.categoriaId)}</span>
              <span className="prato-preco">{formatarBRL(p.preco)}</span>
            </span>
            {p.imagem && <img className="prato-foto" src={p.imagem} alt="" loading="lazy" />}
          </button>
        ))}
      </div>
    </>
  );
}
