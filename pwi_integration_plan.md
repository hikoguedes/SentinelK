# Plano de Implantação e Arquitetura: Integração de Parques (PWI Driver) no SentinelK

Este documento detalha o funcionamento, fluxo transacional e a modelagem da integração real com os parques da **PWI** conforme implementado no middleware **SentinelK**.

---

## Estrutura da Integração Atual

A integração com a PWI foi desenhada para atuar em duas fases complementares (Passo 1: Bloqueio Temporário / Geração de PIX e Passo 2: Webhook / Emissão Final), adicionando resiliência ao banco MongoDB em cenários de instabilidade local e simulações inteligentes para o ambiente de Sandbox.

### 1. Diagrama de Classes UML (Modelagem Real)

Abaixo está mapeada a estrutura de arquivos e dependências em execução no diretório `backend`:

```mermaid
classDiagram
    class ExpressRouter {
        +POST /checkout
        +POST /webhooks/pagamento
        +GET /pwi/produtos
    }

    class SentinelK {
        -RealPwiDriver pwiDriver
        +getPwiCatalog() Promise~any~
        +checkAvailability(CartItem item) Promise~boolean~
        +applyTemporaryLock(CartItem[] items) Promise~String~
        +commitPurchase(String lockId, CartItem[] items, Object clientData) Promise~any~
        +rollbackPwiSale(int saleId) Promise~void~
    }

    class RealPwiDriver {
        -String baseUrl
        -String token
        -PwiConfig config
        -authenticate() Promise~void~
        -getHeaders() Promise~Object~
        +checkAvailability(String productId, String dataInicio, String dataFim) Promise~any~
        +listProducts() Promise~any~
        +createSale(Object saleData) Promise~any~
        +cancelSale(int saleId) Promise~any~
    }

    class PwiConfig {
        +String cnpj
        +String senha
        +String cliente
        +boolean isProd
    }

    class OrderModel {
        +ObjectId _id
        +CartItem[] items
        +Object clientData
        +double total
        +String lockId
        +String paymentId
        +String qrCodePix
        +String status
    }

    class MercadoPagoDriver {
        +createPixPayment(double amount, String description, String email) Promise~Object~
    }

    ExpressRouter --> SentinelK : consome
    ExpressRouter --> MercadoPagoDriver : gera pagamento
    ExpressRouter --> OrderModel : persiste dados
    SentinelK --> RealPwiDriver : delega chamadas de API PWI
    RealPwiDriver --> PwiConfig : config
```

---

### 2. Diagrama de Sequência UML (Fluxo de Compra e Emissão)

O diagrama abaixo detalha o ciclo de vida completo de uma venda de ingresso da PWI no SentinelK, desde a adição ao carrinho até a notificação de confirmação via webhook:

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    participant Router as Express Router
    participant SK as SentinelK (Middleware)
    participant PWI as RealPwiDriver (PWI API)
    participant DB as MongoDB / RAM Fallback
    participant MP as MercadoPago API

    Cliente->>Router: 1. Inicia Checkout (Carrinho de Ingressos)
    Router->>SK: 2. applyTemporaryLock(cartItems)
    
    rect rgb(230, 245, 255)
        note right of SK: 1. Duplo Check de Sessão e Vagas na PWI
        SK->>PWI: 3. listProducts() (Pega Catálogo)
        PWI-->>SK: Catálogo retornado
        SK->>PWI: 4. checkAvailability() (Sessões / Vagas)
        note over PWI: Chamada: /produto/listaSessoes
        PWI-->>SK: Retorna vagas disponíveis
    end
    
    SK-->>Router: 5. Retorna LockID (Soft Lock Local)
    
    rect rgb(240, 240, 240)
        note right of Router: 2. Persistência Resiliente (Mongo ou RAM)
        Router->>DB: 6. Salva pedido como "AGUARDANDO_PAGAMENTO"
        note over DB: Se MongoDB offline, salva na memória RAM de emergência (global.memoryOrders)
    end
    
    Router->>MP: 7. createPixPayment(total, info, email)
    MP-->>Router: 8. Retorna QRCode e ID do Pagamento
    Router->>DB: 9. Vincula QR Code ao Pedido
    Router-->>Cliente: 10. Exibe QR Code para Pagamento
    
    note over Cliente, Router: O cliente realiza a leitura do PIX no app do banco
    
    Cliente->>MP: 11. Paga o PIX
    MP->>Router: 12. Notifica pagamento (Webhook POST /webhooks/pagamento)
    
    rect rgb(230, 255, 230)
        note right of Router: 3. Commit - Emissão do Ingresso na PWI
        Router->>DB: 13. Busca pedido por ID
        Router->>SK: 14. commitPurchase(lockId, items, clientData)
        SK->>PWI: 15. createSale(saleData)
        note over PWI: Chamada: /venda/incluir (Com CPF/CNPJ do Comprador)
        PWI-->>SK: Retorna dados dos Ingressos Emitidos (Passaportes / IDs)
        Router->>DB: 16. Atualiza status do pedido para "PAGO" e anexa ingressos
    end
    
    Router-->>Cliente: 17. Retorna sucesso e disponibiliza Ingressos
```

---

## Detalhes de Implementação Críticos do Driver PWI

1. **Gestão Inteligente de Sessões (Prevenção de Erros 500 no Sandbox):**
   * A API da PWI retorna erro HTTP 500 (interno) caso um produto não tenha sessões abertas no período pesquisado. O `RealPwiDriver` captura esse caso de forma proativa. Se o cliente for configurado como `pwi_teste` (ambiente sandbox), ele injeta dinamicamente **100 vagas falsas simuladas** para que o fluxo de checkout não seja interrompido para fins de homologação. Em produção, ele retorna um array vazio (sinalizando esgotado).
2. **Resiliência Bancária contra Quedas de Banco (Fallback RAM):**
   * Se o container MongoDB do Docker estiver fora do ar localmente (problema comum ao reiniciar o Docker no Windows), a rota de checkout redireciona automaticamente o armazenamento do pedido para a memória RAM (`global.memoryOrders`), permitindo continuar os testes de integração do webhook de pagamento de ponta a ponta sem interrupções.
3. **Mecanismo de Rollback:**
   * Caso a chamada para a PWI falhe ou o processo precise ser desfeito, o `RealPwiDriver` possui o método `cancelSale(saleId)` que executa um request PUT em `/venda/cancelar/${saleId}`, invalidando os ingressos emitidos diretamente nas catracas do parque parceiro.
