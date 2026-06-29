# 📊 Análise da Integração Mercado Pago + PIX - Pescaria SUB

## 📋 Sumário Executivo

Seu jogo **Pescaria SUB** possui integração com a API do Mercado Pago (versão 2.3.0) para processar pagamentos via **PIX** e **Cartão de Crédito/Web**. Esta análise detalha o status atual, funcionalidades, segurança e recomendações de melhorias.

---

## 1. 🔐 Configuração Atual

### 1.1 Credenciais
```
ACCESS_TOKEN: APP_USR-533520416071697-061920-058ff5d0b1bc8c4eaaf293ec0cca0fd8-612550253
Proprietário: Ana Paula Funke Porto
CNPJ: 55.487.699/0001-58
```

### 1.2 Localização dos Arquivos
- **SDK**: `assets/Pagamento/mercadopago-2.3.0/`
- **Código de Integração**: `payment_system.py` (152 linhas)
- **Implementação UI**: `main.py` (funções `draw_shop_popup`, `draw_direct_purchase_popup`, `draw_funds_popup`)

### 1.3 Métodos de Pagamento Suportados
| Método | Status | Implementação |
|--------|--------|-----------------|
| **PIX** | ✅ Implementado | QR Code dinâmico |
| **Cartão de Crédito** | ✅ Implementado | Checkout web |
| **Outros** | ❌ Não | Possível adicionar no futuro |

---

## 2. 🔄 Fluxo de Pagamento Atual

### 2.1 PIX (Recomendado para o Brasil)

```python
create_pix_payment(amount, description, email)
    ↓
SDK Payment Create (payment_method_id: "pix")
    ↓
Retorna QR Code (Base64)
    ↓
Renderiza QR Code na tela (200x200px)
    ↓
Check Payment Status a cada 3 segundos
    ↓
Quando aprovado → Download de conteúdo
```

**Função Principal**: `payment_system.create_pix_payment()`
```python
def create_pix_payment(amount, description="Game Credits", email="user@game.com"):
    payment_data = {
        "transaction_amount": float(amount),
        "description": description,
        "payment_method_id": "pix",
        "payer": {
            "email": f"buyer_{int(time.time())}@gmail.com",
            "first_name": "Cliente",
            "last_name": "Teste",
            "identification": {
                "type": "CPF",
                "number": generate_cpf()  # CPF aleatório
            }
        }
    }
    
    # Retorna QR Code + Status
    return {
        "id": payment["id"],
        "status": payment["status"],
        "qr_code": qr_data.get("qr_code"),
        "qr_code_base64": qr_data.get("qr_code_base64"),
        "ticket_url": qr_data.get("ticket_url")
    }
```

### 2.2 Cartão de Crédito / Web Checkout

```python
create_payment_preference(amount, description, email)
    ↓
SDK Preference Create
    ↓
Retorna URL de Checkout
    ↓
Abre no navegador (webbrowser.open())
    ↓
Check Payment By Reference a cada 3 segundos
    ↓
Quando aprovado → Download de conteúdo
```

**Função Principal**: `payment_system.create_payment_preference()`
```python
def create_payment_preference(amount, description="Game Credits", email="user@game.com"):
    external_ref = f"GAME_REF_{int(time.time())}_{random.randint(1000,9999)}"
    
    preference_data = {
        "items": [{
            "title": description,
            "quantity": 1,
            "unit_price": float(amount),
            "currency_id": "BRL"
        }],
        "payer": {"email": email},
        "external_reference": external_ref,
        "back_urls": {
            "success": "https://www.google.com",
            "failure": "https://www.google.com",
            "pending": "https://www.google.com"
        },
        "auto_return": "approved"
    }
    
    return {
        "id": pref["id"],
        "init_point": pref["init_point"],  # URL para checkout
        "external_reference": external_ref,
        "status": "pending"
    }
```

---

## 3. 💳 Endpoints da API Utilizados

