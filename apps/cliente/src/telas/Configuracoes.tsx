import { useState } from 'react';
import { buscarCep, formatarCep, formatarTelefone } from '../lib/cep.js';
import { type Perfil, gravar, ler } from '../lib/perfil.js';

type Props = { aoAvisar: (texto: string, erro?: boolean) => void };

/**
 * melhoria: no original esta aba existia sem conteudo. Aqui ela guarda os
 * dados do cliente, e o checkout ja nasce preenchido no proximo pedido.
 */
export function Configuracoes({ aoAvisar }: Props) {
  const [p, setP] = useState<Perfil>(ler());

  const campo = (k: keyof Perfil, valor: string) => setP((atual) => ({ ...atual, [k]: valor }));

  async function porCep(valor: string) {
    campo('cep', formatarCep(valor));
    if (valor.replace(/\D/g, '').length !== 8) return;
    const achado = await buscarCep(valor);
    if (!achado) return aoAvisar('CEP não encontrado', true);
    setP((atual) => ({
      ...atual,
      logradouro: achado.logradouro,
      bairro: achado.bairro,
      cidade: achado.cidade,
      uf: achado.uf,
    }));
  }

  return (
    <>
      <div className="folha-cabecalho">
        <h2>Configurações</h2>
      </div>

      <div className="pagina">
        <p className="bloco-titulo">Seus dados</p>
        <p className="dica" style={{ marginBottom: 16 }}>
          Guardados só neste aparelho. Servem para não preencher tudo de novo a cada pedido.
        </p>

        <div className="campo">
          <label htmlFor="c-nome">Nome</label>
          <input id="c-nome" value={p.nome} onChange={(e) => campo('nome', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="c-tel">Telefone</label>
          <input
            id="c-tel"
            inputMode="tel"
            value={p.telefone}
            onChange={(e) => campo('telefone', formatarTelefone(e.target.value))}
            placeholder="(44) 99999-0000"
          />
        </div>

        <p className="bloco-titulo">Endereço de entrega</p>
        <div className="campo">
          <label htmlFor="c-cep">CEP</label>
          <input
            id="c-cep"
            inputMode="numeric"
            value={p.cep}
            onChange={(e) => void porCep(e.target.value)}
            placeholder="87020-000"
          />
        </div>
        <div className="campo">
          <label htmlFor="c-rua">Rua</label>
          <input
            id="c-rua"
            value={p.logradouro}
            onChange={(e) => campo('logradouro', e.target.value)}
          />
        </div>
        <div className="campo-duplo">
          <div className="campo" style={{ flex: 1 }}>
            <label htmlFor="c-num">Número</label>
            <input
              id="c-num"
              inputMode="numeric"
              value={p.numero}
              onChange={(e) => campo('numero', e.target.value)}
            />
          </div>
          <div className="campo" style={{ flex: 2 }}>
            <label htmlFor="c-compl">Complemento</label>
            <input
              id="c-compl"
              value={p.complemento}
              onChange={(e) => campo('complemento', e.target.value)}
            />
          </div>
        </div>
        <div className="campo-duplo">
          <div className="campo" style={{ flex: 2 }}>
            <label htmlFor="c-bairro">Bairro</label>
            <input
              id="c-bairro"
              value={p.bairro}
              onChange={(e) => campo('bairro', e.target.value)}
            />
          </div>
          <div className="campo" style={{ flex: 2 }}>
            <label htmlFor="c-cid">Cidade</label>
            <input id="c-cid" value={p.cidade} onChange={(e) => campo('cidade', e.target.value)} />
          </div>
          <div className="campo" style={{ flex: 1 }}>
            <label htmlFor="c-uf">UF</label>
            <input
              id="c-uf"
              maxLength={2}
              value={p.uf}
              onChange={(e) => campo('uf', e.target.value)}
            />
          </div>
        </div>

        <div style={{ height: 8 }} />
        <button
          type="button"
          className="acao acao-centro"
          onClick={() => {
            gravar(p);
            aoAvisar('Dados salvos neste aparelho');
          }}
        >
          Salvar
        </button>
      </div>
    </>
  );
}
