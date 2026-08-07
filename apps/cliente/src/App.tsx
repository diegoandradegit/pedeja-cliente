import { getProvider } from '@pedeja/data';
import { type Estabelecimento, formatarBRL } from '@pedeja/domain';
import { useEffect, useState } from 'react';

export function App() {
  const [lojas, setLojas] = useState<Estabelecimento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    getProvider()
      .menu.listarEstabelecimentos()
      .then(setLojas)
      .catch((e: unknown) => setErro(String(e)));
  }, []);

  return (
    <main>
      <h1>PedeJá</h1>
      <p className="sub">Escolha onde pedir</p>

      {erro && <div className="card">{erro}</div>}
      {!lojas && !erro && <div className="vazio">Carregando…</div>}

      {lojas?.map((l) => (
        <article className="card" key={l.id}>
          <div className="linha">
            <strong>{l.nome}</strong>
            <span className="tag">{l.aceitaRetirada ? 'ENTREGA E RETIRADA' : 'ENTREGA'}</span>
          </div>
          <p className="sub" style={{ margin: '6px 0 0' }}>
            {l.descricao} · {l.endereco}
          </p>
        </article>
      ))}

      <p className="fase">
        Fase 0 concluída. Dados vindos do provider <code>mock</code> — sem backend.
        <br />
        Próximo: Fase 4 (cardápio, carrinho, checkout, acompanhamento em tempo real).
        <br />
        Exemplo de formatação monetária em centavos: {formatarBRL(2500)}
      </p>
    </main>
  );
}