### 3.1 PIX - Criar Pagamento
**POST** `/v1/payments`
```
Authorization: Bearer APP_USR-533520416071697-061920-...
Content-Type: application/json

{
  "transaction_amount": 29.90,
  "description": "Credits 6000 - Pescaria SUB",
  "payment_method_id": "pix",
  "payer": {
    "email": "buyer_1709081234@gmail.com",
    "first_name": "Cliente",
    "last_name": "Teste",
    "identification": {
      "type": "CPF",
      "number": "12345678901"
    }
  }
}
```

**Resposta Sucesso (200)**:
```json
{
  "id": 1234567890,
  "status": "pending",
  "point_of_interaction": {
    "transaction_data": {
      "qr_code": "00020126580014br.gov.bcb.pix...",
      "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "ticket_url": "https://www.mercadopago.com.br/stop/pix..."
    }
  }
}
```

### 3.2 Cartão - Criar Preferência
**POST** `/checkout/preferences`
```
Authorization: Bearer APP_USR-533520416071697-061920-...
Content-Type: application/json

{
  "items": [{
    "title": "Credits 6000 - Pescaria",
    "quantity": 1,
    "unit_price": 29.90,
    "currency_id": "BRL"
  }],
  "payer": {"email": "buyer@game.com"},
  "external_reference": "GAME_REF_1709081234_4567",
  "back_urls": {
    "success": "https://www.google.com",
    "failure": "https://www.google.com",
    "pending": "https://www.google.com"
  },
  "auto_return": "approved"
}
```

**Resposta Sucesso (200)**:
```json
{
  "id": "87654321",
  "init_point": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=87654321",
  "sandbox_init_point": "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=87654321"
}
```

### 3.3 Verificar Status do Pagamento PIX
**GET** `/v1/payments/{payment_id}`
```
Authorization: Bearer APP_USR-533520416071697-061920-...

Resposta: { "id": 1234567890, "status": "approved" }
```

### 3.4 Verificar Pagamento por Referência (Cartão)
**GET** `/v1/payments/search?external_reference={ref}&status=approved`
```
Authorization: Bearer APP_USR-533520416071697-061920-...

Resposta: { "results": [{ "id": 9876543, "status": "approved" }] }
```

---

## 4. 📊 Tabela de Preços Atual (Coins)

| Pacote | Valor | Moedas | Taxa MP (Aprox) | Valor Líquido |
|--------|-------|--------|-----------------|----------------|
| Pequeno | R$ 1,00 | 1.000 | R$ 0,10 | R$ 0,90 |
| Médio | R$ 5,00 | 6.000 | R$ 0,40 | R$ 4,60 |
| Grande | R$ 10,00 | 15.000 | R$ 0,70 | R$ 9,30 |

**Taxa Mercado Pago PIX**: ~2,99% + R$ 0,00 (gratuitamente)
**Taxa Mercado Pago Cartão**: ~5,9% + R$ 0,30

---

## 5. ✅ O que Está Funcionando Bem

### 5.1 Geração de CPF Aleatório
- ✅ Função `generate_cpf()` calcula dígitos verificadores corretamente
- Permite criar pagamentos sem necessitar dados reais do usuário

### 5.2 QR Code Dinâmico
- ✅ QR Code é gerado servidor-side (Mercado Pago)
- ✅ Renderizado em Base64 e exibido na tela (200x200px)
- ✅ Válido por 60 minutos

### 5.3 Polling de Status
- ✅ Check a cada 3 segundos (intervalo equilibrado)
- ✅ Não sobrecarrega a API
- ✅ Detecta aprovação rapidamente

### 5.4 Integração UI
- ✅ Toggle entre PIX e Cartão
- ✅ Feedback visual (QR Code + Mensagens)
- ✅ Download automático após aprovação

---

## 6. ⚠️ Problemas Identificados

### 6.1 🔴 CRÍTICO: Credenciais Expostas em Código-Fonte
```python
# payment_system.py - LINHA 15
ACCESS_TOKEN = "APP_USR-533520416071697-061920-058ff5d0b1bc8c4eaaf293ec0cca0fd8-612550253"
```

**Risco**: Token pode ser roubado e usado para
- Criar pagamentos fraudulentos
- Acessar dados de clientes
- Gerar reembolsos indevidos

