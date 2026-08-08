import { formatarBRL } from '@pedeja/domain';
import { ShoppingBag } from 'lucide-react';
import { type Linha, previaSubtotal, totalDeItens } from '../lib/carrinho.js';

type Props = { linhas: Linha[]; aoAbrir: () => void };

/** Sacolinha flutuante com contador e prévia do valor. */
export function Sacola({ linhas, aoAbrir }: Props) {
  const itens = totalDeItens(linhas);
  if (itens === 0) return null;

  return (
    <>
      <button
        type="button"
        className="sacola"
        onClick={aoAbrir}
        // a chave force o pulinho a cada item novo
        key={itens}
        aria-label={`Abrir sacola com ${itens} ${itens === 1 ? 'item' : 'itens'}`}
      >
        <ShoppingBag size={26} strokeWidth={2.2} />
        <span className="sacola-conta" aria-hidden="true">
          {itens}
        </span>
      </button>
      <span className="sacola-valor" aria-hidden="true">
        {formatarBRL(previaSubtotal(linhas))}
      </span>
    </>
  );
}
