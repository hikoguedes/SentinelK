# 💸 Arquitetura Financeira: Middleware x PWI

Este documento detalha o modelo de negócios financeiro e a separação de responsabilidades entre o SENTINELK (Middleware) e a API da PWI, fundamentais para a operação do sistema B2B2C.

## 1. O Mito do Pagamento Direto na API do Parque
Ao analisar a documentação oficial da PWI (`WebApiVendas_1.0.20.pdf`), fica claro que **a PWI não processa pagamentos do cliente final (Turista)**. A API deles não possui nenhum endpoint para transacionar Cartão de Crédito ou PIX.

A arquitetura deles é estritamente **B2B (Business to Business)**. Isso significa que:
* A PWI enxerga o Middleware (sua empresa) como o **único cliente**.
* O endpoint de emissão (`/venda/incluir`) apenas gera os QR Codes da catraca e debita o valor dos ingressos de uma **Conta Consumo (Pré-paga)** ou adiciona a uma **Fatura Mensal** vinculada ao CNPJ do Integrador.

## 2. A Obrigatoriedade do "Motor Financeiro" Próprio
Como o parque não cobra o turista, essa responsabilidade recai 100% sobre o nosso Middleware. O SENTINELK precisa atuar como um e-commerce completo:

1. **Captura:** Mostrar o nosso próprio QR Code PIX (via Gateway como Mercado Pago, Asaas ou Stripe) para o turista.
2. **Custódia:** Receber o dinheiro diretamente na conta bancária da sua empresa (já retendo o seu *Markup* / Lucro).
3. **Liquidação (Commit):** Somente após o dinheiro cair na sua conta, acionar a API da PWI para emitir o ingresso oficial.

## 3. O Fluxo Real: O "Webhook" em 3 Passos
Para que essa operação ocorra de forma automática e segura, construímos a lógica em 3 fases:

### Passo 1: Soft Lock (Reserva Temporária)
Quando o turista clica em "Comprar", o Middleware pergunta para a PWI se tem vaga (`checkAvailability`). Se sim, o Middleware trava aquela vaga no nosso banco de dados (MongoDB) com o status `AGUARDANDO_PAGAMENTO` e exibe o QR Code do PIX na tela. O turista tem, por exemplo, 10 minutos para pagar.

### Passo 2: O Webhook (Orelha do Servidor)
O turista paga o PIX pelo aplicativo do banco dele. O banco avisa o nosso Gateway (ex: Mercado Pago), que por sua vez dispara um aviso invisível (Webhook) para uma rota secreta da nossa API:
`POST /api/webhooks/pagamento`
O payload diz: *"O pedido #12345 acabou de ser pago!"*

### Passo 3: Sync & Emissão (Commit)
O Middleware acorda, marca o pedido como `PAGO` no MongoDB e, imediatamente, dispara a requisição oficial `venda/incluir` para a PWI. A PWI gera os identificadores dos ingressos e debita da sua conta (Integrador).

## 4. A Emissão Física do Ingresso (PDF / QR Code)
Um erro comum é acreditar que a PWI envia o ingresso para o cliente final. Isso **não** acontece.
A API da PWI (conforme documentação) retorna apenas **números frios** no formato JSON (ex: `numeroPassaporte` e `digitoPassaporte`).

A responsabilidade de construir a experiência do usuário é 100% do Middleware (SENTINELK):
1. O Middleware recebe os números brutos da PWI.
2. O Middleware utiliza uma biblioteca de geração de imagens para **desenhar o código de barras ou QR Code**.
3. O Middleware cria um documento PDF personalizado (com as regras do parque, fotos e a logo da sua marca).
4. O Middleware (via AWS SES, SendGrid, etc.) dispara um e-mail em nome de `ingressos@suamarca.com.br` entregando o ingresso final na caixa de entrada do turista.

Essa abordagem *White-label* garante que o seu cliente só tenha contato com a **sua marca**, do início ao fim.

---

> [!IMPORTANT]
> **Por que isso é um excelente negócio?**
> Ao controlar o fluxo financeiro, você tem o poder do **Split de Pagamentos** e do **Markup Dinâmico** (Revenue Management). Você pode vender um ingresso de R$ 100 por R$ 150 nos dias de alta demanda, a PWI só te cobrará os R$ 100 tabelados, e os R$ 50 de lucro ficam instantaneamente na sua conta bancária. Essa é a verdadeira mina de ouro de ser um "Channel Manager".
