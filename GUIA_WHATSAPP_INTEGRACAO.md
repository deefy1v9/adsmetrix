# Guia Completo: Como Integrar o WhatsApp Business ao Sistema

## 📋 Pré-requisitos

Antes de começar, você precisa ter:
- Uma conta no Facebook Business Manager
- Um número de telefone que não esteja sendo usado no WhatsApp pessoal
- Acesso de administrador ao Facebook Business Manager

---

## 🚀 Passo a Passo Completo

### **Passo 1: Criar um App no Meta for Developers**

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Faça login com sua conta Facebook
3. Clique em **"Meus Apps"** no menu superior
4. Clique em **"Criar App"**
5. Selecione o tipo **"Business"**
6. Preencha as informações:
   - **Nome do App**: "Sistema de Relatórios" (ou o nome que preferir)
   - **Email de contato**: seu email
   - **Conta do Business Manager**: selecione sua conta business
7. Clique em **"Criar App"**

### **Passo 2: Adicionar o Produto WhatsApp**

1. No painel do seu app, procure por **"WhatsApp"** na lista de produtos
2. Clique em **"Configurar"** no card do WhatsApp
3. Você será direcionado para a página de configuração do WhatsApp

### **Passo 3: Configurar o Número de Telefone**

#### Opção A: Usar Número de Teste (Recomendado para começar)

1. Na seção **"API Setup"**, você verá um número de teste fornecido pela Meta
2. Este número pode enviar mensagens para até 5 números verificados
3. Clique em **"Add phone number"** para adicionar números de destino para teste
4. Digite seu número pessoal no formato internacional: `+55 11 99999-9999`
5. Você receberá um código de verificação via WhatsApp
6. Digite o código para verificar o número

#### Opção B: Usar Seu Próprio Número (Para produção)

1. Na seção **"API Setup"**, clique em **"Add phone number"**
2. Selecione **"Use your own phone number"**
3. Escolha seu **Business Manager Account**
4. Clique em **"Next"**
5. Digite o número de telefone (formato: +55 11 99999-9999)
6. Escolha o método de verificação (SMS ou chamada telefônica)
7. Digite o código de verificação recebido
8. Aceite os termos de serviço
9. Aguarde a aprovação (geralmente instantânea)

### **Passo 4: Obter as Credenciais**

#### 4.1 - Phone Number ID

1. Na página **"API Setup"** do WhatsApp
2. Você verá uma seção chamada **"Phone number ID"**
3. Copie o número que aparece (formato: `123456789012345`)
4. **Guarde este número** - é o `WHATSAPP_PHONE_NUMBER_ID`

#### 4.2 - Temporary Access Token (Temporário)

1. Na mesma página, procure por **"Temporary access token"**
2. Clique em **"Generate"** ou copie o token que já aparece
3. **Este token expira em 24 horas** - use apenas para testes iniciais

#### 4.3 - Permanent Access Token (Recomendado)

Para criar um token permanente:

