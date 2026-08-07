import type { Estabelecimento, Pedido } from '@pedeja/domain';
import { useEffect, useState } from 'react';
import { type Linha, juntar } from './lib/carrinho.js';
import { Acompanhar } from './telas/Acompanhar.js';
import { Checkout } from './telas/Checkout.js';
import { Loja } from './telas/Loja.js';
import { Lojas } from './telas/Lojas.js';

type Tela = 'lojas' | 'loja' | 'conta' | 'acompanhar';

export function App() {
  const [tela, setTela] = useState<Tela>('lojas');
  const [loja, setLoja] = useState<Estabelecimento | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 3600);
    return () => clearTimeout(t);
  }, [aviso]);

  const avisar = (texto: string, erro = false) => setAviso({ texto, erro });

  function recomecar() {
    setLinhas([]);
    setPedido(null);
    setLoja(null);
    setTela('lojas');
  }

  return (
    <>
      {tela === 'lojas' && (
        <Lojas
          aoEscolher={(l) => {
            setLoja(l);
            setLinhas([]);
            setTela('loja');
          }}
        />
      )}

      {tela === 'loja' && loja && (
        <Loja
          loja={loja}
          linhas={linhas}
          aoVoltar={() => setTela('lojas')}
          aoAdicionar={(linha) => {
            setLinhas((atual) => juntar(atual, linha));
            avisar(`${linha.nome} na conta`);
          }}
          aoVerConta={() => setTela('conta')}
        />
      )}

      {tela === 'conta' && loja && (
        <Checkout
          loja={loja}
          linhas={linhas}
          aoVoltar={() => setTela('loja')}
          aoTirar={(chave) => setLinhas((atual) => atual.filter((l) => l.chave !== chave))}
          aoConfirmar={(p) => {
            setPedido(p);
            setLinhas([]);
            setTela('acompanhar');
          }}
          aoAvisar={avisar}
        />
      )}

      {tela === 'acompanhar' && pedido && (
        <Acompanhar pedidoInicial={pedido} aoNovoPedido={recomecar} />
      )}

      {aviso && (
        <output className="aviso" data-tom={aviso.erro ? 'erro' : undefined}>
          {aviso.texto}
        </output>
      )}
    </>
  );
}
