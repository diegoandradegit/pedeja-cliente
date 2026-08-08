import { getProvider } from '@pedeja/data';
import { useState } from 'react';

type Props = { aoEntrar: () => void };

export function Entrar({ aoEntrar }: Props) {
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function criarConta() {
    setErro(null);
    setEnviando(true);
    try {
      const p = getProvider();
      await p.auth.criarConta({
        email: email.trim(),
        senha,
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ''),
      });
      // o convite é o que liga a conta ao restaurante
      await p.delivery.usarConvite(codigo);
      aoEntrar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a conta');
    } finally {
      setEnviando(false);
    }
  }

  async function entrar() {
    setErro(null);
    setEnviando(true);
    try {
      await getProvider().auth.entrar(email.trim(), senha, 'ENTREGADOR');
      aoEntrar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <header className="topo">
        <h1>PedeJá Entregador</h1>
        <p>
          {modo === 'entrar'
            ? 'Entre para ver as corridas'
            : 'Crie sua conta com o código do restaurante'}
        </p>
      </header>

      <div className="pagina">
        {modo === 'criar' && (
          <>
            <div className="grupo">
              <label htmlFor="nome">Seu nome</label>
              <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grupo">
              <label htmlFor="tel">Telefone</label>
              <input
                id="tel"
                inputMode="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(44) 99999-0000"
              />
            </div>
            <div className="grupo">
              <label htmlFor="codigo">Código do convite</label>
              <input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                style={{ letterSpacing: '0.12em', fontFamily: 'ui-monospace, monospace' }}
              />
              <p className="dica">Peça ao restaurante. Vale uma vez só.</p>
            </div>
          </>
        )}
        <div className="grupo">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grupo">
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && email && senha && void entrar()}
          />
        </div>

        {erro && <p className="dica dica-erro">{erro}</p>}

        <div style={{ height: 8 }} />
        {modo === 'entrar' ? (
          <>
            <button
              type="button"
              className="acao"
              disabled={enviando || !email.trim() || !senha}
              onClick={() => void entrar()}
            >
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
            <div style={{ height: 10 }} />
            <button
              type="button"
              className="acao-vazada"
              onClick={() => {
                setModo('criar');
                setErro(null);
              }}
            >
              Tenho um código de convite
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="acao"
              disabled={
                enviando || !email.trim() || senha.length < 6 || !nome.trim() || !codigo.trim()
              }
              onClick={() => void criarConta()}
            >
              {enviando ? 'Criando…' : 'Criar conta'}
            </button>
            <div style={{ height: 10 }} />
            <button
              type="button"
              className="acao-vazada"
              onClick={() => {
                setModo('entrar');
                setErro(null);
              }}
            >
              Já tenho conta
            </button>
            <p className="dica" style={{ marginTop: 14 }}>
              A senha precisa ter ao menos 6 caracteres.
            </p>
          </>
        )}
      </div>
    </>
  );
}
