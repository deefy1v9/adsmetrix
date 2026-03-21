#!/bin/bash

# ==============================================================================
# Bilula - Report Trigger Script
# ------------------------------------------------------------------------------
# Este script aciona o endpoint de relatórios automáticos.
# Deve ser configurado no crontab da VPS para rodar de hora em hora.
# ==============================================================================

# Configurações
DOMAIN="ads.metrixbr.com"
ENDPOINT="https://$DOMAIN/api/cron/daily-reports"
SECRET="${CRON_SECRET}"

# Logs
LOG_FILE="/opt/bilula/logs/cron-reports.log"
mkdir -p /opt/bilula/logs

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando disparo de relatórios..." >> "$LOG_FILE"

# Verifica se o Secret está configurado
if [ -z "$SECRET" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO: CRON_SECRET não definida no ambiente." >> "$LOG_FILE"
    exit 1
fi

# Executa a chamada via CURL
RESPONSE=$(curl -s -X GET "$ENDPOINT" \
     -H "Authorization: Bearer $SECRET" \
     -w "\n%{http_code}")

HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCESSO: $BODY" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERRO ($HTTP_STATUS): $BODY" >> "$LOG_FILE"
fi

echo "----------------------------------------------------" >> "$LOG_FILE"
