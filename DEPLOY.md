# Bilula - Guia de Deploy (CI/CD)

Este documento descreve todo o processo de deploy automatizado do projeto Bilula.
**Use este arquivo como contexto para o agente de IA seguir o processo de deploy.**

---

## Arquitetura

```
GitHub (push main)
       │
       ▼
GitHub Actions ──► Build Docker Image ──► Push GHCR
       │
       ▼
SSH into Server ──► docker pull ──► docker stack deploy
       │
       ▼
┌─────────────────────────────────────────┐
│  Server (217.76.53.186)                 │
│  Docker Swarm (single node)             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Stack: infra                   │    │
│  │  ├── Traefik (reverse proxy)    │    │
│  │  │   ports: 80, 443, 8080       │    │
│  │  └── Portainer (management UI)  │    │
│  │      ports: 9000, 9443          │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Stack: bilula                  │    │
│  │  ├── app (Next.js)              │    │
│  │  │   via Traefik :80            │    │
│  │  └── db (PostgreSQL 16)         │    │
│  │      internal only              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Networks:                              │
│  ├── traefik-public (overlay)           │
│  └── internal (overlay, app↔db)         │
└─────────────────────────────────────────┘
```

---

## Tecnologias

| Componente        | Tecnologia              |
|-------------------|-------------------------|
| App               | Next.js 16 (standalone) |
| Database (prod)   | PostgreSQL 16           |
| Database (dev)    | SQLite                  |
| Container         | Docker (multi-stage)    |
| Orquestração      | Docker Swarm            |
| Reverse Proxy     | Traefik v3.6            |
| SSL               | Let's Encrypt (Traefik) |
| Management UI     | Portainer CE 2.33       |
| CI/CD             | GitHub Actions          |
| Registry          | GitHub Container Registry (ghcr.io) |

---

## Estrutura de Arquivos de Deploy

```
bilula/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions pipeline
├── scripts/
│   └── server-setup.sh             # Setup inicial do servidor
├── Dockerfile                      # Build multi-stage Next.js
├── .dockerignore                   # Arquivos ignorados no build
├── entrypoint.sh                   # Script de inicialização do container
├── docker-compose.infra.yml        # Stack: Traefik + Portainer
├── docker-compose.app.yml          # Stack: App + PostgreSQL
└── DEPLOY.md                       # Este arquivo
```

---

## Pré-requisitos

- Servidor Linux (Ubuntu 22.04+) com acesso root
- Repositório no GitHub com GitHub Actions habilitado
- Portas abertas no firewall: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8080 (Traefik Dashboard), 9000/9443 (Portainer)

---

## Passo 1: Setup Inicial do Servidor (executar uma única vez)

### Opção A: Script automático

```bash
# No seu terminal local, conecte ao servidor:
ssh root@217.76.53.186

# Baixe e execute o script de setup:
curl -fsSL https://raw.githubusercontent.com/SEU_USUARIO/bilula/main/scripts/server-setup.sh | bash
```

### Opção B: Manual

```bash
# 1. Conectar ao servidor
ssh root@217.76.53.186

# 2. Atualizar sistema
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git apt-transport-https ca-certificates gnupg

# 3. Instalar Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# 4. Inicializar Docker Swarm
docker swarm init --advertise-addr 217.76.53.186

# 5. Criar rede overlay para Traefik
docker network create --driver overlay --attachable traefik-public

# 6. Criar diretório da aplicação
mkdir -p /opt/bilula

# 7. Gerar SSH key para GitHub Actions
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "github-actions-deploy"
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 8. Mostrar a chave privada (copiar para GitHub Secrets)
cat ~/.ssh/github_deploy

# 9. Copiar o docker-compose.infra.yml para o servidor (do seu PC local, em outro terminal)
scp docker-compose.infra.yml root@217.76.53.186:/opt/bilula/

# 10. Voltar ao servidor e deployar infraestrutura
docker stack deploy -c /opt/bilula/docker-compose.infra.yml infra

# 11. Verificar serviços
docker service ls
```

### Acessar Portainer pela primeira vez

1. Abra `https://217.76.53.186:9443`
2. Crie o usuário admin com uma senha forte
3. Selecione "Docker Swarm" como ambiente
4. O Portainer mostrará todos os stacks e serviços

---

## Passo 2: Agendamento de Relatórios (Cron Job)

Os relatórios e integrações são disparados automaticamente pelo Docker Swarm através do serviço `cron` (Ofelia) configurado no `docker-compose.app.yml`.

**Você NÃO precisa configurar `crontab` manualmente na VPS!** 

As seguintes regras já estão configuradas:
- **Daily Reports**: A cada 30 minutos (sincronização de relatórios do dia)
- **Google Chat Reports**: A cada 10 minutos (disparo de automações para grupos do Google Chat)

Caso queira forçar um disparo manual agora via SSH, execute:
```bash
docker exec $(docker ps -q -f name=bilula_app) wget -qO- "http://127.0.0.1:3000/api/cron/daily-reports?token=$CRON_SECRET"
```

---

## Passo 3: Configurar GitHub Secrets

No repositório GitHub, vá em **Settings → Secrets and variables → Actions** e adicione:

