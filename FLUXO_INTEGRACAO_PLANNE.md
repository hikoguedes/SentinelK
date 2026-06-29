# Fluxo de Integração e Compra - API Planne (Cervejaria Farol)

Este documento descreve o padrão arquitetural implementado no **SENTINELK / Motor SentinelK** para lidar com as vendas e integrações em tempo real com a **Seller API da Planne**.
Ele serve como base de conhecimento para futuras manutenções ou novas integrações de APIs de Ticketing B2B que sigam o mesmo padrão.

## 1. O Padrão da API Planne
A integração segue à risca o manual de instruções oficial (*Instruções para integração de venda PLANNE_FAROL.md*). O fluxo estabelecido pela Planne dita que a responsabilidade da cobrança financeira é do Integrador (nosso sistema). A Planne atua exclusivamente como o "inventário" e "emissor do ticket".

A API se divide nos seguintes blocos principais:
- `GET /products`: Catálogo geral.
- `GET /detailedSchedulings`: Checagem de disponibilidade.
- `POST /externalSales`: Consolidação da venda (Commit) e emissão do ingresso.
- `GET /vouchers`: Recuperação do QR Code / PDF.

---

## 2. O Fluxo de Compra Passo a Passo (Mecânica SentinelK)

O processo de compra do lado do turista na Vitrine B2C até a emissão oficial do ingresso funciona de forma assíncrona, dividido em 5 etapas críticas:

### Passo 1: Intenção de Compra (Checkout & Duplo Check)
Quando o turista clica em "Pagar", o SentinelK **não realiza a venda às cegas**. 
- O motor dispara uma requisição relâmpago ao endpoint `detailedSchedulings` da Planne para analisar as taxas de ocupação (`OccupationRates`).
- O objetivo é responder à pergunta: *"Ainda tem vaga para esse ingresso nessa data/horário exato?"*
- Havendo disponibilidade, o SentinelK cria um **Soft Lock** (bloqueio de segurança temporário na memória local/banco de dados) garantindo a vaga do cliente.
- Imediatamente, o sistema se comunica com o **Mercado Pago** e gera um QR Code de cobrança PIX no valor total do carrinho.

### Passo 2: O Pagamento e o Webhook
O cliente possui uma janela de tempo definida para realizar o pagamento do PIX pelo aplicativo do banco.
- Assim que o pagamento é liquidado, o Mercado Pago envia um "aviso" automático (Webhook) de confirmação para a nossa rota `/webhooks/pagamento`.

### Passo 3: O Commit (Confirmação Oficial)
Este é o gatilho da integração. Ao receber a confirmação financeira, o motor SentinelK aciona a função interna de **Commit**.
- O sistema formata os dados do turista (Nome, CPF, E-mail) e do ingresso escolhido no padrão exigido pela Planne.
- Um detalhe crítico: O payload de venda obrigatoriamente carrega a etiqueta de integração `"unycopass"`.
- Em seguida, o SentinelK envia uma requisição `POST` para o endpoint `createExternalSale` da Planne.

### Passo 4: Geração do Voucher na Planne
Ao receber o payload de `ExternalSale`, o servidor da Planne:
1. Valida nossas chaves de acesso (Client ID e Secret).
2. Abate a reserva do inventário oficial da Cervejaria Farol.
3. Altera automaticamente o status da venda para `payment_complete`.
4. Gera e devolve um **ID de Venda Externa** junto com as reservas.

### Passo 5: Resgate e Entrega ao Turista
Com a venda consolidada, o SentinelK pode agora:
- Recuperar os QR Codes ou os arquivos em PDF dos ingressos através do endpoint `/vouchers/{voucherId}/pdf`.
- Entregar o bilhete pronto na tela do turista e despachar uma cópia por e-mail.

---

## 3. Ambientes e Chaves
Para garantir segurança durante os ciclos de desenvolvimento, o driver `PlanneDriver.ts` é configurado por meio da flag `isProd`.

- **Modo Homologação (Staging)**
  - `isProd: false`
  - Base URL: `https://staging-seller-api.planne.com.br`
  - Utilizado exclusivamente para simulações e validações do time da Planne.

- **Modo Produção (Oficial)**
  - `isProd: true`
  - Base URL: `https://seller-api.planne.com.br`
  - Utilizado apenas quando o sistema é levado ao ar (Go-live).

---
**Nota para Desenvolvedores Futuros:**
Caso precisem debugar falhas na emissão de tickets da Farol, sempre verifiquem primeiro os logs do Webhook (`/webhooks/pagamento`) no nosso backend, pois é ele quem aciona o "Passo 3". Se o Webhook falhar, o cliente paga mas a requisição para a Planne nunca é enviada.
