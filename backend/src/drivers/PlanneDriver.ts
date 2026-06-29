export interface PlanneConfig {
  clientId: string;
  clientSecret: string;
  isProd: boolean;
  atributo: string;
}

export class PlanneDriver {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private atributo: string;

  constructor(config: PlanneConfig) {
    this.baseUrl = config.isProd ? 'https://seller-api.planne.com.br' : 'https://staging-seller-api.planne.com.br';
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.atributo = config.atributo;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Client-Id': this.clientId,
      'X-Client-Secret': this.clientSecret,
      'Accept': '*/*'
    };
  }

  /**
   * Lista todos os produtos da Cervejaria Farol na Planne
   */
  async listProducts() {
    const response = await fetch(`${this.baseUrl}/1/apps/own/products`, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao listar produtos Planne: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Verifica a disponibilidade de um produto em uma data/horário
   */
  async checkAvailability(productId: string, since: string, until: string) {
    const url = `${this.baseUrl}/1/products/${productId}/detailedSchedulings?since=${since}&until=${until}&include=finalTariffGroup.tariffs.type`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao verificar disponibilidade Planne: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Cria uma venda externa (Commit) no sistema da Planne
   */
  async createExternalSale(salePayload: any) {
    // Garante que o atributo obrigatório (ex: unycopass) esteja presente
    if (!salePayload.attributes) {
      salePayload.attributes = [this.atributo];
    } else if (!salePayload.attributes.includes(this.atributo)) {
      salePayload.attributes.push(this.atributo);
    }

    const response = await fetch(`${this.baseUrl}/1/apps/own/externalSales`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(salePayload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Erro ao criar venda Planne: ${response.status} - ${errorData}`);
    }

    return await response.json();
  }
}
