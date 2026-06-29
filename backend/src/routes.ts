import { Router, Request, Response } from 'express';
import { SentinelK, CartItem } from './services/SentinelK';
import mongoose from 'mongoose';
import { MercadoPagoDriver } from './drivers/MercadoPagoDriver';
import Order from './models/Order';

const router = Router();

// Configuração de ambiente para a PWI. 
// Para produção real, coloque isso no seu arquivo .env
const pwiConfig = {
  cnpj: process.env.PWI_CNPJ || '58108408000161', 
  senha: process.env.PWI_SENHA || 'senha123', 
  cliente: process.env.PWI_CLIENTE || 'pwi_teste', 
  isProd: process.env.NODE_ENV === 'production'
};

// Configuração da API Planne Farol (Cervejaria Farol) - Ambiente de Validação (Staging)
const planneConfig = {
  clientId: process.env.PLANNE_CLIENT_ID || '82420a18-6e84-4c73-985a-9f85e27601a5',
  clientSecret: process.env.PLANNE_CLIENT_SECRET || '72768044-6b54-44e0-9b5e-b66102eb32b5',
  isProd: false, // Alterado para false para forçar o staging-seller-api.planne.com.br
  atributo: 'unycopass'
};

const sentinel = new SentinelK(pwiConfig, planneConfig);
const mpDriver = new MercadoPagoDriver();

