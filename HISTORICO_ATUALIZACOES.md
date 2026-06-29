# Histórico de Atualizações do Sistema (Changelog)
**Projeto:** SENTINELK Middleware
**Última Atualização:** Maio de 2026

Este documento centraliza todas as evoluções, correções e arquiteturas desenvolvidas e validadas até o momento.

---

## 🚀 1. Integrações e Backend (Motor SentinelK)

- **Integração Planne (Cervejaria Farol)**
  - Criação do driver `PlanneDriver.ts` para conectar nativamente à Seller API da Planne.
  - O driver contempla listagem de produtos, leitura de tarifas, checagem de disponibilidade e criação de venda externa (Commit).
  - Configuração das rotas (`backend/src/routes.ts`) para suportar a busca de catálogo diretamente da Planne Farol.
  - **Ambiente de Homologação Ativado:** Chaves de Staging da Planne configuradas com sucesso (`isProd: false`). Autenticação validada via script (`test-planne.ts`).

- **Isolamento de Ambientes de Teste**
  - Remoção completa da API de Prova de Conceito (Snowland / PWI Gateway) dos catálogos oficiais do sistema.

## 🎨 2. Arquitetura de Telas e Navegação

- **Criação do Mapa de Navegação**
  - Geração do artefato visual `MAPA_DE_NAVEGACAO.pdf` documentando os 3 mundos do sistema: Vitrine B2C, Admin SentinelK, e Extranet B2B.

- **Reestruturação Lógica das Interfaces (Separação de Responsabilidades)**
  - `b2b-setup.html`: Modificado para focar exclusivamente no pequeno parceiro "Manual" (que não possui API). Parceiros de API como a Cervejaria Farol foram removidos deste painel para não confundir o usuário.
  - `sentinelk-network.html` (Rede de Integrações): Otimizado para focar apenas nas APIs Inbound Reais (Farol e Museu do Caminhão). Removidos mockups poluentes.
  - **Modal de APIs:** Agora, clicar em um fornecedor no mapa arquitetural do SentinelK abre os produtos exatos que ele injeta no sistema (Mock dinâmico implementado para Museu e Planne).

## 🛒 3. Vitrine B2C Híbrida (Marketplace)

- **Correção Crítica no Motor de Cache (LocalStorage)**
  - Corrigido um bug onde o carregamento dos produtos de um parceiro (ex: PWI/Snowland) sobrescrevia e deletava acidentalmente os produtos de outros parceiros da mesma categoria (ex: Museu do Caminhão na categoria "parque").
  
- **Classificação e Injeção de Produtos Oficiais**
  - Cadastro de novos IDs oficiais: `PART-MUSEU` (Museu do Caminhão) e `PART-PLANNE` (Cervejaria Farol).
  - Inclusão dos ingressos reais de teste do Museu do Caminhão (Adulto, Meia, Sênior, Isento).
  - Adequação das categorias da Cervejaria Farol (Visitação e Jantares unificados sob "Gastronomia" para exibição consistente nos filtros do cliente final).

- **Melhorias de Design (UI/UX)**
  - **Legibilidade das Imagens:** Refatoração completa da "Badge" (Etiqueta de nome do parceiro) que fica em cima das fotos dos produtos. O antigo fundo semi-transparente verde foi substituído por uma caixa escura estilo *Glassmorphism* com letras em branco sólido e ícone roxo, aumentando a acessibilidade e leitura contra fundos coloridos/claros.

---

*Nota: Todos os logs e arquivos podem ser acessados diretamente na raiz do projeto (`MiddlewareRM`).*
