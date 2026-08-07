import { type Adicional, type Produto, formatarBRL, multiplicar, somar } from '@pedeja/domain';
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

  function alternar(id: string) {
    setEscolhidos((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

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
        <div className="puxador" />
        {produto.imagem && (
          <img className="folha-foto" src={produto.imagem} alt={produto.nome} decoding="async" />
        )}
        <h2>{produto.nome}</h2>
        {produto.descricao && <p className="folha-desc">{produto.descricao}</p>}

        {disponiveis.length > 0 && (
          <>
            <p className="bloco-t">Adicionais</p>
            {disponiveis.map((a) => (
              <label className="opcao" key={a.id}>
                <input
                  type="checkbox"
                  checked={escolhidos.includes(a.id)}
                  onChange={() => alternar(a.id)}
                />
                <span className="opcao-nome">{a.nome}</span>
                <span className="opcao-preco">+ {formatarBRL(a.preco)}</span>
              </label>
            ))}
          </>
        )}

        <p className="bloco-t">Alguma observação?</p>
        <div className="campo">
          <textarea
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Sem cebola, ponto da carne, etc."
          />
        </div>

        <div className="qtd">
          <button
            type="button"
            onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
            disabled={quantidade === 1}
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <span className="qtd-n">{quantidade}</span>
          <button
            type="button"
            onClick={() => setQuantidade((q) => Math.min(20, q + 1))}
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>

        <div style={{ height: 20 }} />
        <button
          type="button"
          className="principal"
          onClick={() => aoAdicionar(montarLinha(produto, quantidade, marcados, observacao))}
        >
          <span className="principal-rotulo">Adicionar</span>
          <span className="principal-valor">{formatarBRL(previa)}</span>
        </button>
        <div style={{ height: 8 }} />
        <button type="button" className="secundario" onClick={aoFechar}>
          Voltar ao cardápio
        </button>
      </div>
    </dialog>
  );
}