| Secret                   | Valor                                     | Obrigatório |
|--------------------------|-------------------------------------------|-------------|
| `SERVER_HOST`            | `217.76.53.186`                           | Sim         |
| `SERVER_SSH_KEY`         | Conteúdo da chave privada gerada no passo 1 | Sim       |
| `DB_PASSWORD`            | Senha forte para PostgreSQL               | Sim         |
| `META_ACCESS_TOKEN`      | Token da API do Meta/Facebook             | Sim         |
| `CRON_SECRET`            | Secret para proteger endpoints de cron    | Sim         |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número WhatsApp Business         | Opcional    |
| `WHATSAPP_ACCESS_TOKEN`  | Token da API do WhatsApp                  | Opcional    |

**IMPORTANTE**: Nunca coloque credenciais diretamente no código. Sempre use GitHub Secrets.

---

## Passo 3: Deploy Automático (CI/CD)

### Como funciona

Após a configuração acima, o deploy é **100% automático**:

1. Você faz `git push` para a branch `main`
2. GitHub Actions é acionado automaticamente
3. A pipeline executa:
   - Checkout do código
   - Build da imagem Docker (multi-stage)
   - Push da imagem para `ghcr.io`
   - Copia `docker-compose.app.yml` para o servidor via SCP
   - SSH no servidor para:
     - Login no GHCR
     - Pull da nova imagem
     - `docker stack deploy` para atualizar o serviço
4. O Docker Swarm faz rolling update (zero downtime)

### Fluxo de commit para deploy

```bash
# No seu terminal local:
git add .
git commit -m "sua alteração"
git push origin main

# O deploy acontece automaticamente em ~3-5 minutos
# Acompanhe em: https://github.com/SEU_USUARIO/bilula/actions
```

---

## Passo 4: Monitoramento

### Via Portainer (UI)
- URL: `https://217.76.53.186:9443`
- Visualize stacks, serviços, containers, logs
- Escale réplicas manualmente se necessário
- Veja métricas de CPU/memória

### Via Traefik (Dashboard)
- URL: `http://217.76.53.186:8080`
- Veja rotas HTTP configuradas
- Monitore health dos backends

### Via CLI (SSH)
```bash
# Ver todos os stacks
docker stack ls

# Ver serviços do app
docker service ls --filter "name=bilula"

# Ver logs do app
docker service logs bilula_app --follow --tail 100

# Ver logs do banco
docker service logs bilula_db --follow --tail 50

# Ver réplicas e status
docker service ps bilula_app

# Forçar redeploy manual
docker service update --force bilula_app
```

---

## Dockerfile Explicado

O Dockerfile usa **multi-stage build** para otimização:

```
Stage 1 (deps)    → Instala node_modules
Stage 2 (builder) → Troca SQLite→PostgreSQL no schema, gera Prisma client, builda Next.js
Stage 3 (runner)  → Imagem mínima com apenas o standalone build + Prisma CLI
```

**Pontos importantes:**
- `output: "standalone"` no `next.config.ts` gera um build otimizado para containers
- O `sed` no Dockerfile troca `provider = "sqlite"` para `provider = "postgresql"` automaticamente
- O `entrypoint.sh` executa `prisma db push` antes de iniciar o servidor (aplica schema no PostgreSQL)
- O schema de desenvolvimento continua usando SQLite (sem impacto no dev local)

---

## Docker Compose Explicado

### `docker-compose.infra.yml` (Stack: infra)

Deploy uma única vez. Contém:
- **Traefik v3.6**: Reverse proxy, roteamento automático por labels Docker Swarm
- **Portainer CE**: UI de gerenciamento de containers

### `docker-compose.app.yml` (Stack: bilula)

Deployado automaticamente pelo CI/CD. Contém:
- **app**: Next.js (imagem do GHCR), roteada pelo Traefik na porta 80
- **db**: PostgreSQL 16, rede interna apenas (não exposta externamente)

**Recursos do Swarm configurados:**
- `update_config.order: start-first` → Inicia novo container antes de parar o antigo (zero downtime)
- `rollback_config` → Rollback automático em caso de falha
- `resources` → Limites de memória definidos
- `healthcheck` → Verificação de saúde do PostgreSQL e da app

---

## Configuração de Domínio (opcional)

Quando tiver um domínio apontando para o servidor:

### 1. Configurar DNS
```
Tipo: A    Nome: @              Valor: 217.76.53.186
Tipo: A    Nome: portainer       Valor: 217.76.53.186
```

### 2. Ativar SSL no docker-compose.infra.yml

Descomente as linhas do Let's Encrypt no Traefik:
```yaml
- --entrypoints.web.http.redirections.entryPoint.to=websecure
- --entrypoints.web.http.redirections.entryPoint.scheme=https
- --certificatesresolvers.letsencrypt.acme.email=seu-email@dominio.com
- --certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json
- --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
```

### 3. Ativar Host routing no docker-compose.app.yml

Descomente e configure as labels HTTPS:
```yaml
- traefik.http.routers.bilula-secure.rule=Host(`seu-dominio.com.br`)
- traefik.http.routers.bilula-secure.entrypoints=websecure
- traefik.http.routers.bilula-secure.tls.certresolver=letsencrypt
```

