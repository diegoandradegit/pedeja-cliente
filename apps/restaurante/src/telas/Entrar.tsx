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
      await getProvider().auth.entrar(email.trim(), senha, 'RESTAURANTE');
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
        <h1 className="topo-titulo">PedeJá Painel</h1>
        <p className="topo-sub">Entre para ver as comandas</p>
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
            onKeyDown={(e) => e.key === 'Enter' && senha && void entrar()}
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
            onKeyDown={(e) => e.key === 'Enter' && email && void entrar()}
          />
        </div>

        {erro && (
          <p className="dica" style={{ color: 'var(--atrasado)' }}>
            {erro}
          </p>
        )}

        <div style={{ height: 10 }} />
        <button
          type="button"
          className="botao-claro"
          disabled={enviando || !email.trim() || !senha}
          onClick={() => void entrar()}
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="dica" style={{ marginTop: 20 }}>
          O acesso é liberado por quem administra o restaurante. Não há cadastro aberto aqui — se
          você deveria ter acesso e não consegue entrar, peça o vínculo da sua conta.
        </p>
      </div>
    </>
  );
}