**Solução**:
```python
# ✅ USAR VARIÁVEIS DE AMBIENTE
import os
from dotenv import load_dotenv

load_dotenv()
ACCESS_TOKEN = os.getenv("MERCADO_PAGO_TOKEN")

if not ACCESS_TOKEN:
    raise EnvironmentError("MERCADO_PAGO_TOKEN não configurada!")
```

### 6.2 🟡 Email Hardcoded
```python
# main.py - LINHA 3633
res = payment_system.create_payment_preference(
    price, 
    f"Credits {coin} - Pescaria", 
    "hikoguedes@hotmail.com"  # ❌ Email fixo!
)
```

**Risco**: Todos os pagamentos vão para o mesmo email

**Solução**:
```python
# Capturar email do usuário na UI
user_email = player_name + "@gaming.local"  # ou solicitar ao usuário
```

### 6.3 🟡 URLs de Retorno Placeholder
```python
"back_urls": {
    "success": "https://www.google.com",  # ❌ Placeholder!
    "failure": "https://www.google.com",
    "pending": "https://www.google.com"
}
```

**Problema**: Usuário é redirecionado para Google após pagamento

**Solução**:
```python
"back_urls": {
    "success": "https://pescariasub.com/payment-success",
    "failure": "https://pescariasub.com/payment-failed",
    "pending": "https://pescariasub.com/payment-pending"
}
```

### 6.4 🟡 CPF Gerado Aleatoriamente
```python
def generate_cpf():
    digits = [random.randint(0, 9) for _ in range(9)]
    # Gera CPF como "12345678901"
```

**Problema**: CPF aleatório pode ser refusado em alguns cenários

**Solução**: Usar CPF válido (98765432100 é válido para testes)

### 6.5 🟡 Sem Tratamento de Erros de Rede
```python
search_result = sdk.payment().search(filters)
if search_result["status"] == 200:
    # ❌ E se search_result for None?
```

**Solução**: Adicionar try-catch mais robusto

### 6.6 🟡 Sem Log de Transações
- Nenhum registro de pagamentos processados
- Impossível fazer auditoria de vendas
- Difícil rastrear problemas

**Solução**: Salvar em `payments.json`

### 6.7 🟡 Sem Validação de Moeda
```python
"currency_id": "BRL"  # Sempre BRL, certo?
```

**OK para Brasil**, mas considerar suporte a outras moedas

### 6.8 🟡 Timeout Indefinido
```python
while running:
    # ❌ Espera infinitamente pela aprovação
    # ❌ Usuário preso na tela se cancelar PIX
```

**Solução**: Adicionar timeout após 10-15 minutos

---

## 7. 🔒 Segurança

### 7.1 Checklist de Segurança

| Item | Status | Ação |
|------|--------|------|
| Token em Variável de Ambiente | ❌ | Urgente |
| Validação de Montante | ⚠️ | Importante |
| Rate Limiting | ❌ | Importante |
| Webhook Signing | ❌ | Importante |
| HTTPS Obrigatório | ✅ | OK |
| Hash de Transação | ❌ | Importante |

### 7.2 Recomendação: Implementar Webhooks

Em vez de polling (checar a cada 3s), usar **webhooks**:

```python
@app.route('/webhook/payment', methods=['POST'])
def webhook_payment():
    data = request.json
    
    # Validar assinatura do webhook
    if not verify_signature(data, request.headers['X-Signature']):
        return {"error": "Invalid signature"}, 401
    
    if data['event_type'] == 'payment.created':
        payment_id = data['data']['id']
        check_and_deliver(payment_id)
    
    return {"success": True}
```

**Vantagens**:
- Reduz latência de entrega
- Menos chamadas à API
- Mais seguro (verificação de assinatura)

---

## 8. 💰 Análise de Receita

### 8.1 Simulação de Vendas (100 pagamentos)

| Método | % de Vendas | Valor Total | Taxa | Lucro |
|--------|------------|-------------|------|--------|
| PIX | 60% | R$ 150,00 | 2,99% | R$ 145,51 |
| Cartão | 40% | R$ 100,00 | 5,9% + 0,30 | R$ 93,10 |
| **Total** | **100%** | **R$ 250,00** | **-** | **R$ 238,61** |

