import {
  type Adicional,
  type Categoria,
  type Produto,
  formatarBRL,
  multiplicar,
  somar,
} from '@pedeja/domain';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { type Linha, montarLinha } from '../lib/carrinho.js';

type Props = {
  produto: Produto;
  adicionais: Adicional[];
  /** Categoria do produto: define quantos sabores o item aceita. */
  categoria: Categoria | undefined;
  /** Outros produtos da mesma categoria, para o meio a meio. */
  irmaos: Produto[];
  aoFechar: () => void;
  aoAdicionar: (linha: Linha) => void;
};

export function FolhaProduto({
  produto,
  adicionais,
  categoria,
  irmaos,
  aoFechar,
  aoAdicionar,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [escolhidos, setEscolhidos] = useState<string[]>([]);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [extras, setExtras] = useState<Produto[]>([]);

  const maxSabores = categoria?.maxSabores ?? 1;
  const podeFracionar = maxSabores > 1 && irmaos.length > 0;
  const vagasRestantes = maxSabores - 1 - extras.length;

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
  // previa: o sabor mais caro. Se a loja cobrar a media, a cotacao no checkout
  // corrige — o valor que vale e sempre o do servidor.
  const base = Math.max(produto.preco, ...extras.map((e) => e.preco));
  const previa = multiplicar(somar(base, ...marcados.map((a) => a.preco)), quantidade);

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

          {podeFracionar && (
            <>
              <p className="bloco-titulo">
                Meio a meio
                <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--cinza)' }}>
                  {' '}
                  · até {maxSabores} sabores
                </span>
              </p>
              <p className="folha-desc" style={{ margin: '0 0 8px' }}>
                {extras.length === 0
                  ? 'Quer dividir? Escolha outro sabor.'
                  : `${1 + extras.length} sabores: ${[produto, ...extras].map((s) => s.nome).join(' + ')}`}
              </p>
              {irmaos.map((s) => {
                const marcado = extras.some((e) => e.id === s.id);
                return (
                  <label className="adicional" key={s.id}>
                    <input
                      type="checkbox"
                      checked={marcado}
                      disabled={!marcado && vagasRestantes <= 0}
                      onChange={() =>
                        setExtras((atual) =>
                          marcado ? atual.filter((e) => e.id !== s.id) : [...atual, s],
                        )
                      }
                    />
                    <span className="marca" aria-hidden="true">
                      <Check size={16} strokeWidth={3} />
                    </span>
                    <span className="adicional-nome">{s.nome}</span>
                    <span className="adicional-preco">{formatarBRL(s.preco)}</span>
                  </label>
                );
              })}
              {vagasRestantes <= 0 && (
                <p className="dica">Máximo de sabores atingido. Desmarque um para trocar.</p>
              )}
            </>
          )}

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
            onClick={() =>
              aoAdicionar(montarLinha(produto, quantidade, marcados, observacao, extras))
            }
          >
            <span>Adicionar</span>
            <span>{formatarBRL(previa)}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}
