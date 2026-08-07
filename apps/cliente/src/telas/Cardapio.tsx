import { getProvider } from '@pedeja/data';
import {
  type Adicional,
  type Categoria,
  type Estabelecimento,
  type Produto,
  estabelecimentoAberto,
  formatarBRL,
} from '@pedeja/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FolhaProduto } from '../componentes/FolhaProduto.js';
import type { Linha } from '../lib/carrinho.js';

type Props = {
  loja: Estabelecimento;
  produtoInicial: Produto | null;
  aoLimparProdutoInicial: () => void;
  aoAdicionar: (linha: Linha) => void;
};

export function Cardapio({ loja, produtoInicial, aoLimparProdutoInicial, aoAdicionar }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [adicionais, setAdicionais] = useState<Adicional[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<Produto | null>(produtoInicial);
  const [ativa, setAtiva] = useState<string | null>(null);
  const secoes = useRef(new Map<string, HTMLElement>());

  useEffect(() => setAberto(produtoInicial), [produtoInicial]);

  useEffect(() => {
    const p = getProvider().menu;
    void Promise.all([
      p.listarCategorias(loja.id),
      p.listarProdutos(loja.id),
      p.listarAdicionais(loja.id),
    ]).then(([c, pr, ad]) => {
      setCategorias(c);
      setProdutos(pr);
      setAdicionais(ad);
      setAtiva(c[0]?.id ?? null);
      setCarregando(false);
    });
  }, [loja.id]);

  /** A aba ativa acompanha a rolagem. */
  useEffect(() => {
    if (categorias.length === 0) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel?.target.id) setAtiva(visivel.target.id.replace('cat-', ''));
      },
      { rootMargin: '-70px 0px -70% 0px', threshold: 0 },
    );
    for (const el of secoes.current.values()) obs.observe(el);
    return () => obs.disconnect();
  }, [categorias]);

  const irPara = useCallback((id: string) => {
    secoes.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setAtiva(id);
  }, []);

  const lojaAberta = estabelecimentoAberto(loja.horarios, new Date());
  const comProdutos = categorias.filter((c) =>
    produtos.some((p) => p.categoriaId === c.id && p.ativo),
  );

  return (
    <>
      <header className="loja-capa">
        <div>
          <h1>{loja.nome}</h1>
          <p data-fechado={!lojaAberta}>
            {lojaAberta
              ? `Aberto até as ${loja.horarios[0]?.fecha ?? '—'}`
              : `Fechado · abre ${loja.horarios[0]?.abre ?? '—'}`}
          </p>
        </div>
        {loja.imagem && <img className="loja-marca" src={loja.imagem} alt="" />}
      </header>

      {comProdutos.length > 1 && (
        <nav className="categorias" aria-label="Categorias do cardápio">
          {comProdutos.map((c) => (
            <button
              type="button"
              key={c.id}
              className="categoria-aba"
              aria-current={ativa === c.id}
              onClick={() => irPara(c.id)}
            >
              {c.nome}
            </button>
          ))}
        </nav>
      )}

      <div className="pagina">
        {carregando && (
          <div className="vazio">
            <p>Carregando cardápio…</p>
          </div>
        )}

        {!carregando && comProdutos.length === 0 && (
          <div className="vazio">
            <p className="vazio-t">Cardápio vazio</p>
            <p>Nenhum produto publicado ainda.</p>
          </div>
        )}

        {comProdutos.map((cat) => (
          <section
            key={cat.id}
            id={`cat-${cat.id}`}
            ref={(el) => {
              if (el) secoes.current.set(cat.id, el);
              else secoes.current.delete(cat.id);
            }}
          >
            <h2 className="secao-titulo">{cat.nome}</h2>
            {produtos
              .filter((p) => p.categoriaId === cat.id && p.ativo)
              .map((p) => (
                <button
                  type="button"
                  className="prato"
                  key={p.id}
                  disabled={!lojaAberta}
                  onClick={() => setAberto(p)}
                >
                  <span className="prato-texto">
                    <span className="prato-nome">{p.nome}</span>
                    {p.descricao && <span className="prato-desc">{p.descricao}</span>}
                    <span className="prato-preco">{formatarBRL(p.preco)}</span>
                  </span>
                  {p.imagem && (
                    <img
                      className="prato-foto"
                      src={p.imagem}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </button>
              ))}
          </section>
        ))}
      </div>

      {aberto && (
        <FolhaProduto
          produto={aberto}
          adicionais={adicionais}
          aoFechar={() => {
            setAberto(null);
            aoLimparProdutoInicial();
          }}
          aoAdicionar={(linha) => {
            aoAdicionar(linha);
            setAberto(null);
            aoLimparProdutoInicial();
          }}
        />
      )}
    </>
  );
}
