import { getProvider } from '@pedeja/data';
import {
  type Adicional,
  type Categoria,
  type Produto,
  formatarBRL,
  reaisParaCentavos,
} from '@pedeja/domain';
import { useCallback, useEffect, useState } from 'react';

type Props = { estabelecimentoId: string; aoAvisar: (t: string, erro?: boolean) => void };
type Secao = 'produtos' | 'categorias' | 'adicionais';

const emReais = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const paraCentavos = (s: string) => reaisParaCentavos(Number(s.replace(',', '.')) || 0);

type RascunhoProduto = {
  id?: string;
  nome: string;
  descricao: string;
  precoReais: string;
  categoriaId: string;
  imagem: string;
  adicionaisIds: string[];
  ativo: boolean;
};

export function Cardapio({ estabelecimentoId, aoAvisar }: Props) {
  const [secao, setSecao] = useState<Secao>('produtos');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [adicionais, setAdicionais] = useState<Adicional[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [produtoEdit, setProdutoEdit] = useState<RascunhoProduto | null>(null);
  const [categoriaEdit, setCategoriaEdit] = useState<Partial<Categoria> | null>(null);
  const [adicionalEdit, setAdicionalEdit] = useState<
    (Partial<Adicional> & { precoReais?: string }) | null
  >(null);

  const carregar = useCallback(async () => {
    const m = getProvider().menu;
    const [p, c, a] = await Promise.all([
      m.listarProdutos(estabelecimentoId),
      m.listarCategorias(estabelecimentoId),
      m.listarAdicionais(estabelecimentoId),
    ]);
    setProdutos(p);
    setCategorias(c);
    setAdicionais(a);
    setCarregando(false);
  }, [estabelecimentoId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function tentar(acao: () => Promise<void>, sucesso: string) {
    try {
      await acao();
      await carregar();
      aoAvisar(sucesso);
    } catch (e) {
      aoAvisar(e instanceof Error ? e.message : 'Não foi possível salvar', true);
    }
  }

  // ── Formulário de produto ────────────────────────────────────────────────
  if (produtoEdit) {
    const r = produtoEdit;
    return (
      <>
        <header className="topo">
          <h1 className="topo-titulo">{r.id ? 'Editar produto' : 'Novo produto'}</h1>
          <p className="topo-sub">O preço vale a partir do próximo pedido</p>
        </header>

        <div className="pagina">
          <div className="grupo">
            <label htmlFor="p-nome">Nome</label>
            <input
              id="p-nome"
              value={r.nome}
              onChange={(e) => setProdutoEdit({ ...r, nome: e.target.value })}
            />
          </div>
          <div className="grupo">
            <label htmlFor="p-desc">Descrição</label>
            <textarea
              id="p-desc"
              rows={2}
              value={r.descricao}
              onChange={(e) => setProdutoEdit({ ...r, descricao: e.target.value })}
            />
          </div>
          <div className="grupo">
            <label htmlFor="p-preco">Preço em reais</label>
            <input
              id="p-preco"
              inputMode="decimal"
              value={r.precoReais}
              onChange={(e) => setProdutoEdit({ ...r, precoReais: e.target.value })}
            />
          </div>
          <div className="grupo">
            <label htmlFor="p-cat">Categoria</label>
            <select
              id="p-cat"
              value={r.categoriaId}
              onChange={(e) => setProdutoEdit({ ...r, categoriaId: e.target.value })}
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grupo">
            <label htmlFor="p-img">Imagem (endereço)</label>
            <input
              id="p-img"
              value={r.imagem}
              onChange={(e) => setProdutoEdit({ ...r, imagem: e.target.value })}
              placeholder="/produtos/exemplo.webp"
            />
            <p className="dica">Upload de arquivo entra depois; por ora, um endereço.</p>
          </div>

          <h2 className="secao-t">Adicionais deste produto</h2>
          {adicionais.length === 0 && <p className="dica">Nenhum adicional cadastrado ainda.</p>}
          {adicionais.map((a) => (
            <button
              type="button"
              key={a.id}
              className="linha-item"
              style={{ width: '100%', textAlign: 'left', color: 'inherit' }}
              onClick={() =>
                setProdutoEdit({
                  ...r,
                  adicionaisIds: r.adicionaisIds.includes(a.id)
                    ? r.adicionaisIds.filter((x) => x !== a.id)
                    : [...r.adicionaisIds, a.id],
                })
              }
            >
              <span style={{ fontSize: '1.2rem', width: 24 }}>
                {r.adicionaisIds.includes(a.id) ? '☑' : '☐'}
              </span>
              <div className="li-nome">{a.nome}</div>
              <span className="li-preco">{formatarBRL(a.preco)}</span>
            </button>
          ))}

          <div className="grupo" style={{ marginTop: 20 }}>
            <label htmlFor="p-ativo">Disponível</label>
            <select
              id="p-ativo"
              value={r.ativo ? 'sim' : 'nao'}
              onChange={(e) => setProdutoEdit({ ...r, ativo: e.target.value === 'sim' })}
            >
              <option value="sim">Sim, aparece no cardápio</option>
              <option value="nao">Não, fica oculto</option>
            </select>
          </div>

          <button
            type="button"
            className="botao-claro"
            onClick={() => {
              if (!r.nome.trim()) return aoAvisar('Dê um nome ao produto', true);
              const preco = paraCentavos(r.precoReais);
              if (preco <= 0) return aoAvisar('Informe um preço válido', true);
              void tentar(
                async () => {
                  await getProvider().menu.salvarProduto({
                    ...(r.id ? { id: r.id } : {}),
                    estabelecimentoId,
                    nome: r.nome.trim(),
                    descricao: r.descricao.trim(),
                    preco,
                    imagem: r.imagem.trim() || null,
                    categoriaId: r.categoriaId,
                    adicionaisIds: r.adicionaisIds,
                    ativo: r.ativo,
                  });
                  setProdutoEdit(null);
                },
                r.id ? 'Produto atualizado' : 'Produto criado',
              );
            }}
          >
            Salvar produto
          </button>
          <div style={{ height: 8 }} />
          <button type="button" className="botao-vazado" onClick={() => setProdutoEdit(null)}>
            Cancelar
          </button>

          {r.id && (
            <>
              <div style={{ height: 24 }} />
              <button
                type="button"
                className="botao-vazado"
                style={{ color: 'var(--atrasado)', borderColor: 'var(--atrasado)' }}
                onClick={() => {
                  if (!confirm(`Remover “${r.nome}” do cardápio?`)) return;
                  void tentar(async () => {
                    await getProvider().menu.removerProduto(r.id as string);
                    setProdutoEdit(null);
                  }, 'Produto removido');
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

  // ── Formulário de categoria ──────────────────────────────────────────────
  if (categoriaEdit) {
    const c = categoriaEdit;
    return (
      <>
        <header className="topo">
          <h1 className="topo-titulo">{c.id ? 'Editar categoria' : 'Nova categoria'}</h1>
        </header>
        <div className="pagina">
          <div className="grupo">
            <label htmlFor="c-nome">Nome</label>
            <input
              id="c-nome"
              value={c.nome ?? ''}
              onChange={(e) => setCategoriaEdit({ ...c, nome: e.target.value })}
              placeholder="Pizzas"
            />
          </div>
          <div className="grupo">
            <label htmlFor="c-ordem">Ordem no cardápio</label>
            <input
              id="c-ordem"
              inputMode="numeric"
              value={String(c.ordem ?? 1)}
              onChange={(e) => setCategoriaEdit({ ...c, ordem: Number(e.target.value) || 1 })}
            />
          </div>
          <div className="grupo">
            <label htmlFor="c-sabores">Sabores por item</label>
            <select
              id="c-sabores"
              value={String(c.maxSabores ?? 1)}
              onChange={(e) => setCategoriaEdit({ ...c, maxSabores: Number(e.target.value) })}
            >
              <option value="1">1 — normal</option>
              <option value="2">2 — meio a meio</option>
              <option value="3">3 — três sabores</option>
              <option value="4">4 — quatro sabores</option>
            </select>
            <p className="dica">
              Acima de 1, o cliente pode montar o item com mais de um sabor da mesma categoria. O
              preço segue a regra escolhida em Ajustes.
            </p>
          </div>

          <button
            type="button"
            className="botao-claro"
            onClick={() => {
              if (!c.nome?.trim()) return aoAvisar('Dê um nome à categoria', true);
              void tentar(
                async () => {
                  await getProvider().menu.salvarCategoria({
                    ...(c.id ? { id: c.id } : {}),
                    estabelecimentoId,
                    nome: c.nome?.trim() ?? '',
                    ordem: c.ordem ?? 1,
                    maxSabores: c.maxSabores ?? 1,
                  });
                  setCategoriaEdit(null);
                },
                c.id ? 'Categoria atualizada' : 'Categoria criada',
              );
            }}
          >
            Salvar categoria
          </button>
          <div style={{ height: 8 }} />
          <button type="button" className="botao-vazado" onClick={() => setCategoriaEdit(null)}>
            Cancelar
          </button>

          {c.id && (
            <>
              <div style={{ height: 24 }} />
              <button
                type="button"
                className="botao-vazado"
                style={{ color: 'var(--atrasado)', borderColor: 'var(--atrasado)' }}
                onClick={() =>
                  void tentar(async () => {
                    await getProvider().menu.removerCategoria(c.id as string);
                    setCategoriaEdit(null);
                  }, 'Categoria removida')
                }
              >
                Remover categoria
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  // ── Formulário de adicional ──────────────────────────────────────────────
  if (adicionalEdit) {
    const a = adicionalEdit;
    return (
      <>
        <header className="topo">
          <h1 className="topo-titulo">{a.id ? 'Editar adicional' : 'Novo adicional'}</h1>
        </header>
        <div className="pagina">
          <div className="grupo">
            <label htmlFor="a-nome">Nome</label>
            <input
              id="a-nome"
              value={a.nome ?? ''}
              onChange={(e) => setAdicionalEdit({ ...a, nome: e.target.value })}
              placeholder="Bacon"
            />
          </div>
          <div className="grupo">
            <label htmlFor="a-preco">Preço em reais</label>
            <input
              id="a-preco"
              inputMode="decimal"
              value={a.precoReais ?? ''}
              onChange={(e) => setAdicionalEdit({ ...a, precoReais: e.target.value })}
              placeholder="5,00"
            />
          </div>
          <div className="grupo">
            <label htmlFor="a-ativo">Disponível</label>
            <select
              id="a-ativo"
              value={a.ativo === false ? 'nao' : 'sim'}
              onChange={(e) => setAdicionalEdit({ ...a, ativo: e.target.value === 'sim' })}
            >
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </div>

          <button
            type="button"
            className="botao-claro"
            onClick={() => {
              if (!a.nome?.trim()) return aoAvisar('Dê um nome ao adicional', true);
              void tentar(
                async () => {
                  await getProvider().menu.salvarAdicional({
                    ...(a.id ? { id: a.id } : {}),
                    estabelecimentoId,
                    nome: a.nome?.trim() ?? '',
                    preco: paraCentavos(a.precoReais ?? '0'),
                    ativo: a.ativo !== false,
                  });
                  setAdicionalEdit(null);
                },
                a.id ? 'Adicional atualizado' : 'Adicional criado',
              );
            }}
          >
            Salvar adicional
          </button>
          <div style={{ height: 8 }} />
          <button type="button" className="botao-vazado" onClick={() => setAdicionalEdit(null)}>
            Cancelar
          </button>

          {a.id && (
            <>
              <div style={{ height: 24 }} />
              <button
                type="button"
                className="botao-vazado"
                style={{ color: 'var(--atrasado)', borderColor: 'var(--atrasado)' }}
                onClick={() => {
                  if (!confirm(`Remover “${a.nome}”? Ele sai de todos os produtos.`)) return;
                  void tentar(async () => {
                    await getProvider().menu.removerAdicional(a.id as string);
                    setAdicionalEdit(null);
                  }, 'Adicional removido');
                }}
              >
                Remover adicional
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  // ── Listas ───────────────────────────────────────────────────────────────
  return (
    <>
      <header className="topo">
        <h1 className="topo-titulo">Cardápio</h1>
        <p className="topo-sub">
          {produtos.length} produtos · {categorias.length} categorias · {adicionais.length}{' '}
          adicionais
        </p>
        <fieldset className="filtros">
          <legend className="oculto">Seção do cardápio</legend>
          {(['produtos', 'categorias', 'adicionais'] as Secao[]).map((s) => (
            <button
              key={s}
              type="button"
              className="filtro"
              aria-pressed={secao === s}
              onClick={() => setSecao(s)}
            >
              {s}
            </button>
          ))}
        </fieldset>
      </header>

      <div className="pagina">
        {carregando && <p className="dica">Carregando…</p>}

        {secao === 'produtos' && (
          <>
            {categorias.length === 0 && (
              <div className="vazio">
                <p className="vazio-t">Crie uma categoria primeiro</p>
                <p>Produto precisa pertencer a uma categoria.</p>
              </div>
            )}
            {categorias.map((cat) => (
              <section key={cat.id}>
                <h2 className="secao-t">{cat.nome}</h2>
                {produtos.filter((p) => p.categoriaId === cat.id).length === 0 && (
                  <p className="dica">Nenhum produto aqui.</p>
                )}
                {produtos
                  .filter((p) => p.categoriaId === cat.id)
                  .map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className={`linha-item ${p.ativo ? '' : 'inativo'}`}
                      style={{ width: '100%', textAlign: 'left', color: 'inherit' }}
                      onClick={() =>
                        setProdutoEdit({
                          id: p.id,
                          nome: p.nome,
                          descricao: p.descricao,
                          precoReais: emReais(p.preco),
                          categoriaId: p.categoriaId,
                          imagem: p.imagem ?? '',
                          adicionaisIds: p.adicionaisIds,
                          ativo: p.ativo,
                        })
                      }
                    >
                      {p.imagem && <img className="li-foto" src={p.imagem} alt="" loading="lazy" />}
                      <div>
                        <div className="li-nome">
                          {p.nome}
                          {!p.ativo && ' · oculto'}
                        </div>
                        {p.adicionaisIds.length > 0 && (
                          <p className="li-desc">{p.adicionaisIds.length} adicional(is)</p>
                        )}
                      </div>
                      <span className="li-preco">{formatarBRL(p.preco)}</span>
                    </button>
                  ))}
              </section>
            ))}
            {categorias.length > 0 && (
              <>
                <div style={{ height: 20 }} />
                <button
                  type="button"
                  className="botao-claro"
                  onClick={() =>
                    setProdutoEdit({
                      nome: '',
                      descricao: '',
                      precoReais: '',
                      categoriaId: categorias[0]?.id ?? '',
                      imagem: '',
                      adicionaisIds: [],
                      ativo: true,
                    })
                  }
                >
                  Adicionar produto
                </button>
              </>
            )}
          </>
        )}

        {secao === 'categorias' && (
          <>
            {categorias.map((c) => (
              <button
                type="button"
                key={c.id}
                className="linha-item"
                style={{ width: '100%', textAlign: 'left', color: 'inherit' }}
                onClick={() => setCategoriaEdit(c)}
              >
                <div>
                  <div className="li-nome">{c.nome}</div>
                  <p className="li-desc">
                    ordem {c.ordem} ·{' '}
                    {c.maxSabores > 1 ? `até ${c.maxSabores} sabores` : 'um sabor'}
                  </p>
                </div>
                <span className="li-preco">
                  {produtos.filter((p) => p.categoriaId === c.id).length}
                </span>
              </button>
            ))}
            <div style={{ height: 20 }} />
            <button
              type="button"
              className="botao-claro"
              onClick={() =>
                setCategoriaEdit({ nome: '', ordem: categorias.length + 1, maxSabores: 1 })
              }
            >
              Adicionar categoria
            </button>
          </>
        )}

        {secao === 'adicionais' && (
          <>
            {adicionais.length === 0 && <p className="dica">Nenhum adicional cadastrado.</p>}
            {adicionais.map((a) => (
              <button
                type="button"
                key={a.id}
                className={`linha-item ${a.ativo ? '' : 'inativo'}`}
                style={{ width: '100%', textAlign: 'left', color: 'inherit' }}
                onClick={() => setAdicionalEdit({ ...a, precoReais: emReais(a.preco) })}
              >
                <div className="li-nome">
                  {a.nome}
                  {!a.ativo && ' · oculto'}
                </div>
                <span className="li-preco">{formatarBRL(a.preco)}</span>
              </button>
            ))}
            <div style={{ height: 20 }} />
            <button
              type="button"
              className="botao-claro"
              onClick={() => setAdicionalEdit({ nome: '', precoReais: '', ativo: true })}
            >
              Adicionar adicional
            </button>
          </>
        )}
      </div>
    </>
  );
}
