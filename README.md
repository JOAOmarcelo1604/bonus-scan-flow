# Bonus Scan Flow

Front-end em React (Vite) para o fluxo de **recebimento de bônus** (bipagem de etiquetas) e **auditoria**, integrado à API de expedição.

## Requisitos

- Node.js 18+ (recomendado 20+)
- npm (ou pnpm/yarn, ajustando os comandos)

## Como rodar

```bash
npm install
npm run dev
```

A aplicação sobe em **http://localhost:8080** (porta definida no Vite).

## Scripts

| Comando        | Descrição              |
| -------------- | ---------------------- |
| `npm run dev`  | Servidor de desenvolvimento |
| `npm run build` | Build de produção     |
| `npm run preview` | Preview do build     |
| `npm run test` | Testes (Vitest)       |
| `npm run test:e2e` | Testes E2E (sobe o dev server na porta 8080) |

Na primeira vez, instale o navegador do Playwright: `npx playwright install chromium`.

## API de backend

A URL base do Axios está em `src/services/api.ts` (padrão `http://localhost:8088`). Altere ali conforme o ambiente ou, se quiser, passe a usar `import.meta.env.VITE_*` com `.env`.
