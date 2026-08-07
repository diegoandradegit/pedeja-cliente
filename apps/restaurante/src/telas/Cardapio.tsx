import { getProvider } from '@pedeja/data';
import { type Categoria, type Produto, formatarBRL, reaisParaCentavos } from '@pedeja/domain';
import { useCallback, useEffect, useState } from 'react';

type Props = { estabelecimentoId: string; aoAvisar: (texto: string, erro?: boolean) => void };

type Rascunho = {
  id?: string;
  nome: string;
  descricao: string;
  precoReais: string;
  categoriaId: string;
  ativo: boolean;
};

const vazio = (categoriaId: string): Rascunho => ({
  nome: '',
  descricao: '',
  precoReais: '',
  categoriaId,
  ativo: true,
});

export function Cardapio({ estabelecimentoId, aoAvisar }: Props) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const p = getProvider().menu;
    const [prods, cats] = await Promise.all([
      p.listarProdutos(estabelecimentoId),
      p.listarCategorias(estabelecimentoId),
    ]);
    setProdutos(prods);
    setCategorias(cats);
    setCarregando(false);
  }, [estabelecimentoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar() {
    if (!editando) return;
    const reais = Number(editando.precoReais.replace(',', '.'));
    if (!editando.nome.trim()) return aoAvisar('Dê um nome ao produto', true);
    if (!Number.isFinite(reais) || reais <= 0) return aoAvisar('Informe um preço válido', true);

    const original = editando.id ? produtos.find((p) => p.id === editando.id) : undefined;
    try {
      await getProvider().menu.salvarProduto({
        ...(editando.id ? { id: editando.id } : {}),
        estabelecimentoId,
        nome: editando.nome.trim(),
        descricao: editando.descricao.trim(),
        preco: reaisParaCentavos(reais),
        imagem: original?.imagem ?? null,
        categoriaId: editando.categoriaId,
        adicionaisIds: original?.adicionaisIds ?? [],
        ativo: editando.ativo,
      });
      setEditando(null);
      await carregar();
      aoAvisar(editando.id ? 'Produto atualizado' : 'Produto criado');
    } catch (erro) {
      aoAvisar(erro instanceof Error ? erro.message : 'Não foi possível salvar', true);
    }
  }

  async function remover(p: Produto) {
    if (!confirm(`Remover “${p.nome}” do cardápio?`)) return;
    await getProvider().menu.removerProduto(p.id);
    setEditando(null);
    await carregar();
    aoAvisar('Produto removido');
  }

  if (editando) {
    return (
      <>
        <header className="topo">
          <h1 className="topo-titulo">{editando.id ? 'Editar produto' : 'Novo produto'}</h1>
          <p className="topo-sub">O preço vale a partir do próximo pedido</p>
        </header>

        <div className="pagina">
          <div className="grupo">
            <label htmlFor="nome">Nome</label>
            <input
              id="nome"
              value={editando.nome}
              onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
              placeholder="X-Salada"
            />
          </div>

          <div className="grupo">
            <label htmlFor="desc">Descrição</label>
            <textarea
              id="desc"
              rows={2}
              value={editando.descricao}
              onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
              placeholder="Blend 160g, queijo, alface e tomate"
            />
          </div>

          <div className="grupo">
            <label htmlFor="preco">Preço em reais</label>
            <input
              id="preco"
              inputMode="decimal"
              value={editando.precoReais}
              onChange={(e) => setEditando({ ...editando, precoReais: e.target.value })}
              placeholder="25,00"
            />
            <p className="dica">Guardado em centavos, sem arredondamento de centavo.</p>
          </div>

          <div className="grupo">
            <label htmlFor="cat">Categoria</label>
            <select
              id="cat"
              value={editando.categoriaId}
              onChange={(e) => setEditando({ ...editando, categoriaId: e.target.value })}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grupo">
            <label htmlFor="ativo">Disponível</label>
            <select
              id="ativo"
              value={editando.ativo ? 'sim' : 'nao'}
              onChange={(e) => setEditando({ ...editando, ativo: e.target.value === 'sim' })}
            >
              <option value="sim">Sim, aparece no cardápio</option>
              <option value="nao">Não, fica oculto</option>
            </select>
          </div>

          <button type="button" className="botao-claro" onClick={() => void salvar()}>
            Salvar produto
          </button>
          <div style={{ height: 8 }} />
          <button type="button" className="botao-vazado" onClick={() => setEditando(null)}>
            Cancelar
          </button>

          {editando.id && (
            <>
              <div style={{ height: 24 }} />
              <button
                type="button"
                className="botao-vazado"
                style={{ color: 'var(--atrasado)', borderColor: 'var(--atrasado)' }}
                onClick={() => {
                  const p = produtos.find((x) => x.id === editando.id);
                  if (p) void remover(p);
                }}
              >
                Remover do cardápio
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <header className="topo">
        <h1 className="topo-titulo">Cardápio</h1>
        <p className="topo-sub">
          {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
        </p>
      </header>

      <div className="pagina">
        {carregando && <p className="dica">Carregando cardápio…</p>}

        {!carregando && categorias.length === 0 && (
          <div className="vazio">
            <p className="vazio-t">Sem categorias</p>
            <p>Crie uma categoria antes de cadastrar produtos.</p>
          </div>
        )}

        {categorias.map((cat) => {
          const daCategoria = produtos.filter((p) => p.categoriaId === cat.id);
          return (
            <section key={cat.id}>
              <h2 className="secao-t">{cat.nome}</h2>
              {daCategoria.length === 0 && <p className="dica">Nenhum produto nesta categoria.</p>}
              {daCategoria.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={`linha-item ${p.ativo ? '' : 'inativo'}`}
                  style={{ width: '100%', textAlign: 'left', color: 'inherit' }}
                  onClick={() =>
                    setEditando({
                      id: p.id,
                      nome: p.nome,
                      descricao: p.descricao,
                      precoReais: (p.preco / 100).toFixed(2).replace('.', ','),
                      categoriaId: p.categoriaId,
                      ativo: p.ativo,
                    })
                  }
                >
                  <div>
                    <div className="li-nome">
                      {p.nome}
                      {!p.ativo && ' · oculto'}
                    </div>
                    {p.descricao && <p className="li-desc">{p.descricao}</p>}
                  </div>
                  <span className="li-preco">{formatarBRL(p.preco)}</span>
                </button>
              ))}
            </section>
          );
        })}

        {categorias.length > 0 && (
          <>
            <div style={{ height: 20 }} />
            <button
              type="button"
              className="botao-claro"
              onClick={() => setEditando(vazio(categorias[0]?.id ?? ''))}
            >
              Adicionar produto
            </button>
          </>
        )}
      </div>
    </>
  );
}