router.post('/checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawCart = req.body.cart; 
    
    if (!rawCart || !Array.isArray(rawCart)) {
      res.status(400).json({ success: false, error: 'Carrinho inválido.' });
      return;
    }

    // Convertendo o carrinho antigo para o padrão oficial do SentinelK
    const cartItems: CartItem[] = rawCart.map((item: any) => ({
      provider: item.provider || 'PWI', // PWI ou PLANNE
      productId: item.productId || item.external_code,
      qty: item.qty || 1,
      date: item.date || new Date().toISOString().split('T')[0],
      time: item.time, // Para Planne
      tariffs: item.tariffs, // Para Planne
      price: item.price || 0,
      name: item.name || 'Ingresso B2C'
    }));

    // Dados do comprador (o frontend mandará isso no futuro, aqui simulamos se vier vazio)
    const clientData = req.body.clientData || {
      name: "Cliente Integrador",
      email: "cliente@email.com",
      cpf: "12345678909",
      phone: "11999999999"
    };

    const referredBy = req.body.referredBy || req.body.partnerId || req.body.token || null;

    console.log('\n=======================================');
    console.log('[Middleware] INICIANDO CHECKOUT B2C (PASSO 1: LOCK & PIX)');
    console.log('=======================================');

    // PASSO 1: Consulta e Soft Lock (Duplo Check)
    const lockId = await sentinel.applyTemporaryLock(cartItems);

    // Calcula o total do carrinho
    const totalAmount = cartItems.reduce((acc, item: any) => acc + (parseFloat(item.price || 0) * item.qty), 0);

    // PASSO 2: Salvar o Pedido (Com Fallback Ultra Resiliente se o Mongo do Docker estiver fora)
    let orderId;
    
    if (mongoose.connection.readyState === 1) {
      // Mongo Online
      const newOrder = new Order({
        items: cartItems,
        clientData: clientData,
        total: totalAmount,
        lockId: lockId,
        status: 'AGUARDANDO_PAGAMENTO',
        referredBy: referredBy
      });
      await newOrder.save();
      orderId = newOrder._id.toString();
      console.log(`[MongoDB] Pedido criado com sucesso. ID: ${orderId}`);
    } else {
      // Mongo Offline (Falha no Docker do Windows) -> Usar Memória RAM Temporária
      orderId = `MEM_${Date.now()}`;
      (global as any).memoryOrders = (global as any).memoryOrders || {};
      (global as any).memoryOrders[orderId] = {
        _id: orderId,
        items: cartItems,
        clientData: clientData,
        total: totalAmount,
        lockId: lockId,
        status: 'AGUARDANDO_PAGAMENTO',
        referredBy: referredBy
      };
      console.log(`[RAM DB] Banco Offline! Pedido salvo na memória RAM de emergência. ID: ${orderId}`);
    }

    // PASSO 3: Gerar PIX no Mercado Pago
    const pixData = await mpDriver.createPixPayment(totalAmount, `Pedido SentinelK #${orderId}`, clientData.email);
    
    // Atualiza o pedido com os dados do PIX gerado
    if (mongoose.connection.readyState === 1) {
      await Order.findByIdAndUpdate(orderId, {
        paymentId: pixData.paymentId,
        qrCodePix: pixData.qrCode,
        qrCodePixBase64: pixData.qrCodeBase64
      });
    } else {
      (global as any).memoryOrders[orderId].paymentId = pixData.paymentId;
      (global as any).memoryOrders[orderId].qrCodePix = pixData.qrCode;
    }

    console.log('[Middleware] PIX Gerado. Aguardando pagamento via Webhook...\n');
    res.json({ 
      success: true, 
      message: 'PIX gerado com sucesso. Aguardando pagamento.', 
      orderId: orderId,
      pix: pixData
    });

  } catch (error: any) {
    console.error('[Middleware] Erro no Checkout:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ROTA: Webhook do Mercado Pago (Recebe o aviso de que o PIX foi pago)
router.post('/webhooks/pagamento', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body; 

    console.log('\n=======================================');
    console.log(`[Webhook] RECEBIDO AVISO DE PAGAMENTO PARA O PEDIDO ${orderId}`);
    console.log('=======================================');

    let orderData;
    let isMongo = mongoose.connection.readyState === 1;

    if (isMongo) {
      orderData = await Order.findById(orderId);
    } else {
      orderData = (global as any).memoryOrders ? (global as any).memoryOrders[orderId] : null;
    }

    if (!orderData) {
      res.status(404).json({ success: false, error: 'Pedido não encontrado no banco nem na memória.' });
      return;
    }

    if (orderData.status !== 'AGUARDANDO_PAGAMENTO') {
      res.status(400).json({ success: false, error: `Pedido não está aguardando pagamento. Status atual: ${orderData.status}` });
      return;
    }

    // PASSO 4: Commit - Emissão do Ingresso
    console.log(`[Webhook] Pedido ${orderId} aprovado financeiramente! Iniciando emissão...`);
    const finalTickets = await sentinel.commitPurchase(orderData.lockId!, orderData.items, orderData.clientData);

    // Atualiza o Banco
    if (isMongo) {
      orderData.status = 'PAGO';
      orderData.tickets = finalTickets;
      await orderData.save();
      console.log(`[MongoDB] Pedido ${orderId} marcado como PAGO com ingressos emitidos!\n`);
    } else {
      orderData.status = 'PAGO';
      orderData.tickets = finalTickets;
      console.log(`[RAM DB] Pedido ${orderId} marcado como PAGO na Memória!\n`);
    }

    res.json({ success: true, message: 'Pagamento processado e ingressos emitidos.', tickets: finalTickets });
  } catch (error: any) {
    console.error('[Webhook] Erro Crítico ao processar pagamento:', error.message);
    
    // Se falhou o Sync, nós marcamos no banco como ERRO_EMISSAO para o SAC poder ver
    if (req.body.orderId) {
      await Order.findByIdAndUpdate(req.body.orderId, { status: 'ERRO_EMISSAO' });
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Nova Rota para listar o catálogo direto da PWI (para fins de teste/onboarding)
router.get('/pwi/produtos', async (req: Request, res: Response) => {
  try {
    const produtos = await sentinel.getPwiCatalog();
    res.json({
      success: true,
      message: 'Catálogo de Produtos obtido com sucesso da PWI',
      data: produtos
    });
  } catch (error: any) {
    console.error('[Middleware] Erro ao listar produtos PWI:', error.message);
    res.status(500).json({ success: false, error: 'Falha ao buscar produtos na PWI' });
  }
});

// Nova Rota para listar o catálogo direto da Planne Farol
router.get('/planne/produtos', async (req: Request, res: Response) => {
  try {
    const produtos = await sentinel.getPlanneCatalog();
    res.json({
      success: true,
      message: 'Catálogo de Produtos obtido com sucesso da Planne Farol',
      data: produtos
    });
  } catch (error: any) {
    console.error('[Middleware] Erro ao listar produtos Planne:', error.message);
    res.status(500).json({ success: false, error: 'Falha ao buscar produtos na Planne Farol' });
  }
});

import User from './models/User';
import PartnerAdapter from './models/PartnerAdapter';
import { SandboxExecutor } from './services/SandboxExecutor';
import axios from 'axios';

// ROTA: Login com Níveis de Acesso (RBAC) - Autenticação Persistente no MongoDB
router.post('/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
      return;
    }

    // Busca o usuário no MongoDB
    const user = await User.findOne({ email });

    // Valida o usuário e verifica a senha (com hash PBKDF2)
    if (!user || !user.verifyPassword(password)) {
      res.status(401).json({ success: false, error: 'E-mail ou senha incorretos.' });
      return;
    }

    res.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        role: user.role
      },
      token: `mock-jwt-token-for-${user.role}-${Date.now()}`
    });
  } catch (error: any) {
    console.error('[Login] Erro ao autenticar usuário:', error.message);
    res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
  }
});

