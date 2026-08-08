import { getProvider } from '@pedeja/data';
import {
  type Adicional,
  type Categoria,
  type Estabelecimento,
  type Produto,
  formatarBRL,
} from '@pedeja/domain';
import { useEffect, useState } from 'react';
import { CabecalhoLoja, lojaEstaAberta } from '../componentes/CabecalhoLoja.js';
import { FolhaProduto } from '../componentes/FolhaProduto.js';
import type { Linha } from '../lib/carrinho.js';

type Props = {
  loja: Estabelecimento;
  produtoInicial: Produto | null;
  aoLimparProdutoInicial: () => void;
  aoAdicionar: (linha: Linha) => void;
};

const TUDO = 'tudo';

export function Cardapio({ loja, produtoInicial, aoLimparProdutoInicial, aoAdicionar }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [adicionais, setAdicionais] = useState<Adicional[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<Produto | null>(produtoInicial);
  const [filtro, setFiltro] = useState<string>(TUDO);

  useEffect(() => setAberto(produtoInicial), [produtoInicial]);

  useEffect(() => {
    const p = getProvider().menu;
    void Promise.all([
      p.listarCategorias(loja.id),
      p.listarProdutos(loja.id),
      p.listarAdicionais(loja.id),
    ]).then(([c, pr, ad]) => {
      setCategorias(c);
      setProdutos(pr.filter((x) => x.ativo));
      setAdicionais(ad);
      setCarregando(false);
    });
  }, [loja.id]);

  const lojaAberta = lojaEstaAberta(loja);
  const comProdutos = categorias.filter((c) => produtos.some((p) => p.categoriaId === c.id));

  /** O filtro mostra só a categoria escolhida — não rola até ela. */
  const visiveis = filtro === TUDO ? comProdutos : comProdutos.filter((c) => c.id === filtro);

  return (
    <>
      <CabecalhoLoja loja={loja} aberto={lojaAberta} />

      {comProdutos.length > 1 && (
        <nav className="categorias" aria-label="Filtrar por categoria">
          <button
            type="button"
            className="categoria-aba"
            aria-current={filtro === TUDO}
            onClick={() => setFiltro(TUDO)}
          >
            Tudo
          </button>
          {comProdutos.map((c) => (
            <button
              type="button"
              key={c.id}
              className="categoria-aba"
              aria-current={filtro === c.id}
              onClick={() => setFiltro(c.id)}
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

        {visiveis.map((cat) => (
          <section key={cat.id}>
            {/* com filtro ativo o título vira redundante com a aba */}
            {filtro === TUDO && <h2 className="secao-titulo">{cat.nome}</h2>}
            {filtro !== TUDO && <div style={{ height: 8 }} />}
            {produtos
              .filter((p) => p.categoriaId === cat.id)
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
