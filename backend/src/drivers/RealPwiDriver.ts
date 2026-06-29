import axios from 'axios';

export interface PwiConfig {
  cnpj: string;
  senha: string;
  isProd: boolean;
  cliente: string; // ex: 'snowland', 'alianca'
}

export class RealPwiDriver {
  private baseUrl: string;
  private token: string | null = null;
  private config: PwiConfig;

  constructor(config: PwiConfig) {
    this.config = config;
    if (config.cliente === 'pwi_teste') {
      this.baseUrl = 'https://apivendas.pwi.com.br/prod/api';
    } else {
      const env = config.isProd ? 'prod' : 'hom';
      this.baseUrl = `https://api.${config.cliente}.com.br/${env}/api`;
    }
  }

  private async authenticate() {
    if (this.token) return;

    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        USUARIO: this.config.cnpj,
        SENHA: this.config.senha
      });

      if (response.data && response.data.result && response.data.result.access_token) {
        this.token = response.data.result.access_token;
      } else {
        throw new Error('Falha ao obter token da PWI.');
      }
    } catch (error: any) {
      console.error('[PWI Driver] Erro de Autenticação:', error?.response?.data || error.message);
      throw new Error('Erro ao autenticar na PWI');
    }
  }

  private async getHeaders() {
    await this.authenticate();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${this.token}`
    };
  }

  async checkAvailability(productId: string, dataInicio: string, dataFim: string) {
    const headers = await this.getHeaders();
    try {
      const response = await axios.get(`${this.baseUrl}/produto/listaSessoes`, {
        headers,
        params: {
          IdProduto: productId,
          DataInicio: dataInicio,
          DataFim: dataFim
        }
      });
      return response.data.result;
    } catch (error: any) {
      const errData = error?.response?.data;
      // Tratamento para o erro bizarro 500 da PWI quando não há sessões cadastradas no Sandbox
      if (errData && errData.errors && errData.errors.includes("Não foram encontradas sessões para o produto e período informados.")) {
        if (this.config.cliente === 'pwi_teste') {
          console.log('[PWI Driver] Ambiente de Teste: Simulando 100 vagas falsas para prosseguir com a compra...');
          return [{ idSessao: 9999, qtDisponivel: 100 }];
        }
        return []; // Em produção, apenas retorna vazio (esgotado) ao invés de explodir 500
      }
      
      console.error('[PWI Driver] Erro ao checar disponibilidade:', errData || error.message);
      throw new Error(`PWI Erro 500 na Sessão: ${JSON.stringify(errData || error.message)}`);
    }
  }

  // Novo método para buscar o catálogo de produtos disponíveis na PWI
  async listProducts() {
    const headers = await this.getHeaders();
    try {
      const response = await axios.get(`${this.baseUrl}/produto/lista`, { headers });
      return response.data.result; // Array de produtos (ID, nome, preço, etc)
    } catch (error: any) {
      console.error('[PWI Driver] Erro ao listar produtos:', error?.response?.data || error.message);
      throw error;
    }
  }

  // Na PWI, como não há endpoint de "lock", o incluir já gera os ingressos.
  // Faremos a venda e, se falhar depois no Sentinel, chamamos o cancelar.
  async createSale(saleData: any) {
    const headers = await this.getHeaders();
    try {
      const response = await axios.post(`${this.baseUrl}/venda/incluir`, saleData, { headers });
      if (response.data.errors && response.data.errors.length > 0) {
         throw new Error(JSON.stringify(response.data.errors));
      }
      return response.data.result; // Retorna id, codigoVenda, ingressos, etc.
    } catch (error: any) {
      const errData = error?.response?.data || error.message;
      
      // Se estamos no ambiente de testes e a PWI recusar por causa do estoque vazio deles
      if (this.config.cliente === 'pwi_teste' && errData && JSON.stringify(errData).includes("indiponível")) {
        console.log('[PWI Driver] Ambiente de Teste: Produto indisponível na base da PWI. Forçando sucesso da venda para simulação!');
        return {
          id: 999999,
          codigoVenda: "MW-TESTE-SUCESSO",
          ingressos: [
            {
              id: 77777,
              numeroItem: 1,
              numeroPassaporte: 1234567890123,
              digitoPassaporte: 9,
              isPassaporte: false,
              qtMultiplo: 1
            }
          ]
        };
      }

      console.error('[PWI Driver] Erro ao criar venda:', errData);
      throw new Error(`PWI Erro na Venda: ${JSON.stringify(errData)}`);
    }
  }

  async cancelSale(saleId: number) {
    const headers = await this.getHeaders();
    try {
      const response = await axios.put(`${this.baseUrl}/venda/cancelar/${saleId}`, {}, { headers });
      return response.data.result;
    } catch (error: any) {
      console.error('[PWI Driver] Erro ao cancelar venda:', error?.response?.data || error.message);
      throw error;
    }
  }
}
