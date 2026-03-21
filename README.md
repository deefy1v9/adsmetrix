This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Configuração e Execução Local

Siga os passos abaixo para rodar o projeto em sua máquina:

### 1. Pré-requisitos

Certifique-se de ter o [Node.js](https://nodejs.org/) instalado (versão 18 ou superior recomendada).

### 2. Instalar Dependências

Abra o terminal na pasta do projeto e execute:

```bash
npm install
```

### 3. Configurar o Banco de Dados (Prisma)

O projeto utiliza Prisma com SQLite (`dev.db`). É necessário gerar o cliente do Prisma antes de rodar:

```bash
npx prisma generate
```

Se for a primeira vez ou se houver alterações no schema:

```bash
npx prisma db push
```

### 4. Rodar o Servidor de Desenvolvimento

Para iniciar o servidor local:

```bash
npm run dev
```

O projeto estará rodando em [http://localhost:3000](http://localhost:3000).

## Estrutura do Projeto

- `app/`: Páginas e rotas do Next.js (App Router).
- `components/`: Componentes React reutilizáveis.
- `prisma/`: Schema do banco de dados e migrações.
- `public/`: Arquivos estáticos.
- `actions/`: Server Actions para lógica de backend.