// ==========================================
// ROTAS DO AGENTE DE IA INTEGRADOR DE APIs
// ==========================================

// ROTA: Gerar Adaptador de API via OpenAI
router.post('/ai/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { partnerName, apiDoc } = req.body;
    if (!partnerName || !apiDoc) {
      res.status(400).json({ success: false, error: 'partnerName e apiDoc são obrigatórios.' });
      return;
    }

    const partnerId = "PART-" + partnerName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 12);

    const systemPrompt = `Você é um engenheiro especialista em integrações para o middleware SentinelK.
Sua tarefa é ler a documentação da API de um parceiro e gerar um módulo JavaScript de integração.
O código retornado DEVE ser uma IIFE (Immediately Invoked Function Expression) que retorna a classe do adaptador.
A classe deve conter exatamente os seguintes métodos:
1. checkAvailability(productId, date, qty) -> Promise<{ available: boolean, price: number }>
2. createSoftLock(productId, date, qty, clientData) -> Promise<{ success: boolean, lockId: string, error?: string }> (onde clientData possui name, email, cpf, phone)
3. confirmBooking(lockId) -> Promise<{ success: boolean, voucherCode: string, error?: string }>
4. cancelBooking(lockId) -> Promise<boolean>

Você DEVE retornar APENAS o código JavaScript puro e válido. Não inclua blocos de código markdown (como \`\`\`javascript ou \`\`\`), explicações ou introduções. Comece o texto diretamente com "(function() {" e termine com "})()".`;

    const userPrompt = `Parceiro: ${partnerName}
Documentação da API:
${apiDoc}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'OpenAI API Key não configurada no servidor (.env).' });
      return;
    }

    console.log(`[AI Agent] Solicitando geração de adaptador para ${partnerName} no GPT-4o...`);

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let rawCode = response.data.choices[0].message.content.trim();
    
    // Limpeza caso a LLM insista em retornar delimitadores de markdown
    if (rawCode.startsWith('```javascript')) {
      rawCode = rawCode.replace('```javascript', '').replace('```', '').trim();
    } else if (rawCode.startsWith('```js')) {
      rawCode = rawCode.replace('```js', '').replace('```', '').trim();
    } else if (rawCode.startsWith('```')) {
      rawCode = rawCode.replace(/```/g, '').trim();
    }

    res.json({
      success: true,
      partnerId,
      partnerName,
      code: rawCode
    });
  } catch (error: any) {
    console.error('[AI Agent] Erro ao gerar adaptador:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROTA: Testar Adaptador em Sandbox (Simulação de Contrato)
router.post('/ai/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ success: false, error: 'Código do adaptador é obrigatório.' });
      return;
    }

    console.log('[AI Agent] Iniciando teste do adaptador em Sandbox...');
    const adapter = SandboxExecutor.instantiateAdapter(code, true);

    const clientData = {
      name: "Usuário Teste",
      email: "teste@sentinelk.com",
      cpf: "12345678909",
      phone: "11999998888"
    };

    console.log('  1. Executando checkAvailability...');
    const avail = await adapter.checkAvailability("PROD-TEST", "2026-12-31", 1);
    if (typeof avail.available !== 'boolean' || typeof avail.price !== 'number') {
      throw new Error('Formato inválido retornado por checkAvailability. Esperado: { available: boolean, price: number }');
    }

    console.log('  2. Executando createSoftLock...');
    const lock = await adapter.createSoftLock("PROD-TEST", "2026-12-31", 1, clientData);
    if (typeof lock.success !== 'boolean' || !lock.lockId) {
      throw new Error('Formato inválido retornado por createSoftLock. Esperado: { success: boolean, lockId: string }');
    }

    console.log('  3. Executando confirmBooking...');
    const confirm = await adapter.confirmBooking(lock.lockId);
    if (typeof confirm.success !== 'boolean' || !confirm.voucherCode) {
      throw new Error('Formato inválido retornado por confirmBooking. Esperado: { success: boolean, voucherCode: string }');
    }

    console.log('  4. Executando cancelBooking...');
    const cancel = await adapter.cancelBooking(lock.lockId);
    if (typeof cancel !== 'boolean') {
      throw new Error('Formato inválido retornado por cancelBooking. Esperado: boolean');
    }

    console.log('✅ Adaptador passou em todos os testes da Sandbox com sucesso!');
    res.json({
      success: true,
      message: 'Adaptador passou em todos os testes de contrato com sucesso.'
    });
  } catch (error: any) {
    console.error('[AI Agent] Falha nos testes da Sandbox:', error.message);
    res.status(422).json({
      success: false,
      error: `Falha na Sandbox: ${error.message}`
    });
  }
});

// ROTA: Salvar/Publicar Adaptador
router.post('/ai/adapters', async (req: Request, res: Response): Promise<void> => {
  try {
    const { partnerId, partnerName, code, apiDoc } = req.body;
    if (!partnerId || !partnerName || !code) {
      res.status(400).json({ success: false, error: 'partnerId, partnerName e code são obrigatórios.' });
      return;
    }

    const filter = { partnerId };
    const update = { partnerName, code, apiDoc, active: true };
    
    await PartnerAdapter.findOneAndUpdate(filter, update, { upsert: true, new: true });
    console.log(`[AI Agent] Adaptador ${partnerId} (${partnerName}) publicado/atualizado com sucesso!`);
    
    res.json({ success: true, message: 'Adaptador publicado com sucesso!' });
  } catch (error: any) {
    console.error('[AI Agent] Erro ao publicar adaptador:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROTA: Listar Adaptadores
router.get('/ai/adapters', async (req: Request, res: Response): Promise<void> => {
  try {
    const adapters = await PartnerAdapter.find({});
    res.json({ success: true, data: adapters });
  } catch (error: any) {
    console.error('[AI Agent] Erro ao listar adaptadores:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROTA: Alternar Status Ativo/Inativo do Adaptador (Pausar/Reativar)
router.patch('/ai/adapters/:partnerId/toggle', async (req: Request, res: Response): Promise<void> => {
  try {
    const { partnerId } = req.params;
    const adapter = await PartnerAdapter.findOne({ partnerId });
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Adaptador não encontrado.' });
      return;
    }
    adapter.active = !adapter.active;
    await adapter.save();
    console.log(`[AI Agent] Status do adaptador ${partnerId} alternado para: ${adapter.active ? 'ATIVO' : 'PAUSADO'}`);
    res.json({ success: true, active: adapter.active });
  } catch (error: any) {
    console.error('[AI Agent] Erro ao alternar status do adaptador:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROTA: Remover Adaptador
router.delete('/ai/adapters/:partnerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { partnerId } = req.params;
    await PartnerAdapter.deleteOne({ partnerId });
    console.log(`[AI Agent] Adaptador deletado: ${partnerId}`);
    res.json({ success: true, message: 'Adaptador removido com sucesso!' });
  } catch (error: any) {
    console.error('[AI Agent] Erro ao remover adaptador:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROTA: Gerar Documentação Técnica da API (Markdown)
router.get('/ai/document/:partnerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { partnerId } = req.params;
    const adapter = await PartnerAdapter.findOne({ partnerId });
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Adaptador não encontrado.' });
      return;
    }

    const systemPrompt = `Você é um redator técnico e arquiteto de software especialista no ecossistema SentinelK.
Sua tarefa é analisar a documentação técnica fornecida pelo parceiro e o código JavaScript do adaptador SentinelK correspondente.
Gere um manual de integração técnica detalhado e profissional formatado em Markdown.
O manual deve descrever:
1. Visão Geral da Integração (Parceiro, escopo, etc.)
2. Detalhes Técnicos (Como o SentinelK executa o adaptador na Sandbox do Node.js vm)
3. Mapeamento de Funções:
   - Descreva como checkAvailability chama a API externa.
   - Descreva como createSoftLock cria a reserva temporária.
   - Descreva como confirmBooking emite o voucher oficial.
   - Descreva cancelBooking.
4. Credenciais Necessárias (Onde colocar Tokens, URLs, etc. de acordo com o código do adaptador).
5. Estrutura de Resposta de Exemplo para cada método.

Retorne APENAS o Markdown puro. Não use blocos de código com a palavra markdown, comece direto com os títulos do Markdown.`;

    const userPrompt = `Parceiro: ${adapter.partnerName} (${adapter.partnerId})
Código JavaScript:
${adapter.code}

Documentação original fornecida:
${adapter.apiDoc}`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'OpenAI API Key não configurada no servidor (.env).' });
      return;
    }

    console.log(`[AI Agent] Solicitando geração de documentação para ${adapter.partnerName}...`);
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let markdown = response.data.choices[0].message.content.trim();
    if (markdown.startsWith('```markdown')) {
      markdown = markdown.replace('```markdown', '').replace('```', '').trim();
    } else if (markdown.startsWith('```')) {
      markdown = markdown.replace(/```/g, '').trim();
    }

    res.json({ success: true, markdown });
  } catch (error: any) {
    console.error('[AI Agent] Erro ao gerar documentação:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROTA: Chat Assistente de Suporte sobre a API
router.post('/ai/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { partnerId, messages } = req.body;
    if (!partnerId || !messages || !Array.isArray(messages)) {
      res.status(400).json({ success: false, error: 'partnerId e array de mensagens são obrigatórios.' });
      return;
    }

    const adapter = await PartnerAdapter.findOne({ partnerId });
    if (!adapter) {
      res.status(404).json({ success: false, error: 'Adaptador não encontrado.' });
      return;
    }

    const systemPrompt = `Você é um assistente técnico especialista de suporte para o SentinelK.
Você está conversando com um administrador sobre a integração com o parceiro "${adapter.partnerName}" (ID: ${adapter.partnerId}).
Você tem acesso completo à documentação da API e ao código-fonte do adaptador JavaScript fornecidos abaixo.
Responda a perguntas técnicas com precisão, apontando trechos de código ou fluxos mapeados se necessário.
Seja conciso, profissional e prestativo. Use formatação Markdown nas suas respostas.

CÓDIGO DO ADAPTADOR:
\`\`\`javascript
${adapter.code}
\`\`\`

DOCUMENTAÇÃO ORIGINAL DA API:
\`\`\`text
${adapter.apiDoc}
\`\`\``;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'OpenAI API Key não configurada no servidor (.env).' });
      return;
    }

    console.log(`[AI Agent] Solicitando chat assistente para ${adapter.partnerName}...`);
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({ role: m.role || 'user', content: m.content }))
    ];

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: chatMessages,
      temperature: 0.5
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const reply = response.data.choices[0].message.content.trim();
    res.json({ success: true, reply });
  } catch (error: any) {
    console.error('[AI Agent] Erro no chat assistente:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROTA: Obter produtos filtrados por parceiro (para o Widget Low-Code)
router.get('/widget/products', async (req: Request, res: Response): Promise<void> => {
  try {
    let partnerId = (req.query.partnerId || req.query.token) as string;
    if (!partnerId) {
      res.status(400).json({ success: false, error: 'Parâmetro partnerId ou token é obrigatório.' });
      return;
    }
    partnerId = partnerId.toUpperCase();

    const defaultProds = [
      { id: "101", partnerId: "PART-101", nome: "Passaporte Vila da Mônica Adulto", preco: 169.00, categoria: "PWI", descricao: "Acesso integral ao parque temático coberto da Vila da Mônica em Gramado, com mais de 30 atrações interativas.", imgUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=500&q=80" },
      { id: "102", partnerId: "PART-101", nome: "Passaporte Vila da Mônica Infantil", preco: 149.00, categoria: "PWI", descricao: "Acesso integral infantil para o parque Vila da Mônica. Diversão garantida para crianças de todas as idades.", imgUrl: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=500&q=80" },
      { id: "201", partnerId: "PART-201", nome: "Suíte Alpina Luxo (Resort)", preco: 680.00, categoria: "hotel", descricao: "Diária para casal com café da manhã colonial incluso e vista para o vale.", imgUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=500&q=80" },
      { id: "301", partnerId: "PART-301", nome: "Fondue Premium Restaurante Alpino", preco: 350.00, categoria: "gastronomia", descricao: "Sequência completa de queijos suíços, carnes na pedra e chocolate de Gramado (Mesa para 2).", imgUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80" }
    ];

    let products: any[] = [];

    let pwiProducts: any[] = [];
    let planneProducts: any[] = [];

    // Busca produtos PWI
    try {
      const pwiProds = await sentinel.getPwiCatalog();
      pwiProducts = pwiProds.map((p: any) => ({
        id: p.id,
        partnerId: 'PART-101',
        nome: p.nome,
        preco: parseFloat(p.preco),
        categoria: 'PWI',
        descricao: p.descricao || `Ingresso oficial integrado via API PWI. Validade: ${p.qtDiasValidade || 5} dias.`,
        imgUrl: p.imgUrl || "https://images.unsplash.com/photo-1486915309851-b0cc1f8a0084?auto=format&fit=crop&w=500&q=80"
      }));
    } catch (e) {
      pwiProducts = defaultProds.filter(p => p.partnerId === 'PART-101');
    }

    // Busca produtos Planne
    try {
      const planneProds = await sentinel.getPlanneCatalog();
      const plannePrices: any = { "4905": 100.00, "46": 90.00, "187": 150.00, "199": 80.00 };
      planneProducts = planneProds.map((p: any) => ({
        id: p.id,
        partnerId: 'PART-PLANNE',
        nome: p.name || p.nome,
        preco: plannePrices[p.id] || 100.00,
        categoria: 'PLANNE',
        descricao: p.shortDescription || p.description || `Ingresso/Experiência integrado via Seller API Planne.`,
        imgUrl: p.thumbnailUrl || "https://images.unsplash.com/photo-1518176258769-f227c798150e?auto=format&fit=crop&w=500&q=80"
      }));
    } catch (e) {
      planneProducts = [];
    }

    // Adaptadores Dinâmicos de IA
    let iaProducts: any[] = [];
    try {
      const adapters = await PartnerAdapter.find({ active: true });
      adapters.forEach(adapter => {
        iaProducts.push({
          id: `PROD-${adapter.partnerId}`,
          partnerId: adapter.partnerId,
          nome: `Ingresso Oficial ${adapter.partnerName}`,
          preco: 120.00,
          categoria: 'IA',
          descricao: `Acesso integrado automaticamente via Adaptador SentinelK para ${adapter.partnerName}.`,
          imgUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=500&q=80"
        });
      });
    } catch (e) {}

    const localProducts = defaultProds.filter(p => p.partnerId !== 'PART-101');

    // Combina todos os produtos para a vitrine geral do widget
    const allProducts = [...pwiProducts, ...planneProducts, ...iaProducts, ...localProducts];
    products = allProducts;

    res.json({ success: true, partnerId, products });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ROTA: Obter lista de todos os pedidos (para a tela de Monitoramento B2B)
router.get('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    let list: any[] = [];

    // Tenta carregar do MongoDB se online
    if (mongoose.connection.readyState === 1) {
      list = await Order.find({}).sort({ createdAt: -1 }).lean();
    } else {
      // Fallback para memória RAM
      const mem = (global as any).memoryOrders || {};
      list = Object.values(mem).sort((a: any, b: any) => b._id.localeCompare(a._id));
    }

    res.json({ success: true, count: list.length, data: list });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
