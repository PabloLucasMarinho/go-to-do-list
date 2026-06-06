# To-do Go

Aplicação de lista de tarefas multiusuário feita com **Go + Gin + GORM + MySQL**. Cada usuário gerencia suas próprias tarefas e categorias com isolamento total de dados.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | Go + Gin |
| ORM | GORM |
| Banco de dados | MySQL |
| Autenticação | JWT (cookie HttpOnly) |
| Frontend | HTML + CSS + JavaScript puro |

---

## Pré-requisitos

- [Go 1.21+](https://go.dev/dl/)
- MySQL 8.0+ rodando localmente (ou via Docker)

---

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/to-do-go.git
cd to-do-go
```

### 2. Crie o banco de dados

Acesse o MySQL e execute:

```sql
CREATE DATABASE tododb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e edite com suas credenciais:

```bash
cp .env.example .env
```

Abra o `.env` e preencha:

```env
# Formato: usuario:senha@tcp(host:porta)/nome_do_banco?charset=utf8mb4&parseTime=True&loc=Local
DB_DSN=root:suasenha@tcp(localhost:3306)/tododb?charset=utf8mb4&parseTime=True&loc=Local

# Chave secreta para assinar os tokens JWT — use algo longo e aleatório
JWT_SECRET=troque-por-uma-chave-muito-longa-e-aleatoria-aqui

# Porta do servidor (padrão: 8080)
PORT=8080
```

### 4. Instale as dependências

```bash
go mod tidy
```

### 5. Rode o servidor

```bash
go run main.go
```

Acesse **http://localhost:8080** no navegador.

> As tabelas são criadas automaticamente pelo GORM na primeira execução. Não é necessário rodar migrations manualmente.

---

## Estrutura de pastas

```
to-do-go/
├── main.go               # Entry point e rotas
├── .env                  # Variáveis de ambiente (não versionar)
├── .env.example          # Template do .env
│
├── database/
│   └── database.go       # Conexão com MySQL e AutoMigrate
│
├── models/
│   ├── user.go           # Struct User com métodos de autenticação
│   ├── category.go       # Struct Category
│   └── task.go           # Struct Task com métodos de status
│
├── middleware/
│   └── auth.go           # Validação JWT para páginas e APIs
│
├── handlers/
│   ├── auth.go           # Register, Login, Logout, Me
│   ├── tasks.go          # CRUD de tarefas + toggle
│   └── categories.go     # CRUD de categorias
│
├── templates/
│   ├── index.html        # Página de login e cadastro
│   └── dashboard.html    # Dashboard principal
│
└── static/
    ├── css/style.css     # Estilos
    └── js/
        ├── auth.js       # Lógica de login/cadastro
        └── app.js        # Lógica do dashboard
```

---

## Rotas da API

### Autenticação

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Cadastrar novo usuário | Não |
| `POST` | `/api/auth/login` | Fazer login | Não |
| `POST` | `/api/auth/logout` | Encerrar sessão | Não |
| `GET` | `/api/auth/me` | Dados do usuário logado | Sim |

### Tarefas

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/tasks` | Listar tarefas (aceita filtros) |
| `POST` | `/api/tasks` | Criar tarefa |
| `PUT` | `/api/tasks/:id` | Editar tarefa |
| `DELETE` | `/api/tasks/:id` | Excluir tarefa |
| `PATCH` | `/api/tasks/:id/toggle` | Alternar concluída/pendente |

**Filtros disponíveis no `GET /api/tasks`:**

```
/api/tasks?status=pending       # apenas pendentes
/api/tasks?status=done          # apenas concluídas
/api/tasks?category_id=2        # de uma categoria específica
/api/tasks?status=pending&category_id=2  # combinados
```

### Categorias

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/categories` | Listar categorias |
| `POST` | `/api/categories` | Criar categoria |
| `PUT` | `/api/categories/:id` | Editar categoria |
| `DELETE` | `/api/categories/:id` | Excluir categoria |

> Todas as rotas `/api/tasks` e `/api/categories` exigem autenticação. Cada usuário acessa apenas seus próprios dados.

---

## Exemplos de requisição

### Cadastrar usuário

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"João Silva","email":"joao@email.com","password":"123456"}'
```

### Fazer login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"joao@email.com","password":"123456"}'
```

### Criar tarefa

```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"Estudar Go","description":"Capítulo 3 do livro","category_id":1}'
```

### Marcar tarefa como concluída

```bash
curl -X PATCH http://localhost:8080/api/tasks/1/toggle \
  -b cookies.txt
```

---

## Modelos de dados

### User

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uint | Chave primária |
| `name` | string | Nome do usuário |
| `email` | string | E-mail único |
| `password` | string | Hash bcrypt (nunca retornado na API) |
| `created_at` | datetime | Data de cadastro |

### Category

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uint | Chave primária |
| `name` | string | Nome da categoria |
| `user_id` | uint | Dono da categoria |
| `created_at` | datetime | Data de criação |

### Task

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | uint | Chave primária |
| `title` | string | Título da tarefa |
| `description` | string | Descrição opcional |
| `done` | boolean | `false` = pendente, `true` = concluída |
| `user_id` | uint | Dono da tarefa |
| `category_id` | uint? | Categoria (opcional, nullable) |
| `created_at` | datetime | Data de criação |
| `updated_at` | datetime | Última atualização |

---

## Build para produção

```bash
go build -o todo-go main.go
./todo-go
```

No Windows:

```bash
go build -o todo-go.exe main.go
.\todo-go.exe
```

---

## Observações de segurança

- As senhas são armazenadas com hash **bcrypt** (custo 10)
- O token JWT fica em um cookie **HttpOnly** — inacessível via JavaScript
- Toda rota protegida valida se o recurso pertence ao usuário autenticado antes de qualquer operação
- Nunca versione o arquivo `.env` — ele já está no `.gitignore`
