# PedeJá

Plataforma de delivery em PWA — app do cliente, app do entregador e painel do restaurante.
Hospedagem na Netlify, dados no Supabase.

## Estrutura

```
apps/
├── cliente/       PWA — cardápio, carrinho, checkout, acompanhamento
├── entregador/    PWA — corridas, rota, extrato
└── restaurante/   PWA — kanban de pedidos, cardápio, configurações
packages/
├── domain/        regras de negócio puras (sem I/O), 100% testadas
└── data/          contratos dos repositórios + implementações
supabase/          migrations, RLS e RPCs (Fase 6)
```

## Rodando

```bash
pnpm install
pnpm dev:cliente      # http://localhost:5173
pnpm dev:entregador   # http://localhost:5174
pnpm dev:restaurante  # http://localhost:5175
```

```bash
pnpm test        # domínio + contrato
pnpm typecheck
pnpm lint
pnpm build
```

## A regra que sustenta o projeto

A UI **nunca** conhece a origem dos dados. Todo componente fala com
`getProvider()`, que devolve a interface `DataProvider` definida em
`packages/data/src/contracts`. Hoje existe uma implementação (`mock`, em
memória); na Fase 6 entra a `supabase`, e a troca é uma variável de ambiente:

```
VITE_DATA_PROVIDER=mock | supabase
```

Isso permite construir os três apps inteiros antes de existir banco. A suíte em
`packages/data/src/contract.test.ts` roda contra qualquer provider — quando o
Supabase entrar, os mesmos testes provam que o banco se comporta igual ao mock.

**Nenhum componente pode importar `@pedeja/data/mock` ou `@pedeja/data/supabase`
diretamente.** Há uma regra de lint que barra isso.

## Decisões herdadas da análise do sistema anterior

Este projeto substitui uma implementação em Go/microserviços que tinha falhas
estruturais. As correções ficaram embutidas no desenho:

| Problema anterior | Como foi resolvido |
|---|---|
| Preço e frete vinham do cliente no payload | `ItemCarrinho` não tem campo de preço; `precificarItens` lê do catálogo |
| Status do pedido sem validação de transição | Máquina de estados explícita com ator por aresta |
| WebSocket `ws/:id` sem autenticação | Canal por estabelecimento, protegido por RLS na Fase 6 |
| `JWT_SECRET` versionado no repositório | Somente `.env.example`; segredos ficam na Netlify |
| Valores monetários em `float64` | Centavos em inteiro (`Centavos`) |
| Sem nenhum teste | Domínio e contrato cobertos, rodando na CI |
| Horário de funcionamento como texto livre | Faixas por dia, com suporte a virada de meia-noite |

## Deploy (Netlify)

Três sites apontando para **este mesmo repositório**:

| Site | Base directory | Publish |
|---|---|---|
| pedeja-app | `apps/cliente` | `apps/cliente/dist` |
| pedeja-entregador | `apps/entregador` | `apps/entregador/dist` |
| pedeja-painel | `apps/restaurante` | `apps/restaurante/dist` |

Build command: `pnpm build` · Node 20. Cada `netlify.toml` já traz o
`ignore` que evita rebuildar os três a cada push.

### Variáveis de ambiente

Ver `apps/*/.env.example`. Atenção: **tudo com prefixo `VITE_` vai para o bundle
do navegador**. `SUPABASE_SERVICE_ROLE_KEY` e `VAPID_PRIVATE_KEY` nunca levam
esse prefixo e só são lidos dentro de Netlify Functions.

## Fases

- [x] **0** — Monorepo, tooling, CI, 3 PWAs buildando
- [x] **1** — `packages/domain`: dinheiro, precificação, frete, geo, horários, máquina de estados
- [x] **2** — `packages/data`: contratos + provider mock com realtime simulado
- [x] **3** — Painel do restaurante (comandas, cardápio, regras de entrega)
- [x] **4** — App do cliente (cardápio, carrinho, checkout, acompanhamento)
- [ ] **5** — App do entregador (corridas, aceite, extrato) + Web Push
- [x] **6** — Supabase: schema, RLS, RPCs, provider (falta ligar em producao)
- [ ] **7** — E2E, rate limit, observabilidade, LGPD
