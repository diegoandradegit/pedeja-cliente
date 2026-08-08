import { getProvider } from '@pedeja/data';
import { useState } from 'react';

type Props = { aoEntrar: () => void };

export function Entrar({ aoEntrar }: Props) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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
        <p>Entre para ver as corridas</p>
      </header>

      <div className="pagina">
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
        <button
          type="button"
          className="acao"
          disabled={enviando || !email.trim() || !senha}
          onClick={() => void entrar()}
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="dica" style={{ marginTop: 18 }}>
          O cadastro de entregador é feito pelo restaurante.
        </p>
      </div>
    </>
  );
}
