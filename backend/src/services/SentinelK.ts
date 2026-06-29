import { RealPwiDriver, PwiConfig } from '../drivers/RealPwiDriver';
import { PlanneDriver, PlanneConfig } from '../drivers/PlanneDriver';
import PartnerAdapter from '../models/PartnerAdapter';
import { SandboxExecutor } from './SandboxExecutor';

export interface CartItem {
  provider: string; // Dynamic provider ID support
  productId: string;
  qty: number;
  date: string; // YYYY-MM-DD
  time?: string;
  tariffs?: { id: string, qty: number }[];
  price?: number;
  name?: string;
}

export class SentinelK {
  private pwiDriver: RealPwiDriver;
  private planneDriver: PlanneDriver;

  constructor(pwiConfig: PwiConfig, planneConfig: PlanneConfig) {
    this.pwiDriver = new RealPwiDriver(pwiConfig);
    this.planneDriver = new PlanneDriver(planneConfig);
  }

  /**
   * Consulta rápida de catálogo (PWI)
   */
  async getPwiCatalog() {
    console.log('[SentinelK] Solicitando catálogo de produtos na PWI...');
    return await this.pwiDriver.listProducts();
  }

  /**
   * Consulta rápida de catálogo (Planne)
   */
  async getPlanneCatalog() {
    console.log('[SentinelK] Solicitando catálogo de produtos na Planne Farol...');
    return await this.planneDriver.listProducts();
  }

  /**
   * 1. Consulta via API de disponibilidade
   */
  async checkAvailability(item: CartItem): Promise<boolean> {
    if (item.provider === 'PWI') {
      console.log(`[SentinelK] Consultando disponibilidade PWI para o produto ${item.productId} na data ${item.date}...`);
      
      const catalogo = await this.pwiDriver.listProducts();
      const produtoAlvo = catalogo.find((p: any) => p.id === item.productId);
      
      if (!produtoAlvo) {
         console.log(`[SentinelK] Produto ${item.productId} não encontrado no catálogo da PWI!`);
         return false;
      }

      if (!produtoAlvo.produtoComSessao) {
         console.log(`[SentinelK] Produto ${item.productId} é de acesso direto (Sem sessão). Lock liberado!`);
         return true;
      }

      const dataFim = `${item.date}T23:59:59`;
      const dataInicio = `${item.date}T00:00:00`;
      const sessoes = await this.pwiDriver.checkAvailability(item.productId, dataInicio, dataFim);
      
      const sessaoValida = sessoes && sessoes.find((s: any) => s.qtDisponivel >= item.qty);
      if (!sessaoValida) {
        console.log(`[SentinelK] Produto ${item.productId} esgotado para a sessão da PWI!`);
        return false;
      }
      return true;
    }

    if (item.provider === 'PLANNE') {
      console.log(`[SentinelK] Consultando disponibilidade Planne para o produto ${item.productId} na data ${item.date}...`);
      try {
        const schedulings = await this.planneDriver.checkAvailability(item.productId, item.date, item.date);
        
        if (!schedulings || schedulings.length === 0) {
           console.log(`[SentinelK] Produto ${item.productId} esgotado ou indisponível na Planne para a data solicitada.`);
           return false;
        }
        
        return true;
      } catch (err: any) {
        console.error(`[SentinelK] Erro ao verificar disponibilidade na Planne:`, err.message);
        return false;
      }
    }

    // Provedor dinâmico via Adaptador de IA
    if (item.provider !== 'STATIC') {
      try {
        const adapterDoc = await PartnerAdapter.findOne({ partnerId: item.provider, active: true });
        if (adapterDoc) {
          console.log(`[SentinelK] Utilizando adaptador dinâmico de IA para o parceiro: ${item.provider}`);
          const adapter = SandboxExecutor.instantiateAdapter(adapterDoc.code);
          const availability = await adapter.checkAvailability(item.productId, item.date, item.qty);
          console.log(`[SentinelK] Resposta do adaptador de IA (${item.provider}):`, availability);
          return availability.available;
        }
      } catch (err: any) {
        console.error(`[SentinelK] Erro no Adaptador dinâmico de IA para ${item.provider}:`, err.message);
        return false;
      }
    }

    return true;
  }

  /**
   * 2. Bloqueio Temporário (Soft Lock)
   */
  async applyTemporaryLock(items: CartItem[]): Promise<string> {
    console.log('[SentinelK] Iniciando o "Fluxo Anti-Overbooking" (Duplo Check)...');
    
    for (const item of items) {
      const isAvailable = await this.checkAvailability(item);
      if (!isAvailable) {
        throw new Error(`O item ${item.productId} não tem disponibilidade suficiente. Checkout abortado.`);
      }
    }

    const lockId = `LOCK_${Date.now()}`;
    console.log(`[SentinelK] Bloqueio Temporário aplicado com sucesso. (LockID: ${lockId})`);
    console.log(`[SentinelK] O cliente tem 10 minutos para pagar o PIX.`);
    return lockId;
  }

