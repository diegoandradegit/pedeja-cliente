import { getProvider } from '@pedeja/data';
import {
  type Adicional,
  type Categoria,
  type Estabelecimento,
  type Produto,
  estabelecimentoAberto,
  formatarBRL,
} from '@pedeja/domain';
import { useEffect, useState } from 'react';
import { FolhaProduto } from '../componentes/FolhaProduto.js';
import { type Linha, previaSubtotal, totalDeItens } from '../lib/carrinho.js';

type Props = {
  loja: Estabelecimento;
  linhas: Linha[];
  aoVoltar: () => void;
  aoAdicionar: (linha: Linha) => void;
  aoVerConta: () => void;
};

export function Loja({ loja, linhas, aoVoltar, aoAdicionar, aoVerConta }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [adicionais, setAdicionais] = useState<Adicional[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<Produto | null>(null);

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

  const lojaAberta = estabelecimentoAberto(loja.horarios, new Date());
  const itens = totalDeItens(linhas);

  return (
    <>
      <div className="barra-topo">
        <button
          type="button"
          className="voltar"
          onClick={aoVoltar}
          aria-label="Voltar aos restaurantes"
        >
          ←
        </button>
        <h1 className="barra-titulo">{loja.nome}</h1>
      </div>

      <div className="pagina">
        {!lojaAberta && (
          <div className="selo-grande" style={{ marginTop: 18 }}>
            <strong>Fechado agora</strong>
            <span>
              Abre {loja.horarios[0]?.abre ?? '—'}. Você pode ver o cardápio, mas não dá para
              finalizar o pedido.
            </span>
          </div>
        )}

        {carregando && (
          <div className="vazio">
            <p>Carregando cardápio…</p>
          </div>
        )}

        {!carregando && produtos.length === 0 && (
          <div className="vazio">
            <p className="vazio-t">Cardápio vazio</p>
            <p>Este restaurante ainda não publicou produtos.</p>
          </div>
        )}

        {categorias.map((cat) => {
          const daCategoria = produtos.filter((p) => p.categoriaId === cat.id);
          if (daCategoria.length === 0) return null;
          return (
            <section key={cat.id}>
              <h2 className="categoria">{cat.nome}</h2>
              {daCategoria.map((p) => (
                <button
                  type="button"
                  className="prato"
                  key={p.id}
                  disabled={!lojaAberta}
                  onClick={() => setAberto(p)}
                >
                  <span className="prato-corpo">
                    <span className="prato-texto">
                      <span className="prato-linha">
                        <span className="prato-nome">{p.nome}</span>
                        <span className="prato-guia" aria-hidden="true" />
                        <span className="prato-preco">{formatarBRL(p.preco)}</span>
                      </span>
                      {p.descricao && <span className="prato-desc">{p.descricao}</span>}
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
                  </span>
                </button>
              ))}
            </section>
          );
        })}
      </div>

      {aberto && (
        <FolhaProduto
          produto={aberto}
          adicionais={adicionais}
          aoFechar={() => setAberto(null)}
          aoAdicionar={(linha) => {
            aoAdicionar(linha);
            setAberto(null);
          }}
        />
      )}

      {itens > 0 && (
        <div className="conta-barra">
          <button type="button" className="principal" onClick={aoVerConta}>
            <span className="principal-rotulo">
              Ver conta · {itens} {itens === 1 ? 'item' : 'itens'}
            </span>
            <span className="principal-valor">{formatarBRL(previaSubtotal(linhas))}</span>
          </button>
        </div>
      )}
    </>
  );
}
