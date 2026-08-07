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
import { type Linha, previaSubtotal, totalDeItens } from '../lib/carrinho.js';

type Props = {
  loja: Estabelecimento;
  linhas: Linha[];
  produtoInicial: Produto | null;
  aoLimparProdutoInicial: () => void;
  aoAdicionar: (linha: Linha) => void;
  aoVerConta: () => void;
};

export function Cardapio({
  loja,
  linhas,
  produtoInicial,
  aoLimparProdutoInicial,
  aoAdicionar,
  aoVerConta,
}: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [adicionais, setAdicionais] = useState<Adicional[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<Produto | null>(produtoInicial);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const secoes = useRef(new Map<string, HTMLElement>());

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
      setCategoriaAtiva(c[0]?.id ?? null);
      setCarregando(false);
    });
  }, [loja.id]);

  /**
   * A aba de categoria acompanha a rolagem. Marca a seção que está mais
   * próxima do topo da área visível, logo abaixo da barra de abas.
   */
  useEffect(() => {
    if (categorias.length === 0) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visivel?.target.id) setCategoriaAtiva(visivel.target.id.replace('cat-', ''));
      },
      { rootMargin: '-64px 0px -70% 0px', threshold: 0 },
    );
    for (const el of secoes.current.values()) observador.observe(el);
    return () => observador.disconnect();
  }, [categorias]);

  const irPara = useCallback((categoriaId: string) => {
    secoes.current.get(categoriaId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCategoriaAtiva(categoriaId);
  }, []);

  const lojaAberta = estabelecimentoAberto(loja.horarios, new Date());
  const itens = totalDeItens(linhas);
  const comProdutos = categorias.filter((c) =>
    produtos.some((p) => p.categoriaId === c.id && p.ativo),
  );

  return (
    <>
      <header className="loja-capa">
        <h1>{loja.nome}</h1>
        <p>
          {loja.descricao} · {loja.endereco}
        </p>
        <span className="estado" data-fechado={!lojaAberta}>
          {lojaAberta
            ? `Aberto até as ${loja.horarios[0]?.fecha ?? '—'}`
            : `Fechado · abre ${loja.horarios[0]?.abre ?? '—'}`}
        </span>
      </header>

      {comProdutos.length > 1 && (
        <nav className="categorias" aria-label="Categorias do cardápio">
          {comProdutos.map((c) => (
            <button
              type="button"
              key={c.id}
              className="categoria-aba"
              aria-current={categoriaAtiva === c.id}
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

        {!carregando && produtos.filter((p) => p.ativo).length === 0 && (
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
            <h2 className="categoria-titulo">{cat.nome}</h2>
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

      {itens > 0 && (
        <div className="conta-barra">
          <button type="button" className="principal" onClick={aoVerConta}>
            <span className="principal-rotulo">
              Meu pedido · {itens} {itens === 1 ? 'item' : 'itens'}
            </span>
            <span className="principal-valor">{formatarBRL(previaSubtotal(linhas))}</span>
          </button>
        </div>
      )}
    </>
  );
}
