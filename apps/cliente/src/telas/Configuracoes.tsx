import { getProvider } from '@pedeja/data';
import { useEffect, useState } from 'react';
import { buscarCep, formatarCep, formatarTelefone } from '../lib/cep.js';
import { listar } from '../lib/historico.js';
import { type Perfil, gravar, ler } from '../lib/perfil.js';

type Props = { aoAvisar: (texto: string, erro?: boolean) => void };

type Conta = { email: string } | null;

/**
 * melhoria: no original esta aba existia sem conteudo. Aqui ela guarda os
 * dados do cliente, e o checkout ja nasce preenchido no proximo pedido.
 */
export function Configuracoes({ aoAvisar }: Props) {
  const [p, setP] = useState<Perfil>(ler());
  const [conta, setConta] = useState<Conta>(null);
  const [modo, setModo] = useState<'nada' | 'criar' | 'entrar'>('nada');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    getProvider()
      .auth.sessaoAtual()
      .then((s) => setConta(s ? { email: s.email } : null))
      .catch(() => setConta(null));
  }, []);

  /**
   * Ao entrar, adotamos os pedidos deste aparelho para a conta. O que prova
   * posse são os ids guardados aqui — vincular só pelo telefone deixaria
   * qualquer um herdar o histórico alheio digitando o número.
   */
  async function adotarPedidos() {
    const ids = listar();
    if (ids.length === 0) return;
    try {
      const n = await getProvider().orders.vincularPedidos(ids);
      if (n > 0) aoAvisar(`${n} pedido(s) vinculado(s) à sua conta`);
    } catch {
      // vínculo é bônus: se falhar, a conta continua funcionando
    }
  }

  async function autenticar() {
    setOcupado(true);
    try {
      const auth = getProvider().auth;
      const sessao =
        modo === 'criar'
          ? await auth.criarConta({
              email: email.trim(),
              senha,
              nome: p.nome,
              telefone: p.telefone.replace(/\D/g, ''),
            })
          : await auth.entrar(email.trim(), senha, 'CLIENTE');
      setConta({ email: sessao.email });
      setModo('nada');
      setSenha('');
      await adotarPedidos();
      aoAvisar(modo === 'criar' ? 'Conta criada' : 'Bem-vindo de volta');
    } catch (e) {
      aoAvisar(e instanceof Error ? e.message : 'Não foi possível continuar', true);
    } finally {
      setOcupado(false);
    }
  }

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

        <p className="bloco-titulo">Sua conta</p>

        {conta ? (
          <>
            <p className="dica" style={{ marginBottom: 14 }}>
              Conectado como <strong>{conta.email}</strong>. Seus pedidos ficam disponíveis em
              qualquer aparelho.
            </p>
            <button
              type="button"
              className="secundaria"
              onClick={() =>
                void getProvider()
                  .auth.sair()
                  .then(() => {
                    setConta(null);
                    aoAvisar('Você saiu da conta');
                  })
              }
            >
              Sair da conta
            </button>
          </>
        ) : modo === 'nada' ? (
          <>
            <p className="dica" style={{ marginBottom: 14 }}>
              Pedir não exige conta. Criando uma, seu histórico deixa de depender deste celular: os
              pedidos feitos aqui passam a te acompanhar em qualquer aparelho.
            </p>
            <button type="button" className="acao acao-centro" onClick={() => setModo('criar')}>
              Criar conta
            </button>
            <div style={{ height: 10 }} />
            <button type="button" className="secundaria" onClick={() => setModo('entrar')}>
              Já tenho conta
            </button>
          </>
        ) : (
          <>
            <div className="campo">
              <label htmlFor="c-email">E-mail</label>
              <input
                id="c-email"
                type="email"
                inputMode="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="c-senha">Senha</label>
              <input
                id="c-senha"
                type="password"
                autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              {modo === 'criar' && <p className="dica">Ao menos 6 caracteres.</p>}
            </div>
            <button
              type="button"
              className="acao acao-centro"
              disabled={ocupado || !email.trim() || senha.length < 6}
              onClick={() => void autenticar()}
            >
              {ocupado ? 'Aguarde…' : modo === 'criar' ? 'Criar conta' : 'Entrar'}
            </button>
            <div style={{ height: 10 }} />
            <button type="button" className="secundaria" onClick={() => setModo('nada')}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </>
  );
}
