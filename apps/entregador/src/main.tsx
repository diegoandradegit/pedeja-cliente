import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { configurarDados } from './bootstrap.js';
import './estilo.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('#root nao encontrado');

configurarDados()
  .then(() => {
    createRoot(raiz).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((erro: unknown) => {
    raiz.textContent = `Falha ao iniciar: ${String(erro)}`;
  });