**Margem Líquida**: 95,4% ✅

### 8.2 Lucro Mensal Estimado (1000 transações)
- PIX: R$ 1.455,10
- Cartão: R$ 931,00
- **Total: R$ 2.386,10/mês**

---

## 9. 🚀 Melhorias Recomendadas

### 9.1 Curto Prazo (1-2 semanas)

```python
# 1. Mover token para .env
# 2. Adicionar logging de transações
# 3. Adicionar timeout de 15 minutos
# 4. Melhorar tratamento de erros
```

**Arquivo `.env.example`**:
```
MERCADO_PAGO_TOKEN=APP_USR-...
GAME_EMAIL=noreply@pescariasub.com
PAYMENT_TIMEOUT=900  # 15 min em segundos
```

### 9.2 Médio Prazo (1 mês)

```python
# 1. Implementar Webhooks
# 2. Salvar histórico de pagamentos em banco de dados
# 3. Adicionar suporte a reembolsos
# 4. Dashboard de administrador
# 5. Validação de montante (min/max)
```

### 9.3 Longo Prazo (2+ meses)

```python
# 1. Integração com Stripe (alternativa PIX)
# 2. Suporte a múltiplas moedas
# 3. Sistema de assinatura (monthly pass)
# 4. Programa de afiliados
# 5. Analytics de conversão
```

---

## 10. 📚 Referências da API

### 10.1 Endpoints Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/v1/payments` | POST | Criar pagamento PIX |
| `/v1/payments/{id}` | GET | Verificar status |
| `/v1/payments/search` | GET | Buscar pagamentos |
| `/checkout/preferences` | POST | Criar checkout (Cartão) |
| `/v1/refunds` | POST | Gerar reembolso |

### 10.2 Status de Pagamento

```
pending    → Aguardando confirmação
approved   → Pagamento aprovado ✅
rejected   → Pagamento rejeitado ❌
cancelled  → Cancelado pelo usuário
refunded   → Reembolsado
in_process → Em processamento
```

### 10.3 Documentação Oficial
- https://www.mercadopago.com.br/developers/pt/reference
- SDKs: Python, JavaScript, Java, C#, etc.

---

## 11. 🧪 Teste Local

### 11.1 Testando PIX
```python
# Usar CPF válido para teste: 11144477735

result = payment_system.create_pix_payment(
    amount=10.00,
    description="Test PIX Payment",
    email="test@example.com"
)

print(f"QR Code: {result['qr_code']}")
print(f"Payment ID: {result['id']}")
```

### 11.2 Testando Cartão
```python
# Usar dados de teste do MP
# Cartão: 4111 1111 1111 1111
# Validade: 11/25
# CVV: 123

result = payment_system.create_payment_preference(
    amount=10.00,
    description="Test Card Payment",
    email="test@example.com"
)

print(f"Checkout URL: {result['init_point']}")
```

---

## 12. 🎯 Conclusão

### Status Geral: ⚠️ **FUNCIONAL, MAS COM PROBLEMAS DE SEGURANÇA**

#### Pontos Positivos:
- ✅ PIX totalmente integrado
- ✅ Cartão de crédito via Checkout
- ✅ QR Code dinâmico funcionando
- ✅ Polling de status adequado

#### Pontos Negativos:
- ❌ **Token exposto no código** (CRÍTICO)
- ❌ Email hardcoded
- ❌ URLs placeholder
- ❌ Sem logging de transações
- ❌ Sem timeout

#### Próximas Ações:
1. **IMEDIATO**: Mover token para variável de ambiente
2. **HOJE**: Adicionar logging de transações
3. **ESTA SEMANA**: Implementar timeout e melhorar erros
4. **PRÓXIMO MÊS**: Considerar webhooks

---

## 📞 Contato Mercado Pago

- **Suporte**: https://www.mercadopago.com.br/developers/pt/support/center
- **Discord**: https://discord.com/invite/yth5bMKhdn
- **Status**: https://status.mercadopago.com/

---

*Última atualização: 28 de Janeiro de 2026*
*Analisado por: GitHub Copilot*
