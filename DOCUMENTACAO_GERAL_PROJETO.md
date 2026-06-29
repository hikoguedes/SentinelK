# 🚀 SentinelK - Middleware Híbrido de Bilhetagem
**Documentação Oficial de Engenharia e Negócios - Checkpoint (Fase 1)**

Este documento centraliza todo o progresso, arquitetura, acessos e roteiro estratégico do projeto para garantir a continuidade perfeita do desenvolvimento nas próximas fases.

---

## 1. O Que Já Foi Construído (Estado Atual)

O ecossistema base (Prova de Conceito End-to-End) já está operando localmente com sucesso.

### 🎨 Camada Frontend (Interfaces Visuais)
*   **`b2c.html` (Demo / Sandbox da API B2C):** Funciona como uma Prova de Conceito (PoC) ou portal "White-label". Como nosso foco não é atrair o turista final, essa tela serve para demonstrar o poder e a velocidade da nossa orquestração para as agências que quiserem consumir a nossa API.
*   **`b2b.html` (Dashboard Admin/Parceiros Grandes):** Painel focado no monitoramento dos *Buckets* do Motor de Revenue Management (Precificação Dinâmica).
*   **`b2b-restaurante.html` (Extranet para Parceiros Locais):** Painel operacional avançado para gestão de "Estoque Consignado", com edição de lotes em calendário, visualização de Soft Locks em tempo real e simulador de check-in na porta do estabelecimento.
*   **`b2b-setup.html` (Onboarding & Catálogo):** Painel de autoatendimento (Self-Service) onde o parceiro cadastra seu próprio negócio, cria novos produtos (Hospedagem, Gastronomia, Atrações) e define as regras de negócio, alimentando o MongoDB e o HUB de API instantaneamente.

### ⚙️ Camada Backend (Middleware API)
*   **Tecnologia:** Node.js (TypeScript) + Express.
*   **Arquitetura:** Padrão *Adapter/Driver*. O Middleware processa o carrinho e aciona o driver correspondente (`PwiDriver`, `StaticDriver`, `OmnibeesDriver`) para garantir abstração total de sistemas legados.
*   **Lógica Principal:** Implementação completa da rotina de *Soft Lock* (travar vaga antes de cobrar) e *Commit* (emitir o ingresso após a aprovação financeira).

### 🗄️ Camada de Dados e Ambientes (Docker)
Todo o ambiente foi containerizado para garantir paridade com produção (AWS).
1.  **MongoDB (Porta 27017):** Banco NoSQL oficial do Middleware para guardar cadastros complexos de parceiros e os calendários de disponibilidade estática.
2.  **Parque Fictício "Mock Park" (Portas 4000 e 3306):** Simulador de um parque parceiro gigante. Possui seu próprio banco MySQL (com a tabela da catraca) e sua própria API, comprovando que o Middleware consegue "conversar" e realizar vendas em sistemas de terceiros através da internet.

---

## 2. Acessos, Portas e Como Subir o Ambiente

Para ligar todo o ecossistema novamente na sua máquina, siga este roteiro no seu terminal (PowerShell):

**A. Subir o Middleware e Banco Central (MongoDB):**
```powershell
cd "C:\Users\Hiko\Documents\PROJETOS ANTIGRAVITY\MiddlewareRM\backend"
docker-compose up --build -d
```
*   **API do Middleware:** `http://localhost:3333/api/health`
*   **Painel Visual do Banco (Mongo Express):** `http://localhost:8081` *(Usuário: `admin` | Senha: `adminpassword`)*

**B. Subir o ERP Fictício do Parque Parceiro:**
```powershell
cd "C:\Users\Hiko\Documents\PROJETOS ANTIGRAVITY\MiddlewareRM\mock-park"
docker-compose up --build -d
```
*   **Painel Admin do Parque (Ver Vendas Caindo ao Vivo):** `http://localhost:4000/admin`

**C. Simular Venda (Teste B2C):**
Abra o arquivo `b2c.html` no navegador e clique em **"Pagar com PIX & Gerar Ingressos"**.

