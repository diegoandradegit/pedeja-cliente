import { type Adicional, type Produto, formatarBRL, multiplicar, somar } from '@pedeja/domain';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { type Linha, montarLinha } from '../lib/carrinho.js';

type Props = {
  produto: Produto;
  adicionais: Adicional[];
  aoFechar: () => void;
  aoAdicionar: (linha: Linha) => void;
};

export function FolhaProduto({ produto, adicionais, aoFechar, aoAdicionar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!el.open) el.showModal();
    const foraDaFolha = (e: MouseEvent) => {
      if (e.target === el) aoFechar();
    };
    el.addEventListener('click', foraDaFolha);
    return () => el.removeEventListener('click', foraDaFolha);
  }, [aoFechar]);

  const disponiveis = adicionais.filter((a) => produto.adicionaisIds.includes(a.id) && a.ativo);
  const marcados = disponiveis.filter((a) => escolhidos.includes(a.id));
  const previa = multiplicar(somar(produto.preco, ...marcados.map((a) => a.preco)), quantidade);

  return (
    <dialog
      ref={ref}
      className="folha-fundo"
      aria-label={produto.nome}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
    >
      <div className="folha">
        {produto.imagem && <img className="folha-foto" src={produto.imagem} alt={produto.nome} />}

        <div className="folha-corpo">
          <h2 className="folha-titulo">{produto.nome}</h2>
          {produto.descricao && <p className="folha-desc">{produto.descricao}</p>}
          <p className="folha-preco">{formatarBRL(produto.preco)}</p>

          {disponiveis.length > 0 && (
            <>
              <p className="bloco-titulo">Adicionais</p>
              {disponiveis.map((a) => (
                <label className="adicional" key={a.id}>
                  {/* melhoria: no original o seletor parecia escolha unica; aqui é
                      múltipla escolha de verdade, que é como adicional funciona */}
                  <input
                    type="checkbox"
                    checked={escolhidos.includes(a.id)}
                    onChange={() =>
                      setEscolhidos((atual) =>
                        atual.includes(a.id) ? atual.filter((x) => x !== a.id) : [...atual, a.id],
                      )
                    }
                  />
                  <span className="marca" aria-hidden="true">
                    <Check size={16} strokeWidth={3} />
                  </span>
                  <span className="adicional-nome">{a.nome}</span>
                  <span className="adicional-preco">{formatarBRL(a.preco)}</span>
                </label>
              ))}
            </>
          )}

          {/* melhoria: observação por item — o original não tinha */}
          <p className="bloco-rotulo">Alguma observação?</p>
          <div className="campo">
            <textarea
              rows={2}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Sem cebola, ponto da carne…"
            />
          </div>

          <button type="button" className="secundaria" onClick={aoFechar}>
            Voltar ao cardápio
          </button>
          <div style={{ height: 16 }} />
        </div>

        <div className="folha-rodape">
          <div className="passo">
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              disabled={quantidade === 1}
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span>{quantidade}</span>
            <button
              type="button"
              onClick={() => setQuantidade((q) => Math.min(20, q + 1))}
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="acao"
            onClick={() => aoAdicionar(montarLinha(produto, quantidade, marcados, observacao))}
          >
            <span>Adicionar</span>
            <span>{formatarBRL(previa)}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
