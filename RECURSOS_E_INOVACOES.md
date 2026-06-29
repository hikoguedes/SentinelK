# Recursos e Inovações do SentinelK Admin

Este documento consolida todos os recursos, inovações arquiteturais e de segurança desenvolvidos para a plataforma **SentinelK** e o barramento do **MiddlewareRM**.

---

## 🚀 1. Infraestrutura Híbrida & Deploy AWS

Implementamos uma infraestrutura de rede resiliente que interliga os recursos da AWS (ECS Fargate) com o servidor de APIs privado (EC2):

*   **Proxy Reverso Nativo (Zero Dependências)**: Desenvolvido no servidor do site principal ([server/index.js](file:///C:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/backend/src/routes.ts) / [server/index.js]) usando o módulo `http` nativo do Node.js. Ele intercepta as requisições sob o prefixo `/admin` e as repassa de forma transparente para o Nginx (porta 8080) e a API (porta 3333) da instância EC2 via IP privado de rede.
*   **Compatibilidade Express 5**: Tratamento de rotas com regex customizados (como `app.get(/^\/app-mobile/, ...)`) para adequação automática ao router estrito da v5.x do Express no container Fargate.
*   **Deploy Automatizado**: Script de deploy unificado ([deploy-aws.bat](file:///C:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/deploy-aws.bat)) que empacota o código, transfere para a EC2 e atualiza os contêineres Docker (MongoDB, Express API, Frontend Nginx, Mocks) garantindo zero downtime.
*   **DNS no Route 53**: Registro A apontando o domínio principal para o IP público estável da AWS ECS.

---

## 🧠 2. Agente de IA Integrador (AI API Onboarding)

Uma das maiores inovações da plataforma é a capacidade de integrar novos parceiros sem a necessidade de desenvolvimento de código manual ou reinicialização de servidores:

*   **Geração Inteligente via GPT-4o**: Rota dedicada `/api/ai/generate` que recebe a documentação de API do parceiro, mapeia os endpoints necessários (Disponibilidade, Reserva, Confirmação) e cospe uma classe adaptadora pronta em formato IIFE JavaScript.
*   **Motor de Sandbox Seguro (Node.js `vm`)**: O script gerado pela IA roda isolado na classe [SandboxExecutor.ts](file:///C:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/backend/src/services/SandboxExecutor.ts) através da biblioteca `vm` nativa, protegendo o sistema host contra loops infinitos, roubo de variáveis globais ou chamadas de sistema não permitidas.
*   **Smart Mocking (Proxies Recursivos)**: Mapeador dinâmico `createSmartMock` que intercepta requisições de contrato da Sandbox e cria respostas automáticas perfeitamente tipadas (ex: objetos de preço como `available: true`, `price: 150`), fazendo com que o compilador da Sandbox valide qualquer especificação JSON de API sem falhar por contratos vazios.
*   **Console e Editor Integrados**: O painel [ai-onboarding.html](file:///C:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/sentinelk/ai-onboarding.html) fornece um terminal de logs em tempo real do processo da IA, pipeline animada das etapas de validação e um editor interativo para depuração imediata.

---

## 🔒 3. Isolamento e Segurança por Papéis (Roles)

Organizamos e blindamos os recursos do sistema com base nos níveis de acesso do usuário, simplificando a navegação de forma segmentada:

*   **Filtro Dinâmico no Frontend**: Implementado no [auth-guard.js](file:///C:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/auth-guard.js), que lê a role do usuário no `localStorage` e esconde automaticamente qualquer item de navegação (`.nav-item` ou cabeçalho `.sidebar-heading`) que tenha restrição no atributo `data-role` do HTML.
*   **Segmentação de Menus**: 
    *   **`superadmin`**: Vê a barra lateral inteira, categorizada de forma clara (Geral, Núcleo SentinelK, Gestão B2B, Extranet B2B e Canais B2C).
    *   **`partner_manager`**: Vê apenas a seção **Extranet (Visão Parceiro)** para gerenciar preços, lotes e ver extratos financeiros do seu negócio. As opções do SentinelK Admin são ocultadas.
    *   **`reception`**: Vê unicamente a tela de validação operacional e o scanner de vouchers, protegendo os dados financeiros e cadastrais do parceiro.

---

## ⚡ 4. Experiência de Usuário Fluida (SPA)

Transformamos a experiência de uso da Extranet do Parceiro em uma interface instantânea:

*   **Navegação Sem Recarregamento (SPA)**: O arquivo [b2b-restaurante.html](file:///C:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/partner/b2b-restaurante.html) intercepta os eventos de clique nas abas locais da barra lateral. Em vez de recarregar a página passando query parameters, ele executa a troca local do painel (`switchTab`) e atualiza o endereço na URL silenciosamente usando a API `window.history.pushState`.
*   **Validação Visual Aprimorada**: Layout moderno e responsivo em HSL Dark Mode, com efeitos de glassmorphic border e micro-animações nas interações da sidebar.

---

## 🔄 5. Resiliência do Barramento de Checkouts

O barramento de checkouts do SentinelK assegura a alta disponibilidade das vendas de ingressos de parceiros comerciais:

*   **Soft Locks de Inventário**: Mecanismo temporal que bloqueia a cota física do produto por 10 minutos (tempo padrão para pagamento PIX), prevenindo o overbooking de assentos/mesas no marketplace.
*   **RAM Cache Fallback**: Caso o banco MongoDB perca conectividade na produção, o barramento ativa um modo de fallback de cache na memória RAM para garantir que os checkouts e reservas continuem funcionando normalmente sem quedas de conversão.

---

## 🎨 6. Widget Low-Code Storefront & Monitor de Vendas B2B

Disponibilizamos uma solução de vendas de baixíssimo atrito para parceiros de distribuição sem desenvolvedores, aliada a um painel financeiro para controle centralizado de splits e comissões.

### O Widget Low-Code E-commerce (`widget.js`):
*   **Isolamento Absoluto (Shadow DOM)**: Garante que os estilos da vitrine e do fluxo de checkout permaneçam intactos e não sejam corrompidos pelo CSS/frameworks do site do parceiro.
*   **Design Premium Claro**: Uma vitrine responsiva com tipografia de alta qualidade (fonte Google Fonts 'Outfit'), cantos arredondados, bordas sutis e sombras premium em substituição ao design antigo es escuro.
*   **Seletor Global de Data de Utilização**: Um calendário popover flutuante no topo direito que define previamente a data da atividade, acelerando o funil de checkout.
*   **Filtros com Ícones Vetoriais (SVG)**: Abas de categorias (Todos, Parques PWI, Planne, Hotéis, Gastronomia, IA) estilizadas com ícones inline.
*   **Checkout Premium & Voucher com Canhoto**: Fluxo responsivo (quantidade, formulário CPF/Celular, PIX QR Code real + cópia, e voucher virtual esteticamente semelhante a um bilhete físico de entrada).
*   **Atribuição Automática (`referredBy`)**: O script identifica o token do parceiro (`data-token`) e vincula a comissão da venda diretamente à carteira dele no banco de dados.

### Tela de Monitoramento de Vendas B2B (`monitor-vendas.html`):
*   **Cálculo Dinâmico de Splits**: Dashboard financeiro que consolida o volume total faturado bruto, a receita de split da plataforma (taxa SentinelK) e o valor líquido a repassar aos parceiros.
*   **Filtros e Detalhamento**: Pesquisa textual instantânea e filtros por parceiro/canal de origem ou status de faturamento.
*   **Simulador Operacional**: Possibilita que administradores visualizem os dados do comprador de cada transação e simulem a aprovação via webhook de PIX pendentes para homologação imediata.

### 🧹 7. Manutenção de Infraestrutura e Otimização AWS
*   **Pruning de Caches Obsoletos**: Processo de limpeza no Docker do servidor AWS EC2 (`docker system prune` e `docker builder prune`), liberando mais de **1.7 GB** de armazenamento em disco no sistema de arquivos `/`, sanando problemas de upload de deploy por limite de espaço.