---

## 3. Estratégias e Soluções Adotadas

*   **Abordagem "Long Tail" (Cauda Longa):** O sistema não depende apenas de Parques com APIs caras (PWI). A criação da Extranet local e do MongoDB permite agregar rapidamente pequenos negócios (Tirolesas, Vinícolas, Restaurantes), escalando o catálogo do portal B2C exponencialmente.
*   **Prevenção de Overbooking (Duplo Check):** Se o cliente comprar um combo "Parque + Hotel" e o hotel não tiver vaga no milissegundo da compra, o Middleware destrava o Parque e não cobra o cartão, impedindo o temido problema de "pacote pela metade".
*   **O Core Business (HUB B2B / Channel Manager):** O Middleware não precisa gastar dinheiro com marketing (CAC) para atrair turistas. O nosso negócio é ser o "Encanamento do Turismo". Nós unificamos os parques (API) e restaurantes (Estoque Local), e fornecemos **APIs Públicas (com API Keys)** para outras Agências, Hotéis e OTAs venderem. Ganhamos no volume (escala) cobrando uma taxa de transação/markup por cada ingresso processado de forma invisível.

---

## 4. Backlog: Próximos Passos e Novos Recursos (Fase 2)

Na próxima fase do projeto, a estrutura construída será conectada a serviços do mundo real e as telas ganharão vida completa.

### 💰 Faturamento & Financeiro (B2B Hub)
*   [ ] **Faturamento de Agências:** Desenvolver o módulo de "Billing" para cobrar as agências parceiras. Elas vendem usando a nossa API o mês inteiro, e o sistema gera uma fatura unificada (ou cobra no cartão corporativo delas) cobrindo as taxas e os ingressos emitidos.
*   [ ] **Split de Pagamentos:** Regra de negócio que divide o PIX automaticamente (Ex: 70% vai direto pra conta do Parque, 30% fica para a plataforma como comissão) na hora da compra.
*   [ ] **Módulo B2B de Conciliação:** Tela para o parceiro ver o "Extrato" do que ele tem a receber quinzenalmente da plataforma.

### 👤 Cadastros e Autenticação
*   [ ] **Sistema de Login (JWT):** Autenticação segura separando 3 perfis: *SuperAdmin* (Dono do Middleware), *Gestor de Parque* e *Recepção/Maitre*.
*   [ ] **Ligar o Painel de Setup à API:** O frontend visual do Onboarding B2B (`b2b-setup.html`) já foi construído. O próximo passo é plugar os formulários dele na nossa API Node.js para que eles realmente comecem a inserir os documentos JSON na Collection "estabelecimentos" do MongoDB.

### 🧠 Inteligência e Receita (RM Avançado)
*   [ ] **O Worker de RM:** Programar o script real (Cron Job) que vai varrer os estoques a cada 10 minutos e mudar os *Buckets* de preço (Promo -> Standard -> Last Minute) no banco de dados automaticamente.
*   [ ] **Scraper da Concorrência:** Robô que monitora sites oficiais dos parques para aplicar o "Price Override" e garantir que nosso Middleware nunca esteja vendendo mais caro que a bilheteria oficial.

### 💡 Sugestões de Recursos Extras (Diferenciais Inovadores)
*   **Apple Wallet & Google Pay:** Botão de "Adicionar à Carteira" na tela de sucesso. O cliente salva o QR Code no celular e acessa a catraca do parque offline, sem precisar de internet na Serra.
*   **Upsell Pós-Compra Automático (WhatsApp):** O Middleware detecta que a pessoa vai para o Snowland amanhã e dispara um WhatsApp hoje: *"Compre o Fast-Pass para não pegar fila amanhã por R$ 50"*.
*   **Dashboard B2B Preditivo:** Mostrar para o dono do restaurante um gráfico dizendo: *"Nas últimas 3 quartas-feiras choveu, e você lotou o Fondue. A previsão para amanhã é chuva. Sugerimos subir o Bucket para Last Minute"*.
