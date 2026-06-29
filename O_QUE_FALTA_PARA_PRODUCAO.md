# 📋 Checklist de Transição para Produção (100% Real)

Este guia documenta exatamente o que resta fazer, alterar e configurar no **SentinelK Middleware** para desativar as simulações (mocks) e colocar o sistema para transacionar vendas reais com emissão oficial na PWI e recebimento automático via Mercado Pago.

---

## 🛠️ Passo 1: Credenciais de Produção da PWI

Atualmente, o sistema está usando a conta fake `pwi_teste`. Para emitir ingressos que abrem as catracas do parque físico, precisamos das credenciais de produção fornecidas pela administração da PWI.

- [ ] **Modificar no arquivo `backend/src/routes.ts` (ou no arquivo `.env` definitivo):**
  Substituir os parâmetros de inicialização do `RealPwiDriver`:
  ```typescript
  const pwiDriver = new RealPwiDriver({
    baseUrl: 'https://www.omniportal.com.br/Omni/WebApiVendas', // Manter a URL oficial
    cliente: 'NOME_DO_CLIENTE_PRODUCAO', // Solicitar ao Parque
    usuario: 'USUARIO_PRODUCAO',         // Solicitar ao Parque
    senha: 'SENHA_PRODUCAO'              // Solicitar ao Parque
  });
  ```

---

## 🛑 Passo 2: Desativar a Simulação da PWI (Bypass de Erro)

No ambiente de testes da PWI, os produtos vivem dando erro de "indisponibilidade". Nós criamos um contorno ("Bypass") para forçar o sucesso caso isso aconteça. Em produção, **precisamos desativar isso** para que o sistema aponte erros reais de falta de estoque.

- [ ] **Modificar no arquivo `backend/src/drivers/RealPwiDriver.ts`:**
  Remover (ou comentar) o bloco de simulação dentro do bloco `catch` do método `createSale` (linhas ~105 a ~125). Em produção, se a PWI der erro, o sistema deve recusar a venda e avisar o cliente.

---

## 💠 Passo 3: Webhook Automático do Mercado Pago (Sem clicar em Botão)

No painel de testes, nós usamos o botão *"Simular Pagamento (Disparar Webhook)"*. Em produção, o Mercado Pago fará isso sozinho pela internet.

- [ ] **Expor o Middleware para a Internet:**
  O Mercado Pago precisa conseguir enxergar o seu servidor local. Durante os testes de produção local, use uma ferramenta como o **Ngrok** para expor a porta 3333:
  ```powershell
  ngrok http 3333
  ```
- [ ] **Cadastrar a URL do Webhook no Mercado Pago:**
  Acesse o seu Painel de Desenvolvedor do Mercado Pago e cadastre a URL de notificação apontando para a sua rota de webhook:
  `https://SUA_URL_DO_NGROK.ngrok-free.app/api/webhooks/pagamento`
- [ ] **Remover o Botão de Simulação do Frontend:**
  No arquivo `b2c.html`, a tela de sucesso (ir para a carteira) deve ser aberta automaticamente via **Polling** (um script que fica perguntando à API a cada 3 segundos se o status do pedido no banco mudou para `PAGO`), em vez de exigir que o usuário clique no botão de simular.

---

## 🗄️ Passo 4: Estabilizar o Banco de Dados (MongoDB)

Para colocar em produção (em um servidor na nuvem como AWS, DigitalOcean ou VPS), ou mesmo para rodar localmente sem os gargalos de permissões do Docker no Windows:

- [ ] **Opção A: MongoDB Atlas (Nuvem - Altamente Recomendado):**
  Crie um banco de dados gratuito na nuvem (MongoDB Atlas) e substitua a `MONGO_URL` no `docker-compose.yml` da API:
  `mongodb+srv://usuario:senha@cluster.mongodb.net/nomedobanco`
  Isso remove a necessidade de rodar o contêiner do MongoDB localmente e garante 100% de estabilidade de dados.
- [ ] **Opção B: Corrigir WSL2 local:**
  Caso queira manter o MongoDB no Docker local rodando redondo com volumes salvando no HD, certifique-se de reativar a seção `volumes:` comentada no seu `docker-compose.yml` e rodar o Docker Desktop como Administrador.

---

## 👤 Passo 5: Formulário Real de Identificação do Cliente

Atualmente, o checkout está injetando sempre o cliente fictício "Turista Hiko". A PWI exige dados válidos para associar ao passaporte.

- [ ] **Criar Tela de Cadastro no `b2c.html`:**
  Antes do botão "Gerar PIX", adicione campos de entrada simples para coletar:
    - Nome Completo
    - CPF (Válido para a PWI não recusar)
    - E-mail (Para enviar o voucher)
    - Telefone
- [ ] **Vincular os Inputs ao Fetch:**
  Substituir a propriedade `clientData` estática na função `simulateCheckout()` pelos valores reais digitados pelo usuário.

---

## 🎟️ Passo 6: Geração Física do PDF / Impressão do Voucher

A PWI fornece apenas a numeração e dados frios do ingresso. O cliente precisa receber algo visual e bonito no celular.

- [ ] **Criar Rota de Impressão:**
  Criar uma rota no backend (ex: `/api/pedidos/:id/voucher`) que gera uma página HTML otimizada para celular/impressão com:
    - O Logotipo do Parque.
    - Nome do Comprador e data de utilização.
    - O QR Code renderizado de forma limpa e em alta definição para leitura rápida na catraca física do parque.
