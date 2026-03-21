# ⚡ Guia Rápido - Integração WhatsApp (5 Minutos)

## 🎯 O que você precisa:
- Conta no Facebook Business Manager
- Número de telefone (que não use WhatsApp pessoal)

---

## 📝 Passos Rápidos:

### 1️⃣ Criar App (2 min)
```
1. Acesse: https://developers.facebook.com/
2. "Meus Apps" → "Criar App" → Tipo "Business"
3. Nome: "Sistema Relatórios"
4. Criar App
```

### 2️⃣ Adicionar WhatsApp (1 min)
```
1. No painel do app → Procure "WhatsApp"
2. Clique em "Configurar"
```

### 3️⃣ Obter Credenciais (2 min)

#### Phone Number ID:
```
Na página "API Setup" → Copie o "Phone number ID"
Exemplo: 123456789012345
```

#### Access Token:
```
Opção Rápida (teste - expira em 24h):
→ Copie o "Temporary access token"

Opção Permanente (produção):
1. Business Settings → System Users
2. Add → Nome: "WhatsApp Bot" → Admin
3. Generate Token → Selecione seu app
4. Permissões: whatsapp_business_management + whatsapp_business_messaging
5. COPIE O TOKEN (só mostra uma vez!)
```

### 4️⃣ Configurar .env (30 seg)
```env
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxx
```

### 5️⃣ Criar Template (Opcional - pode testar sem)
```
1. WhatsApp Manager → Message Templates
2. Create Template
3. Nome: daily_campaign_report
4. Categoria: UTILITY
5. Corpo: "Olá {{1}}, seu relatório: {{2}}"
6. Submit → Aguardar aprovação
```

### 6️⃣ Testar! (30 seg)
```
1. npm run dev
2. Acesse: http://localhost:3000/whatsapp-reports
3. Preencha telefone: 5511999999999 (sem + e sem espaços)
4. Enviar!
```

---

## 🚨 Troubleshooting Rápido

| Erro | Solução |
|------|---------|
| "Invalid OAuth token" | Token expirou → Gere novo token permanente |
| "Template not found" | Template não aprovado → Use número de teste primeiro |
| "Invalid parameter" | Formato do telefone errado → Use `5511999999999` |
| "Credentials not configured" | Reinicie o servidor após editar `.env` |

---

## 📱 Número de Teste vs Produção

### Número de Teste (Grátis):
- ✅ Já vem configurado
- ✅ Perfeito para testar
- ❌ Só envia para 5 números verificados
- ❌ Limite de 250 mensagens/dia

### Seu Número (Produção):
- ✅ Envia para qualquer número
- ✅ Limite maior (começa com 250, aumenta automaticamente)
- ❌ Precisa verificar o número
- ❌ Precisa aprovar templates

---

## ✅ Checklist Mínimo

- [ ] App criado no Meta for Developers
- [ ] WhatsApp adicionado ao app
- [ ] `WHATSAPP_PHONE_NUMBER_ID` copiado
- [ ] `WHATSAPP_ACCESS_TOKEN` copiado
- [ ] Valores no `.env`
- [ ] Servidor reiniciado
- [ ] Teste enviado com sucesso

---

## 🔗 Links Úteis

- [Meta for Developers](https://developers.facebook.com/)
- [Business Manager](https://business.facebook.com/)
- [Documentação WhatsApp API](https://developers.facebook.com/docs/whatsapp/cloud-api)

---

**Tempo total: ~5-10 minutos** ⏱️

Para o guia completo e detalhado, veja: `GUIA_WHATSAPP_INTEGRACAO.md`
