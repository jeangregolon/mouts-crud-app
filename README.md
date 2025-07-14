# 📚 Documentação do Projeto Fullstack

Aplicação completa com:
- **Backend**: Node.js + TypeORM + PostgreSQL
- **Frontend**: Next.js + React

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js**
- **TypeORM**
- **PostgreSQL**
- **Express**
- **TypeScript**
- **Docker**
- **Swagger**

### Frontend
- **Next.js**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **React Query**

## 📋 Pré-requisitos

- Node.js v16+
- PostgreSQL 12+
- Docker Engine v20+
- Docker Compose v2+
- Yarn ou npm
- Git

## 🚀 Configuração Inicial

### 1. Clonar o repositório
```bash
git clone https://github.com/jeangregolon/mouts-crud-app.git
cd mouts-crud-app
```

### 2. Configurar variáveis de ambiente
Crie os arquivos de ambiente baseados nos exemplos:
```bash
# Backend
copy backend\.env.example backend\.env

# Frontend
copy frontend\.env.example frontend\.env.local
```

### 3. Instalar dependências
#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

### 4. Iniciar containers (Docker)
```bash
cd ../backend
docker-compose up -d
```

### 5.  Executar migrações do banco de dados
```bash
npm run migration:run
```

### 6. Iniciar a aplicação
Em terminais separados:

Backend:

```bash
cd backend
npm run start:dev
```
Frontend:

```bash
cd frontend
npm run dev
```


### 7. Acessar a aplicação
- Frontend: http://localhost:3001

- API Backend: http://localhost:3000

- Documentação da API: http://localhost:3000/api (Swagger)

### 8. Testes unitários (Jest)
```bash
cd backend
npx jest
```

# 🚀 Próximos Passos (Melhorias Futuras)
Se houvesse mais tempo para desenvolvimento, estas seriam as principais melhorias a serem implementadas:

## 🔍 Busca Avançada de Usuários
- Implementar filtros combináveis (nome, e-mail, data de cadastro)

- Adicionar busca fuzzy para tolerância a erros de digitação

## ↕️ Ordenação e Paginação
- Adicionar parâmetros sort e order nos endpoints (ex: ?sort=name&order=ASC)

- Implementar paginação server-side com limit e offset

- Criar componente de paginação no frontend com navegação intuitiva

## 🔐 Sistema de Autenticação
- Implementar JWT com refresh tokens

- Criar roles/permissões (admin, user)

- Proteger endpoints

- Adicionar tela de login/registro no frontend

## 📝 Logs Estruturados com Winston
- Configurar Winston com formatos JSON para produção

- Criar níveis de log diferenciados (error, warn, info, debug)

- Registrar automaticamente:

  - Requisições HTTP

  - Erros de banco de dados

  - Ações sensíveis (exclusões de usuários)
