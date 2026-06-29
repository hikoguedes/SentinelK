# 📋 Resumo Geral de Recursos e Atualizações — SENTINELK

Este documento reúne todas as implementações, melhorias de design, integrações de APIs, automações de infraestrutura AWS e o rebranding realizados no ecossistema do **SentinelK Middleware** e do site principal (**Unycopass**).

---

## 🎨 1. Rebranding Completo e Identidade Visual (SENTINELK)

Substituímos todas as marcas legadas (*OmniPortal* e *OmniTickets*) pela nova identidade unificada **SENTINELK** e integramos o logotipo oficial da marca.

*   **Logotipo de Tentáculos (`logo.png`)**:
    *   Salvamos a marca enviada no arquivo [logo.png](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/logo.png).
    *   Substituímos os ícones genéricos nos menus laterais (sidebars) de todas as **9 páginas administrativas** (sob `partner/` e `sentinelk/`) pela imagem do logotipo oficial (`../logo.png`), padronizando a altura e o alinhamento.
    *   Inserimos a marca na barra de navegação principal da vitrine B2C [index.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/index.html), de [b2c.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/b2c.html) e na tela de login unificada [login.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/login.html).
*   **Renomeação Global**:
    *   Substituição textual completa de *OmniPortal* e *OmniTickets* para **SENTINELK** nos títulos das páginas, textos de ajuda, logs do console e respostas HTTP do servidor (ex: `/api/health`).
    *   Atualizamos os cabeçalhos de todos os arquivos de documentação técnica, preservando unicamente os domínios de chamadas de APIs externas (como a URL `omniportal.com.br` da API da PWI).
*   **Novo Padrão de Vouchers (`SNT-`)**:
    *   Alteramos a lógica de geração aleatória de cupons e os dados de check-in para emitirem vouchers com a sigla **`SNT-`** (ex: `SNT-77A9B`) em substituição ao antigo prefixo `OMNI-`.

---

## 🛒 2. Widget Low-Code de Vendas Híbrido (`widget.js`)

Criamos um Widget integrado em JavaScript puro que os parceiros de vendas podem colar em seus sites para vender ingressos diretamente com controle de estoque integrado.

*   **Isolamento via Shadow DOM**: Isolamos o HTML e o CSS do widget, impedindo conflitos visuais ou de estilo com a folha CSS do site parceiro onde ele for colado.
*   **Modos Inline e Flutuante**: O widget renderiza diretamente embutido na página (caso encontre a div `#sentinelk-widget`) ou como um botão flutuante roxo elegante que abre uma gaveta deslizante modal no canto da tela.
*   **Tema Claro E-commerce Premium**:
    *   Design baseado em fundos limpos (`#f8fafc`), cartões brancos com sombras suaves e bordas arredondadas.
    *   Tipografia profissional integrada importando a fonte **Outfit** do Google Fonts.
    *   Badges visuais para categorização e identificadores com preenchimento de código de 6 dígitos (ex: `Cod: 000001`).
*   **Seletor de Data Global**: Inserimos um controle de calendário interativo no topo da vitrine para que o comprador defina previamente a data da viagem/experiência.
*   **Checkout Completo**:
    *   Formulário de cadastro com máscaras regex nativas para validação de CPF e Celular.
    *   Geração de PIX real/simulado copia-e-cola e QR Code de pagamento.
    *   Voucher digital formatado no design de canhoto picotado clássico contendo o QR Code do voucher final para leitura na catraca.

---

## 📊 3. Painel de Monitoramento de Vendas B2B

Desenvolvemos uma ferramenta interna avançada para acompanhar faturamentos, repasses financeiros e splits de comissão.

*   **Design Dark-Glassmorphism**: Desenvolvido na página [monitor-vendas.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/partner/monitor-vendas.html) com visual escuro transparente, desfoque de fundo e bordas de vidro.
*   **Cards de KPIs em Tempo Real**:
    *   **Faturamento Bruto**: Soma total dos ingressos vendidos.
    *   **SentinelK Split (Comissão)**: Valor retido pela plataforma.
    *   **Repasse Parceiro**: Valor líquido a ser repassado ao prestador.
