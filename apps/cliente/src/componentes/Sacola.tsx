import { formatarBRL } from '@pedeja/domain';
import { type Linha, previaSubtotal, totalDeItens } from '../lib/carrinho.js';

type Props = { linhas: Linha[]; aoAbrir: () => void };

/** Sacolinha flutuante com contador e prévia do valor. */
/** Barra fixa acima das abas: quantos itens e quanto está dando. */
export function Sacola({ linhas, aoAbrir }: Props) {
  const itens = totalDeItens(linhas);
  if (itens === 0) return null;

  return (
    <div className="barra-carrinho">
      <button type="button" onClick={aoAbrir}>
        <span className="carrinho-n" aria-hidden="true">
          {itens}
        </span>
        <span>Ver carrinho</span>
        <span className="carrinho-valor">{formatarBRL(previaSubtotal(linhas))}</span>
      </button>
    </div>
  );
}