### 4. Redeployar os stacks
```bash
docker stack deploy -c /opt/bilula/docker-compose.infra.yml infra
docker stack deploy -c /opt/bilula/docker-compose.app.yml bilula
```

---

## Troubleshooting

### Build falhou no GitHub Actions
```bash
# Verifique os logs em:
# https://github.com/SEU_USUARIO/bilula/actions

# Teste o build localmente:
docker build -t bilula:test .
```

### Container não inicia
```bash
# Ver logs do serviço
docker service logs bilula_app --tail 200

# Ver tarefas com erro
docker service ps bilula_app --no-trunc

# Verificar se o banco está acessível
docker exec $(docker ps -q -f name=bilula_db) pg_isready -U bilula
```

### Banco de dados com problemas
```bash
# Acessar o PostgreSQL
docker exec -it $(docker ps -q -f name=bilula_db) psql -U bilula -d bilula

# Ver tabelas
\dt

# Forçar re-criação do schema (CUIDADO: pode perder dados)
docker exec $(docker ps -q -f name=bilula_app) node node_modules/prisma/build/index.js db push --force-reset --schema=./prisma/schema.prisma
```

### Rollback para versão anterior
```bash
# Fazer rollback automático
docker service update --rollback bilula_app

# Ou rollback para uma imagem específica
docker service update --image ghcr.io/SEU_USUARIO/bilula:SHA_ANTERIOR bilula_app
```

### Reiniciar tudo
```bash
# Remover e redeployar app stack
docker stack rm bilula
sleep 10
docker stack deploy -c /opt/bilula/docker-compose.app.yml bilula

# Remover e redeployar infra stack (caso necessário)
docker stack rm infra
sleep 10
docker stack deploy -c /opt/bilula/docker-compose.infra.yml infra
```

---

## Variáveis de Ambiente

| Variável                  | Descrição                              | Exemplo                                          |
|---------------------------|----------------------------------------|--------------------------------------------------|
| `DATABASE_URL`            | Connection string PostgreSQL           | `postgresql://bilula:SENHA@db:5432/bilula`       |
| `META_ACCESS_TOKEN`       | Token da API do Meta Ads               | `EAAxxxxxxx...`                                  |
| `CRON_SECRET`             | Secret para autenticar cron jobs       | `my-cron-secret-2024`                            |
| `WHATSAPP_PHONE_NUMBER_ID`| ID do número WhatsApp Business         | `123456789`                                      |
| `WHATSAPP_ACCESS_TOKEN`   | Token da API WhatsApp Cloud            | `EAAxxxxxxx...`                                  |
| `NODE_ENV`                | Ambiente (setado automaticamente)      | `production`                                     |

---

## Backup do Banco de Dados

### Backup manual
```bash
docker exec $(docker ps -q -f name=bilula_db) pg_dump -U bilula bilula > /opt/bilula/backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar backup
```bash
docker exec -i $(docker ps -q -f name=bilula_db) psql -U bilula bilula < /opt/bilula/backup_YYYYMMDD_HHMMSS.sql
```

### Backup automático (cron)
```bash
# Adicionar ao crontab do servidor:
crontab -e

# Backup diário às 3h da manhã:
0 3 * * * docker exec $(docker ps -q -f name=bilula_db) pg_dump -U bilula bilula > /opt/bilula/backups/backup_$(date +\%Y\%m\%d).sql 2>/dev/null
```

---

## Checklist de Deploy para o Agente de IA

Quando receber um pedido de deploy ou alteração no CI/CD, siga este checklist:

1. **Verificar arquivos de deploy existem:**
   - `Dockerfile` (multi-stage build com Next.js standalone)
   - `entrypoint.sh` (prisma db push + start server)
   - `docker-compose.infra.yml` (Traefik + Portainer)
   - `docker-compose.app.yml` (App + PostgreSQL)
   - `.github/workflows/deploy.yml` (GitHub Actions pipeline)
   - `.dockerignore` (ignorar node_modules, .next, etc.)

2. **Verificar configurações:**
   - `next.config.ts` deve ter `output: "standalone"`
   - `prisma/schema.prisma` usa SQLite no repo (Dockerfile troca para PostgreSQL no build)
   - GitHub Secrets configurados (SERVER_HOST, SERVER_SSH_KEY, DB_PASSWORD, META_ACCESS_TOKEN, CRON_SECRET)

3. **Para fazer deploy:**
   - Fazer as alterações no código
   - `git add . && git commit -m "mensagem" && git push origin main`
   - O GitHub Actions cuida do resto automaticamente

4. **Para verificar o deploy:**
   - GitHub Actions: `https://github.com/SEU_USUARIO/bilula/actions`
   - App: `http://217.76.53.186`
   - Portainer: `https://217.76.53.186:9443`
   - Traefik: `http://217.76.53.186:8080`

5. **Em caso de problemas:**
   - Ver logs: `docker service logs bilula_app --follow`
   - Ver status: `docker service ps bilula_app`
   - Rollback: `docker service update --rollback bilula_app`