*   **Filtros Reativos e Busca**: Tabela de transações interativa com filtros dinâmicos por parceiro/canal de origem, status do pagamento (Pago, Pendente, Cancelado) e barra de pesquisa livre por nome do cliente ou produto.
*   **Simulador de Confirmação**: Modal de detalhes da venda com botão para disparar manualmente o Webhook de aprovação do PIX, atualizando o status do pagamento na hora para testes.

---

## 🤖 4. Agente de IA Integrador (Onboarding de APIs Autônomo)

Criamos uma engine autônoma baseada em Inteligência Artificial para mapear e gerar automaticamente adaptadores de APIs para novos parceiros de bilhetagem.

*   **Sandbox Segura (`vm`)**: Desenvolvemos uma classe em Node.js ([SandboxExecutor.ts](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/backend/src/services/SandboxExecutor.ts)) que compila e executa o código JavaScript dos adaptadores de forma segura, isolando recursos do sistema e liberando apenas conexões controladas (`fetch`, `URL`, etc.).
*   **Geração Automatizada (GPT-4o)**: O endpoint `/api/ai/generate` envia a especificação textual da documentação original fornecida pelo parceiro e retorna a classe em JavaScript montada para integrar os métodos de checagem de tarifas, reserva e emissão.
*   **Playground e Logs**: Criamos a página [ai-onboarding.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/sentinelk/ai-onboarding.html) que disponibiliza uma linha do tempo das fases do processo (Leitura, Geração, Testes Unitários e Publicação) com visualização dos códigos e terminal de logs interativo.
*   **Rede de Integrações**: O arquivo [network.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/sentinelk/network.html) lista todos os adaptadores de IA dinamicamente, permitindo visualizar o código gerado em um modal estilizado ou desativá-los com um clique.

---

## 🌐 5. Infraestrutura de Rede, DNS e Portas (AWS ECS & Route 53)

Resolvemos problemas de rotas, segurança e facilidade de acesso do site principal e sua comunicação com o banco de dados.

*   **Proxy Reverso Transparente**:
    *   Configuramos o servidor Express do site principal (`app-unycoprod-main/server/index.js`) para atuar como proxy reverso.
    *   Requisições de arquivos sob `/admin/*` são repassadas internamente para a porta `8080` (Nginx da EC2) e chamadas sob `/admin/api/*` são repassadas para a porta `3333` (API SentinelK na EC2).
*   **Migração para a Porta 80 (HTTP Padrão)**:
    *   **Firewall AWS**: Adicionamos regra de entrada no Security Group ativo (`sg-062fe19fa07268c7e`) liberando a **porta 80** para o público.
    *   **ECS Task Definition**: Atualizamos a definição de tarefa (`unyco-crm`) no ECS Fargate para expor as portas container/host na **porta 80** e reconfiguramos a variável `PORT=80` na aplicação.
    *   **DNS (Route 53)**: Identificamos o novo IP público gerado pelo ECS (`3.231.149.39`) e atualizamos o registro do tipo **A** no Route 53 para apontar `unycopass.com.br` e `www.unycopass.com.br` para este novo IP.
*   **Acesso Simplificado**: Agora, os usuários podem acessar a landing page e a área restrita diretamente sem precisar digitar `:5000` ou `:8080` no navegador.

---

### 📂 Estrutura de Arquivos Relevantes do Projeto

*   **Código Principal**:
    *   [index.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/index.html) e [b2c.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/b2c.html) — Vitrine de venda clara.
    *   [widget.js](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/widget.js) — Código-fonte do Widget Low-Code.
    *   [login.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/login.html) — Tela de login integrada do painel administrativo.
    *   [deploy-aws.bat](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/deploy-aws.bat) — Script local de empacotamento e deploy remoto na EC2.
*   **Páginas Administrativas (Extranet & SentinelK)**:
    *   [partner/monitor-vendas.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/partner/monitor-vendas.html) — Monitor de split financeiro.
    *   [partner/b2b-setup.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/partner/b2b-setup.html) — Setup de novos parceiros.
    *   [sentinelk/ai-onboarding.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/sentinelk/ai-onboarding.html) — Onboarding de IA.
    *   [sentinelk/network.html](file:///c:/Users/Hiko/Documents/PROJETOS%20ANTIGRAVITY/MiddlewareRM/sentinelk/network.html) — Visualização da rede e adaptadores dinâmicos.
