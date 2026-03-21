# Integração WhatsApp Business Cloud API

## 📋 Visão Geral

Esta integração permite enviar relatórios diários e notificações para clientes via WhatsApp usando a API oficial da Meta (WhatsApp Business Cloud API).

## 🔑 Configuração Inicial

### 1. Obter Credenciais da Meta

1. Acesse o [Meta for Developers](https://developers.facebook.com/)
2. Crie um App do tipo "Business"
3. Adicione o produto "WhatsApp"
4. Anote as seguintes informações:
   - **Phone Number ID** (ID do número de telefone)
   - **Access Token** (Token de acesso permanente)

### 2. Configurar Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# WhatsApp Business Cloud API
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id_aqui
WHATSAPP_ACCESS_TOKEN=seu_access_token_aqui
```

### 3. Criar e Aprovar Templates

⚠️ **IMPORTANTE**: Para enviar mensagens ativas (disparos iniciados pela empresa), você DEVE usar templates aprovados.

#### Como criar um template:

1. Acesse o [Meta Business Manager](https://business.facebook.com/)
2. Vá em **WhatsApp Manager** > **Message Templates**
3. Clique em **Create Template**
4. Configure o template conforme exemplo abaixo

#### Exemplo de Template: `daily_campaign_report`

**Nome**: `daily_campaign_report`

**Categoria**: `UTILITY` (para relatórios)

**Idioma**: `Portuguese (BR)`

**Corpo da mensagem**:
```
Olá {{1}}, 

📊 *Relatório Diário de Campanhas*

💰 Gasto hoje: {{2}}
💵 Saldo restante: {{3}}

Continue acompanhando seus resultados!
```

**Botão (opcional)**:
- Tipo: URL
- Texto: "Ver Relatório Completo"
- URL: `{{1}}` (variável dinâmica)

## 📦 Estrutura de Arquivos

```
lib/
  └── whatsapp-api.ts          # Módulo principal da API
actions/
  └── whatsapp-actions.ts      # Server Actions para Next.js
```

## 🚀 Como Usar

### Exemplo 1: Enviar Relatório Diário

```typescript
import { sendDailyReportAction } from '@/actions/whatsapp-actions';

// Em um componente ou API route
const result = await sendDailyReportAction(
  '5511999999999',           // Telefone do cliente (formato internacional sem +)
  'João Silva',              // Nome do cliente
  150.50,                    // Valor gasto hoje
  849.50,                    // Saldo restante
  'https://seu-site.com/relatorio.pdf'  // Link do relatório (opcional)
);

if (result.success) {
  console.log('Mensagem enviada! ID:', result.messageId);
} else {
  console.error('Erro:', result.error);
}
```

### Exemplo 2: Enviar Template Customizado

```typescript
import { sendTemplateMessageAction } from '@/actions/whatsapp-actions';

const result = await sendTemplateMessageAction(
  '5511999999999',
  'nome_do_template',
  [
    { type: 'text', text: 'João' },
    { type: 'text', text: 'R$ 150,00' }
  ]
);
```

### Exemplo 3: Enviar Documento PDF

```typescript
import { sendDocumentAction } from '@/actions/whatsapp-actions';

const result = await sendDocumentAction(
  '5511999999999',
  'https://seu-site.com/relatorio.pdf',
  'relatorio-mensal.pdf'
);
```

## 🤖 Automatização com Cron Job

Para enviar relatórios diários automaticamente, crie um API Route:

### `/app/api/cron/daily-reports/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { sendDailyReportAction } from '@/actions/whatsapp-actions';
import { getCampaigns } from '@/lib/meta-api';

export async function GET(request: Request) {
  // Verificar autenticação (ex: cron secret)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Buscar dados das campanhas
    const campaigns = await getCampaigns('act_123456789');
    
    // Calcular totais
    const totalSpend = campaigns.reduce((sum, c) => 
      sum + parseFloat(c.insights?.spend || '0'), 0
    );
    
    // Enviar relatório
    const result = await sendDailyReportAction(
      '5511999999999',
      'Cliente Exemplo',
      totalSpend,
      5000 - totalSpend
    );

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Error in daily report cron:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Configurar Cron no Vercel

Crie `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/daily-reports",
    "schedule": "0 9 * * *"
  }]
}
```

Isso executará o job todos os dias às 9h (horário UTC).

## 📊 Payload JSON de Exemplo

### Template Message

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "daily_campaign_report",
    "language": {
      "code": "pt_BR"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "João Silva"
          },
          {
            "type": "currency",
            "currency": {
              "fallback_value": "R$ 150.50",
              "code": "BRL",
              "amount_1000": 150500
            }
          },
          {
            "type": "currency",
            "currency": {
              "fallback_value": "R$ 849.50",
              "code": "BRL",
              "amount_1000": 849500
            }
          }
        ]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": 0,
        "parameters": [
          {
            "type": "text",
            "text": "https://seu-site.com/relatorio.pdf"
          }
        ]
      }
    ]
  }
}
```

### Document Message

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "document",
  "document": {
    "link": "https://seu-site.com/relatorio.pdf",
    "filename": "relatorio-mensal.pdf"
  }
}
```

## 🔗 Documentação Oficial

- [WhatsApp Cloud API Overview](https://developers.facebook.com/docs/whatsapp/cloud-api/overview)
- [Send Message Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- [Messages Endpoint Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
- [Media Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#media-messages)

## ⚠️ Erros Comuns

### 1. Template não encontrado
```
Error: Template name does not exist in the translation
```
**Solução**: Certifique-se de que o template foi criado e aprovado no Meta Business Manager.

### 2. Token inválido
```
Error: Invalid OAuth access token
```
**Solução**: Verifique se o `WHATSAPP_ACCESS_TOKEN` está correto e não expirou.

### 3. Número de telefone inválido
```
Error: Invalid parameter
```
**Solução**: Use formato internacional sem o símbolo `+` (ex: `5511999999999`).

### 4. Rate Limiting
```
Error: (#4) Application request limit reached
```
**Solução**: Implemente um sistema de fila ou aguarde antes de enviar mais mensagens.

## 💡 Boas Práticas

1. **Use cache** para evitar enviar mensagens duplicadas
2. **Implemente retry logic** para falhas temporárias
3. **Monitore os webhooks** para receber status de entrega
4. **Respeite os limites de taxa** da API
5. **Teste em sandbox** antes de usar em produção
6. **Mantenha logs** de todas as mensagens enviadas

## 📝 Próximos Passos

1. ✅ Configurar credenciais no `.env`
2. ✅ Criar e aprovar templates no Meta Business Manager
3. ✅ Testar envio de mensagem manualmente
4. ⬜ Implementar cron job para envios automáticos
5. ⬜ Configurar webhooks para receber status de entrega
6. ⬜ Adicionar sistema de fila para envios em massa
