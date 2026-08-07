import { getProvider } from '@pedeja/data';
import { type Categoria, type Estabelecimento, type Produto, formatarBRL } from '@pedeja/domain';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Props = { loja: Estabelecimento; aoEscolher: (produto: Produto) => void };

/** melhoria: ignora acento e caixa — "acai" acha "Açaí". */
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

  const categoriaDe = (id: string) => categorias.find((c) => c.id === id)?.nome ?? '';

  return (
    <>
      <div className="busca-caixa">
        <Search size={26} strokeWidth={2.5} />
        <input
          type="search"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Buscar por nome..."
          aria-label="Buscar no cardápio"
        />
      </div>

      <div className="pagina">
        {carregando && (
          <p className="dica" style={{ marginTop: 18 }}>
            Carregando cardápio…
          </p>
        )}

        {!carregando && termo.trim().length < 2 && (
          <div className="vazio">
            <p className="vazio-t">O que você está com vontade?</p>
            <p>Digite pelo menos duas letras.</p>
          </div>
        )}

        {!carregando && termo.trim().length >= 2 && achados.length === 0 && (
          <div className="vazio">
            <p className="vazio-t">Nada com “{termo.trim()}”</p>
            <p>Tente outro termo ou volte ao cardápio.</p>
          </div>
        )}

        {achados.map((p) => (
          <button type="button" className="prato" key={p.id} onClick={() => aoEscolher(p)}>
            <span className="prato-texto">
              <span className="prato-nome">{p.nome}</span>
              {p.descricao && <span className="prato-desc">{p.descricao}</span>}
              <span className="prato-preco">{formatarBRL(p.preco)}</span>
            </span>
            {p.imagem && <img className="prato-foto" src={p.imagem} alt="" loading="lazy" />}
          </button>
        ))}

        {achados.length > 0 && (
          <p className="dica">
            {achados.length} {achados.length === 1 ? 'item' : 'itens'} em{' '}
            {[...new Set(achados.map((p) => categoriaDe(p.categoriaId)))].join(', ')}.
          </p>
        )}
      </div>
    </>
  );
}
