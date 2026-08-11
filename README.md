# MONITOR

MVP de acompanhamento físico (dados pessoais + histórico de IMC), construído em HTML, CSS e JavaScript puro — sem framework, sem build step.

## Estrutura

```
/index.html            tela 1 — splash / entrada
/dados-pessoais.html   tela 2 — dados pessoais
/imc.html              tela 3 — cálculo e histórico de IMC
/css/styles.css        estilos globais e temas (claro/escuro)
/js/storage.js         acesso a localStorage (contrato de dados no topo do arquivo)
/js/theme.js           alternância de tema
/js/menu.js            menu hambúrguer
/js/dados-pessoais.js  lógica da tela de dados pessoais
/js/imc.js             lógica da tela de IMC (cálculo + gráfico)
```

Todos os dados ficam salvos no `localStorage` do navegador (chaves `monitor_dados_pessoais`, `monitor_historico_imc`, `monitor_theme`). O contrato de cada entidade está comentado no topo de `js/storage.js` — é o formato que deve virar o modelo do backend (Spring Boot + PostgreSQL) nas próximas etapas.

## Rodando localmente

Não há build step. Basta servir os arquivos estáticos. Duas opções:

**Abrir direto no navegador**
Dê duplo clique em `index.html` (funciona, mas alguns navegadores restringem certas APIs em `file://`).

**Servir com um servidor local (recomendado)**
```bash
# com Python
python -m http.server 5500

# ou com Node (npx)
npx serve .
```
Depois acesse `http://localhost:5500`.

## Deploy na Vercel

1. Suba o projeto para um repositório no GitHub.
2. Na Vercel, clique em **New Project** e importe o repositório.
3. Em **Framework Preset**, escolha **Other** (não é necessário build command).
4. Deixe o **Root Directory** apontando para a raiz do projeto e o **Output Directory** vazio/padrão.
5. Clique em **Deploy** — a Vercel serve os arquivos estáticos diretamente.

Não há variáveis de ambiente nem comandos de build necessários nesta etapa.

## Próximos passos

- Autenticação real na tela de entrada.
- Substituir as funções de `js/storage.js` por chamadas `fetch()` a uma API Spring Boot + PostgreSQL, mantendo o mesmo contrato de dados.