1. No menu lateral, vá em **"Ferramentas"** > **"Tokens de Acesso"**
2. Ou acesse diretamente: [Business Settings > System Users](https://business.facebook.com/settings/system-users)
3. Clique em **"Add"** para criar um System User
4. Preencha:
   - **Nome**: "Sistema de Relatórios WhatsApp"
   - **Função**: Admin
5. Clique em **"Create System User"**
6. Clique no System User criado
7. Clique em **"Generate New Token"**
8. Selecione o App que você criou
9. Marque as permissões:
   - ✅ `whatsapp_business_management`
   - ✅ `whatsapp_business_messaging`
10. Clique em **"Generate Token"**
11. **COPIE E GUARDE O TOKEN IMEDIATAMENTE** - ele só será mostrado uma vez!

### **Passo 5: Configurar as Variáveis de Ambiente**

1. Abra o arquivo `.env` na raiz do projeto
2. Adicione as seguintes linhas:

```env
# WhatsApp Business Cloud API
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. Substitua pelos valores que você copiou:
   - `WHATSAPP_PHONE_NUMBER_ID`: O Phone Number ID do Passo 4.1
   - `WHATSAPP_ACCESS_TOKEN`: O token permanente do Passo 4.3

4. Salve o arquivo

### **Passo 6: Criar e Aprovar um Template de Mensagem**

⚠️ **IMPORTANTE**: Para enviar mensagens ativas (disparos), você DEVE usar templates aprovados.

1. Acesse o [Meta Business Manager](https://business.facebook.com/)
2. No menu lateral, vá em **"WhatsApp Manager"**
3. Selecione sua conta WhatsApp Business
4. Clique em **"Message Templates"** no menu lateral
5. Clique em **"Create Template"**

#### Configuração do Template:

**Nome do Template**: `daily_campaign_report`

**Categoria**: `UTILITY` (para relatórios e atualizações)

**Idioma**: `Portuguese (BR)`

**Cabeçalho** (opcional):
```
📊 Relatório de Campanhas
```

**Corpo da Mensagem**:
```
Olá {{1}}, 

Aqui está o resumo das suas campanhas:

💰 Investimento: {{2}}
📊 Impressões: {{3}}
👆 Cliques: {{4}}
🎯 Leads: {{5}}

Continue acompanhando seus resultados!
```

**Rodapé** (opcional):
```
Sistema de Gestão de Anúncios
```

**Botões** (opcional):
- Tipo: **URL**
- Texto: `Ver Relatório Completo`
- URL: `https://seu-site.com/relatorios`

7. Clique em **"Submit"**
8. Aguarde a aprovação (geralmente leva alguns minutos a algumas horas)

### **Passo 7: Testar a Integração**

1. Certifique-se de que o servidor está rodando:
   ```bash
   npm run dev
   ```

2. Acesse a página de relatórios:
   ```
   http://localhost:3000/whatsapp-reports
   ```

3. Preencha o formulário:
   - **Telefone**: Seu número no formato `5511999999999` (sem espaços, sem +)
   - **Nome**: Seu nome
   - Selecione uma conta de anúncios
   - Escolha as métricas

4. Clique em **"Enviar Relatório via WhatsApp"**

5. Verifique seu WhatsApp - você deve receber a mensagem!

---

## 🔍 Verificação e Troubleshooting

### Verificar se as credenciais estão corretas:

1. Abra o terminal no projeto
2. Execute:
   ```bash
   node -e "console.log(process.env.WHATSAPP_PHONE_NUMBER_ID, process.env.WHATSAPP_ACCESS_TOKEN)"
   ```
3. Deve mostrar seus valores (não deve ser `undefined`)

### Erros Comuns:

#### ❌ "Invalid OAuth access token"
**Solução**: O token expirou ou está incorreto. Gere um novo token permanente (Passo 4.3)

#### ❌ "Template name does not exist"
**Solução**: O template ainda não foi aprovado ou o nome está incorreto. Verifique no WhatsApp Manager.

#### ❌ "Invalid parameter"
**Solução**: O número de telefone está em formato incorreto. Use `5511999999999` (sem + e sem espaços)

#### ❌ "Recipient phone number not valid"
**Solução**: 
- Se estiver usando número de teste: adicione o destinatário na lista de números verificados
- Se estiver usando número próprio: verifique se o número está correto

#### ❌ "WhatsApp credentials not configured"
**Solução**: As variáveis de ambiente não foram carregadas. Reinicie o servidor após editar o `.env`

---

## 📊 Limites e Quotas

### Número de Teste:
- Pode enviar para até **5 números verificados**
- Limite de **250 conversas** por dia
- Ideal para desenvolvimento e testes

### Número de Produção:
- Começa com limite de **250 conversas** por dia
- Aumenta automaticamente conforme o uso e qualidade
- Pode chegar a **100.000+ conversas** por dia

### Taxa de Envio:
- **80 mensagens por segundo** (limite da API)
- Use delays entre envios em massa

---

## 🔐 Segurança

### ⚠️ NUNCA:
- Compartilhe seu Access Token
- Commite o arquivo `.env` no Git
- Exponha as credenciais no código frontend

### ✅ SEMPRE:
- Use variáveis de ambiente
- Mantenha o `.env` no `.gitignore`
- Gere tokens com permissões mínimas necessárias
- Revogue tokens antigos quando criar novos

---

## 📚 Recursos Adicionais

- [Documentação Oficial WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Guia de Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- [Referência da API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
- [WhatsApp Business Platform](https://business.whatsapp.com/)

---

## ✅ Checklist Final

Antes de ir para produção, verifique:

- [ ] Número de telefone verificado e aprovado
- [ ] Token de acesso permanente configurado
- [ ] Variáveis de ambiente no `.env`
- [ ] Template aprovado pela Meta
- [ ] Teste de envio bem-sucedido
- [ ] Números de destino verificados (se usando número de teste)
- [ ] Servidor reiniciado após configurar `.env`

---

## 🎉 Pronto!

Agora você pode enviar relatórios automáticos via WhatsApp para seus clientes!

Se tiver alguma dúvida, consulte a documentação oficial ou entre em contato com o suporte da Meta.
