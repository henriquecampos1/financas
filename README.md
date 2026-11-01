# Minhas Finanças

App de controle financeiro pessoal para iPhone, no estilo Mobills. É um *PWA*: um site que
se instala na Tela de Início e funciona como aplicativo, inclusive **sem internet**.

- **100% gratuito:** sem servidor, sem assinatura, sem API paga.
- **Privado:** todos os dados ficam guardados só no próprio aparelho (IndexedDB). Nada é enviado
  para a internet — por isso, faça **backups** (veja abaixo).
- Interface em português, valores em R$.

## O que o app faz

- **Lançamentos** pelo botão **+**: compra no cartão de crédito (à vista ou de 1x a 24x),
  Pix / transferência / débito / dinheiro, e receitas (salário, renda extra).
- **Transações**: lista por dia com busca e filtros (categoria, forma, cartão/conta, tag,
  período livre), separada em **Crédito** e **Pix / Débito**.
- **Cartões**: fatura atual e próximas faturas (gráfico de barras por mês), fechamento,
  vencimento, limite usado e disponível, pagamento e **pagamento antecipado** da fatura.
- **Ciclo personalizado**: escolha o dia em que o seu mês começa (ex.: dia 15 → de 15/01 a
  14/02). Tudo no app usa o ciclo, com setas para navegar entre ciclos.
- **Compra no crédito conta na data da compra**, nunca no pagamento da fatura (que não é
  contado de novo como gasto). Compras parceladas: cada parcela no ciclo em que cai (padrão)
  ou o total no ciclo da compra — escolha em Ajustes.
- **Planejamento**: limite por categoria, renda prevista e meta de economia; barras verde
  (até 70%), amarela (até 100%) e vermelha (excedido), quanto ainda dá para gastar por dia e
  alertas no Início a partir de 80%.
- **Análises**: quanto você economizou em cada ciclo, gastos por categoria e por forma de
  pagamento, comparação dos últimos 6 ciclos, gasto acumulado × ritmo ideal, maior gasto,
  média por dia e projeção até o fim do ciclo.
- **Extras** (em *Mais*): categorias personalizáveis, contas e cartões, recorrências (contas
  fixas lançadas sozinhas todo mês), metas e caixinhas, compromissos futuros, backup e
  exportação para Excel, bloqueio por PIN.

---

## Instalar no iPhone

1. No iPhone, abra o **Safari** (precisa ser o Safari) e entre no endereço do app:
   **https://henriquecampos1.github.io/financas/**
2. Toque no botão **Compartilhar** (o quadrado com a seta para cima, na barra de baixo).
3. Role a lista e toque em **Adicionar à Tela de Início**. Confirme em **Adicionar**.
4. Abra o app pelo ícone novo na Tela de Início (não pelo Safari).
5. Em **Mais → Ajustes**, escolha o **dia de início do ciclo**.
6. Em **Mais → Contas e cartões**, cadastre suas contas e cartões.

> **Importante:** o app instalado e o site aberto no Safari guardam dados **separados**.
> Use sempre o app pelo ícone da Tela de Início.

### Atualizações

Quando uma versão nova é publicada, o app se atualiza sozinho na próxima vez que for aberto com
internet (às vezes é preciso fechar e abrir de novo). Os seus dados não são afetados.

### Backup (faça sempre!)

Os dados existem só no iPhone. Se ele for trocado, perdido ou o app for apagado, só o backup
traz tudo de volta.

- **Mais → Backup → Salvar backup** e escolha **Salvar em Arquivos → iCloud Drive**.
- O app lembra você no Início quando o último backup tiver mais de 15 dias.
- Para restaurar (ex.: num iPhone novo): instale o app e use **Mais → Backup → Escolher
  arquivo de backup**.
- **Exportar para Excel (CSV)** gera uma planilha com todos os lançamentos.

---

## Rodar no computador (para desenvolver)

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer (ex.: http://localhost:5173). Para testar a interface com dados
de exemplo: **Mais → Ajustes → Carregar dados de demonstração** (e **Apagar tudo** para limpar).

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Abre o app em modo de desenvolvimento |
| `npm test` | Roda os testes automáticos (Vitest) |
| `npm run build` | Gera a versão final em `dist/` |
| `npm run preview` | Abre a versão final localmente |
| `npm run icones` | Gera os ícones a partir de `public/icone.svg` |

## Publicar (GitHub Pages)

A publicação é automática: a cada envio (`git push`) para a branch `main`, o GitHub Actions
(`.github/workflows/publicar.yml`) roda os testes, gera o site e publica em
`https://<usuario>.github.io/<repositorio>/`. Se algum teste falhar, nada é publicado.

Para publicar do zero numa conta nova:

1. Crie um repositório **público** no GitHub (o GitHub Pages grátis exige repositório público —
   só o código fica visível; os dados ficam no aparelho de cada pessoa).
2. Envie o código para a branch `main`.
3. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Acompanhe em **Actions**; ao terminar, o endereço aparece em **Settings → Pages**.

O endereço base do site (`/financas/`) vem do nome do repositório, automaticamente
(variável `BASE_PATH` no workflow).

## Organização do código

- `src/db` — banco de dados (Dexie / IndexedDB), tipos e operações (lançamentos, contas,
  cartões, planos, metas, recorrências, backup)
- `src/utils` — regras de negócio puras, todas com testes: ciclos, dinheiro, parcelas, faturas,
  competência, planejamento, análises, recorrências, compromissos, metas, backup, PIN
- `src/hooks` — ganchos React (ajustes, ciclo escolhido, leituras do banco que se atualizam
  sozinhas)
- `src/components` — componentes de interface (formulários, listas, gráficos)
- `src/pages` — telas

Decisões importantes:

- **Dinheiro em centavos** (números inteiros) e **datas como texto `aaaa-mm-dd`**, para evitar
  erros de arredondamento e de fuso horário.
- **Rotas com `#`** (`.../financas/#/plano`), para funcionar no GitHub Pages sem configuração
  extra.
- A aba **Análises** é carregada só quando aberta (a biblioteca de gráficos é grande).
- O PIN é guardado só como resumo (SHA-256 com "sal"); ele protege a entrada no app, mas os
  dados no aparelho não são criptografados.
