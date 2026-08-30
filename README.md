# Vertix — CRM de Acompanhamento de Clientes

MVP de CRM/dashboard multi-tenant para agência de marketing digital: cada cliente
(tenant) vê só os próprios dados; o ADMIN (agência) vê e gerencia todos.

Stack: Next.js 14 (App Router) + TypeScript, Prisma + Postgres, Auth.js
(NextAuth, credentials + JWT), TailwindCSS + componentes estilo shadcn/ui,
Recharts, papaparse. Tudo em um único projeto Next.js — um único deploy na Vercel.

## 1. Pré-requisitos

- **Node.js 18 ou superior** instalado (baixe em https://nodejs.org, versão LTS).
  Depois de instalar, feche e abra um terminal novo e confirme com:
  ```bash
  node -v
  npm -v
  ```
- Um banco **Postgres**. Duas opções gratuitas simples:
  - [Neon](https://neon.tech) — crie um projeto, copie a "Connection string".
  - [Supabase](https://supabase.com) — crie um projeto, em Settings → Database
    copie a "Connection string" (URI). Aqui usamos **só** essa connection
    string via Prisma — nenhum SDK do Supabase é necessário.

## 2. Instalação

Na pasta do projeto:

```bash
npm install
```

Copie o arquivo de variáveis de ambiente e preencha:

```bash
cp .env.example .env
```

Edite `.env`:

- `DATABASE_URL`: a connection string do Postgres (Neon/Supabase).
- `NEXTAUTH_SECRET`: gere um valor aleatório, por exemplo:
  ```bash
  openssl rand -base64 32
  ```
  (Se não tiver `openssl`, qualquer string longa e aleatória serve para
  desenvolvimento.)
- `NEXTAUTH_URL`: mantenha `http://localhost:3000` em desenvolvimento.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`: credenciais do usuário admin
  que será criado pelo seed.

## 3. Banco de dados

Cria as tabelas no Postgres a partir do schema Prisma:

```bash
npx prisma migrate dev --name init
```

Popula o banco com o usuário admin e um cliente de exemplo com 30 dias de
dados fictícios:

```bash
npm run db:seed
```

Ao final, o terminal mostra o login do admin (o que você definiu em `.env`)
e o login do cliente de exemplo:
- Email: `cliente@verticecreate.com`
- Senha: `cliente123`

## 4. Rodar localmente

```bash
npm run dev
```

Acesse http://localhost:3000 — você será redirecionado para `/login`.

- Login como **admin** → cai em `/admin/clients` (lista de clientes, criação,
  lançamento manual, importação de CSV, dashboard de qualquer cliente).
- Login como **cliente** → cai em `/dashboard`, somente leitura, com os
  dados apenas daquele cliente.

## 5. Fluxo de uso (admin)

1. `/admin/clients` → **+ Novo cliente** → cria o cliente.
2. Na página do cliente (`/admin/clients/[id]`) → crie um login para o
   cliente final (nome, email, senha) na seção "Criar novo login".
3. **Lançar dados**: `/admin/clients/[id]/entry` — formulário diário
   (data, gasto, leads em cada status). Lançar de novo na mesma data
   atualiza o registro (não duplica).
4. **Importar CSV**: `/admin/clients/[id]/import` — suba um `.csv` com o
   cabeçalho exato (veja `exemplo-importacao.csv` na raiz do projeto):
   ```
   date,ad_spend,leads_generated,leads_in_analysis,leads_qualified,leads_proposal,leads_won,leads_lost
   ```
   O sistema mostra um preview antes de confirmar a importação.
5. **Ver dashboard**: `/admin/clients/[id]/dashboard` — mesmo dashboard que
   o cliente final vê, com seletor de período, cards, gráfico de evolução
   (área empilhada) e tabela de lançamentos.

## 6. Campanhas (métricas estilo Meta Ads) e CRM

Além do pipeline agregado (aba **Pipeline**), o CRM agora tem duas abas a mais,
disponíveis tanto para o admin (`/admin/clients/[id]/campaigns` e `/crm`) quanto
para o cliente final (`/dashboard/campaigns` e `/crm`):

**Aba Campanhas** — gasto, impressões, cliques, CTR, CPC, CPM, resultados,
custo por resultado e **CPA médio por contrato fechado** (gasto total ÷ leads
"Sucesso" no pipeline do período). Alimentada por lançamento manual
(`/admin/clients/[id]/campaigns/entry`) ou importação de CSV
(`/admin/clients/[id]/campaigns/import` — veja `exemplo-importacao-campanhas.csv`).
Como o Meta Ads Manager exporta CSVs com nomes de coluna variáveis, renomeie as
colunas do seu export para o formato esperado antes de importar:
```
date,campaign_name,amount_spent,impressions,clicks,results,reach,frequency
```
CTR, CPC, CPM e custo por resultado são calculados automaticamente.

**Aba CRM** — Kanban de leads (`/crm` para o cliente, `/admin/clients/[id]/crm`
para o admin). Ambos os papéis podem criar leads, importar via CSV
(`exemplo-importacao-leads.csv`), arrastar o card entre as etapas do funil, e
abrir o lead para registrar atividades (ligação, WhatsApp, email, reunião,
nota) com data de follow-up — isso é a **cadência**: toda atividade agendada
sem `completedAt` aparece como pendente no card do lead até ser marcada como
realizada.

Importante: o Kanban (`Lead`/`LeadActivity`) é um controle operacional
separado do pipeline agregado (`DailyMetric`) que alimenta a aba Pipeline —
nesta v1 os dois não se somam automaticamente. Uma evolução futura natural é
fazer o pipeline agregado ser calculado a partir da contagem de leads por
etapa, quando fizer sentido para o fluxo da agência.

## 7. Integração automática com Meta Ads (Lead Ads)

Além da importação de CSV, o CRM pode receber leads de formulários
instantâneos do Meta (Instagram/Facebook) **automaticamente, em tempo real**,
via OAuth + webhook. Isso exige um App configurado uma única vez no Meta for
Developers (feito pela agência, não por cada cliente).

### 7.1 Criar o App no Meta

1. Acesse **https://developers.facebook.com/apps** → **"Criar app"**.
2. Tipo de app: **"Empresa"**.
3. Depois de criado, adicione o produto **"Facebook Login for Business"**.
4. Em **Configurações → Básico**, copie o **ID do aplicativo** e a **Chave
   secreta do aplicativo** — são o `META_APP_ID` e `META_APP_SECRET`.
5. Em **Facebook Login for Business → Configurações**, adicione em "URIs de
   redirecionamento OAuth válidos":
   ```
   https://SEU-DOMINIO.vercel.app/api/meta/callback
   ```
6. Adicione o produto **"Webhooks"** → assine o objeto **"Página"** → campo
   **`leadgen`**:
   - URL de callback: `https://SEU-DOMINIO.vercel.app/api/webhooks/meta-leads`
   - Token de verificação: qualquer string sua — o mesmo valor que você vai
     colocar em `META_WEBHOOK_VERIFY_TOKEN`.

### 7.2 Configurar as variáveis de ambiente

Na Vercel (Project Settings → Environment Variables) e no seu `.env` local:
```
META_APP_ID="..."
META_APP_SECRET="..."
META_WEBHOOK_VERIFY_TOKEN="uma-string-aleatoria-sua"
```

### 7.3 App Review (obrigatório para uso com clientes reais)

Por padrão, o Meta só deixa o botão "Conectar com Meta" funcionar com
Páginas onde **você** é administrador, ou contas que você cadastrar como
**testador** do App (em Funções do App → Testadores) — dá pra testar de
verdade com alguns clientes assim, sem esperar aprovação.

Para funcionar com **qualquer cliente**, sem cadastrar cada um manualmente,
é preciso submeter o App para **App Review** pedindo as permissões
`pages_show_list`, `pages_manage_metadata`, `pages_read_engagement` e
`leads_retrieval`. O Meta pede: política de privacidade (URL pública),
termos de uso (URL pública) e um vídeo curto mostrando o fluxo de login →
seleção de Página → lead aparecendo no CRM. A análise costuma levar de
alguns dias a duas semanas. Isso é feito direto no painel do Meta — eu não
tenho como submeter isso por você.

### 7.4 Como cada cliente conecta

Depois do App configurado, é só isso: o cliente entra em **CRM**, clica em
**"Conectar com Meta"**, faz login com a conta dele e escolhe a Página. A
partir daí, todo lead de formulário instantâneo daquela Página entra
automaticamente no CRM, na etapa "Nova Conversa", com nome/email/telefone e
as respostas do formulário nas anotações — igual ao CSV, só que automático.
Se o cliente tiver mais de uma Página, a conexão usa a primeira retornada;
pra trocar, é só desconectar e reconectar escolhendo a conta certa.

## 8. Deploy na Vercel

```bash
npm i -g vercel   # se ainda não tiver a CLI
vercel
```

Na Vercel, configure em **Project Settings → Environment Variables**:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (a URL final do deploy, ex: `https://seu-projeto.vercel.app`)
- `META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` (se for usar a integração da seção 7)

O `build` (`npm run build`) já roda `prisma generate` automaticamente. Antes
do primeiro deploy (ou após mudar o schema), rode as migrations apontando
para o banco de produção:

```bash
npx prisma migrate deploy
```

Para popular o admin em produção, rode o seed uma vez com o `DATABASE_URL`
de produção no `.env` local (ou `DATABASE_URL=... npm run db:seed`).

## 9. Modelagem de dados

Toda métrica fica em `DailyMetric`: um registro por cliente, por dia, por
fonte (`source`). Hoje só usamos `MANUAL` e `CSV_IMPORT`. Os campos `source`
(`META_ADS_API`, `WHATSAPP_API`) e `externalRef` já existem no schema para
que, no futuro, uma integração com a Meta Marketing API ou a WhatsApp
Business API escreva na mesma tabela sem precisar de nova migration — só
passar a gravar `source: "META_ADS_API"` (ou `WHATSAPP_API`) e o
`externalRef` (id da campanha/conversa na API externa).

Isolamento por tenant: toda query de dashboard é escopada por `clientId`
(da sessão, para usuários `CLIENT`; escolhido via URL para `ADMIN`). Nenhuma
rota do cliente aceita `clientId` arbitrário — o `/dashboard` sempre usa
`session.user.clientId`.

## 10. Segurança / dependências

O projeto usa `next@14.2.35`, o patch mais recente da série 14.x (a versão
pedida no briefing). O `npm audit` ainda acusa avisos herdados da faixa
14–16 do Next — a correção completa exigiria pular para o Next 16 (mudança
de major version, fora do escopo deste MVP). Antes de ir para produção,
vale rodar `npm audit` periodicamente e considerar migrar para uma versão
mais nova do Next quando for conveniente.

## 11. Fora de escopo (v1)

- Integração automática com WhatsApp Business API (Meta Ads já é automática — ver seção 7; import de WhatsApp continua manual/CSV).
- Sincronização automática entre o Kanban de leads e o pipeline agregado.
- Múltiplos níveis de permissão entre admins.
- Notificações automáticas de cadência (hoje é uma lista dentro do lead, sem alertas por email/push).
- IA.
