#!/bin/bash
set -euo pipefail

# ============================================================================
# Bilula - Server Initial Setup Script
# Run this ONCE on a fresh server to prepare the infrastructure.
# Usage: bash server-setup.sh
# ============================================================================

echo "============================================"
echo "  Bilula - Server Setup"
echo "============================================"

# ── 1. System Update ────────────────────────────────────────────────────
echo ""
echo "==> [1/7] Updating system packages..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget git apt-transport-https ca-certificates gnupg lsb-release

# ── 2. Install Docker ───────────────────────────────────────────────────
echo ""
echo "==> [2/7] Installing Docker..."
if command -v docker &>/dev/null; then
  echo "Docker already installed: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "Docker installed: $(docker --version)"
fi

# ── 3. Initialize Docker Swarm ──────────────────────────────────────────
echo ""
echo "==> [3/7] Initializing Docker Swarm..."
if docker info --format '{{.Swarm.LocalNodeState}}' | grep -q "active"; then
  echo "Docker Swarm already active."
else
  SERVER_IP=$(hostname -I | awk '{print $1}')
  docker swarm init --advertise-addr "${SERVER_IP}"
  echo "Docker Swarm initialized on ${SERVER_IP}"
fi

# ── 4. Create overlay network ───────────────────────────────────────────
echo ""
echo "==> [4/7] Creating traefik-public network..."
if docker network ls --filter "name=traefik-public" --format '{{.Name}}' | grep -q "traefik-public"; then
  echo "Network traefik-public already exists."
else
  docker network create --driver overlay --attachable traefik-public
  echo "Network traefik-public created."
fi

# ── 5. Create directories ───────────────────────────────────────────────
echo ""
echo "==> [5/7] Creating application directories..."
mkdir -p /opt/bilula
echo "Directory /opt/bilula created."

# ── 6. Deploy Infrastructure Stack (Traefik + Portainer) ────────────────
echo ""
echo "==> [6/7] Deploying infrastructure stack..."

cat > /opt/bilula/docker-compose.infra.yml << 'INFRAEOF'
version: "3.8"

services:
  traefik:
    image: traefik:v3.3
    command:
      - --api.dashboard=true
      - --api.insecure=true
      - --providers.swarm=true
      - --providers.swarm.endpoint=unix:///var/run/docker.sock
      - --providers.swarm.exposedByDefault=false
      - --providers.swarm.network=traefik-public
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --log.level=INFO
      - --accesslog=true
    ports:
      - target: 80
        published: 80
        mode: host
      - target: 443
        published: 443
        mode: host
      - target: 8080
        published: 8080
        mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-letsencrypt:/letsencrypt
    networks:
      - traefik-public
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: any
        delay: 5s

  portainer:
    image: portainer/portainer-ce:2.27.3
    command: -H unix:///var/run/docker.sock
    ports:
      - target: 9000
        published: 9000
        mode: host
      - target: 9443
        published: 9443
        mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer-data:/data
    networks:
      - traefik-public
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      restart_policy:
        condition: any
        delay: 5s

volumes:
  traefik-letsencrypt:
    driver: local
  portainer-data:
    driver: local

networks:
  traefik-public:
    external: true
INFRAEOF

docker stack deploy -c /opt/bilula/docker-compose.infra.yml infra
echo "Infrastructure stack deployed."

# ── 7. Setup SSH Key for GitHub Actions ──────────────────────────────────
echo ""
echo "==> [7/7] SSH Key Setup..."
if [ ! -f ~/.ssh/github_deploy ]; then
  ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "github-actions-deploy"
  cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
  echo ""
  echo "=========================================================="
  echo "  SSH DEPLOY KEY GENERATED"
  echo "=========================================================="
  echo ""
  echo "Copy the PRIVATE key below and add it as a GitHub Secret"
  echo "named SERVER_SSH_KEY:"
  echo ""
  echo "----------------------------------------------------------"
  cat ~/.ssh/github_deploy
  echo "----------------------------------------------------------"
  echo ""
else
  echo "Deploy SSH key already exists at ~/.ssh/github_deploy"
fi

# ── Done ─────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "Services:"
echo "  Traefik Dashboard: http://$(hostname -I | awk '{print $1}'):8080"
echo "  Portainer:         https://$(hostname -I | awk '{print $1}'):9443"
echo "  App (after deploy): http://$(hostname -I | awk '{print $1}')"
echo ""
echo "Next steps:"
echo "  1. Access Portainer at the URL above and create admin user"
echo "  2. Add these GitHub Secrets to your repository:"
echo "     - SERVER_HOST       = $(hostname -I | awk '{print $1}')"
echo "     - SERVER_SSH_KEY    = (private key shown above)"
echo "     - DB_PASSWORD       = (choose a strong password)"
echo "     - META_ACCESS_TOKEN = (your Meta API token)"
echo "     - CRON_SECRET       = (any random secret)"
echo "  3. Push a commit to main branch to trigger deployment"
echo ""