  /**
   * 3. Confirmação da Compra (Sync)
   */
  async commitPurchase(lockId: string, items: CartItem[], clientData: any) {
    console.log(`[SentinelK] Pagamento do Lock ${lockId} confirmado! Iniciando emissão oficial (Sync)...`);
    const results = [];

    for (const item of items) {
      if (item.provider === 'PWI') {
        try {
          const saleData = this.buildPwiSalePayload(item, clientData);
          console.log(`[SentinelK -> PWI] Enviando pedido de venda oficial...`);
          const result = await this.pwiDriver.createSale(saleData);
          console.log(`[SentinelK <- PWI] Sucesso! Venda ID: ${result.id}`);
          results.push(result);
        } catch (error: any) {
          console.error(`[SentinelK] ERRO CRÍTICO no Sync da PWI:`, error.message);
          throw new Error(`Falha no Sync PWI: ${error.message}`);
        }
      } else if (item.provider === 'PLANNE') {
        try {
          const saleData = this.buildPlanneSalePayload(item, clientData);
          console.log(`[SentinelK -> Planne] Enviando pedido de venda oficial (Venda Externa)...`);
          const result = await this.planneDriver.createExternalSale(saleData);
          console.log(`[SentinelK <- Planne] Sucesso! Venda Externa ID: ${result.id}`);
          results.push(result);
        } catch (error: any) {
          console.error(`[SentinelK] ERRO CRÍTICO no Sync da Planne:`, error.message);
          throw new Error(`Falha no Sync Planne: ${error.message}`);
        }
      } else {
        // Provedor Dinâmico do Adaptador de IA
        try {
          const adapterDoc = await PartnerAdapter.findOne({ partnerId: item.provider, active: true });
          if (adapterDoc) {
            console.log(`[SentinelK -> IA Adapter] Executando commitPurchase para o parceiro ${item.provider}...`);
            const adapter = SandboxExecutor.instantiateAdapter(adapterDoc.code);
            
            const buyerData = {
              name: clientData.name,
              email: clientData.email,
              cpf: clientData.cpf,
              phone: clientData.phone
            };

            console.log(`[SentinelK -> IA Adapter] Criando soft lock no parceiro...`);
            const lockResult = await adapter.createSoftLock(item.productId, item.date, item.qty, buyerData);
            if (!lockResult.success) {
              throw new Error(`Falha no lock dinâmico: ${lockResult.error || 'Erro desconhecido'}`);
            }

            console.log(`[SentinelK -> IA Adapter] Confirmando reserva com o Lock ID ${lockResult.lockId}...`);
            const commitResult = await adapter.confirmBooking(lockResult.lockId);
            if (!commitResult.success) {
              throw new Error(`Falha no commit dinâmico: ${commitResult.error || 'Erro desconhecido'}`);
            }

            console.log(`[SentinelK <- IA Adapter] Emissão bem-sucedida! Voucher: ${commitResult.voucherCode}`);
            results.push({
              id: commitResult.voucherCode,
              partnerName: adapterDoc.partnerName,
              productName: item.name,
              qty: item.qty,
              date: item.date,
              voucher: commitResult.voucherCode,
              success: true
            });
          } else {
            console.warn(`[SentinelK] Nenhuma integração ativa encontrada para o provedor: ${item.provider}`);
          }
        } catch (error: any) {
          console.error(`[SentinelK] ERRO CRÍTICO no Adaptador dinâmico de ${item.provider}:`, error.message);
          throw new Error(`Falha no Sync Dinâmico (${item.provider}): ${error.message}`);
        }
      }
    }
    return results;
  }

  /**
   * Caso haja algum erro crítico pós-venda, SentinelK pode cancelar.
   */
  async rollbackPwiSale(saleId: number) {
    console.log(`[SentinelK -> PWI] Cancelando venda ${saleId} via API...`);
    await this.pwiDriver.cancelSale(saleId);
    console.log(`[SentinelK] Venda ${saleId} cancelada com sucesso.`);
  }

  // Formata os dados pro padrão que a API da PWI exige (PDF 1.0.20)
  private buildPwiSalePayload(item: CartItem, clientData: any) {
    return {
      TerminalVenda: "SISTEMA_MIDDLEWARE",
      Usuario: "SENTINEL_K",
      IdVendaOrigem: `MW_${Date.now().toString().slice(-8)}`,
      DataHoraVenda: new Date().toISOString().split('.')[0],
      NrDocumentoCliente: clientData.cpf,
      NomeCliente: clientData.name,
      EmailCliente: clientData.email,
      TelefoneCliente: clientData.phone,
      Itens: [
        {
          IdProduto: item.productId,
          Qtde: item.qty,
          DataPrevisaoVisita: item.date
        }
      ]
    };
  }

  // Formata os dados pro padrão que a API da Planne exige
  private buildPlanneSalePayload(item: CartItem, clientData: any) {
    const [firstName, ...lastNames] = (clientData.name || 'Cliente B2C').split(' ');
    
    const tariffs = item.tariffs 
      ? item.tariffs.map(t => ({ id: t.id, quantity: t.qty }))
      : [{ id: "DEFAULT_TARIFF", quantity: item.qty }];

    return {
      customer: {
        firstName: firstName,
        lastName: lastNames.join(' ') || 'Sobrenome',
        identifier: clientData.cpf,
        email: clientData.email,
        phone: clientData.phone
      },
      items: [{
        productId: item.productId,
        scheduleDate: item.date,
        ...(item.time && { scheduleTime: item.time }),
        tariffs: tariffs
      }],
      amountCents: Math.round((item.price || 0) * item.qty * 100),
      checks: {
        ignoreResources: true
      }
    };
  }
}
