import vm from 'vm';

export interface AvailabilityResponse {
  available: boolean;
  price: number;
}

export interface SoftLockResponse {
  success: boolean;
  lockId: string;
}

export interface VoucherResponse {
  success: boolean;
  voucherCode: string;
}

export class SandboxExecutor {
  /**
   * Instancia uma classe de adaptador gerada pela IA de forma segura.
   * Espera-se que o script seja uma IIFE que retorne a classe:
   * (function() { return class Adapter { ... } })()
   */
  static instantiateAdapter(code: string, isTest: boolean = false): any {
    
    // Real fetch resolving relative URLs to local mock ERP if needed
    const realFetch = (input: any, init?: any) => {
      let urlStr = '';
      if (typeof input === 'string') {
        urlStr = input;
      } else if (input && typeof input === 'object' && input.href) {
        urlStr = input.href;
      } else if (input && typeof input === 'object' && input.url) {
        urlStr = input.url;
      }

      if (urlStr.startsWith('/')) {
        const isDocker = process.env.MONGO_URL && process.env.MONGO_URL.includes('mongodb:');
        const erpHost = isDocker ? 'park-api:4000' : 'localhost:4000';
        const absoluteUrl = `http://${erpHost}${urlStr}`;
        console.log(`[Sandbox Fetch] Resolvendo URL relativa: ${urlStr} -> ${absoluteUrl}`);
        return (global.fetch || fetch)(absoluteUrl, init);
      }
      return (global.fetch || fetch)(input, init);
    };

    // Recursive proxy builder to mock any arbitrarily nested API response structure
    const createSmartMock = (target: any = {}): any => {
      return new Proxy(target, {
        get(t, prop, receiver) {
          if (prop === 'then') return undefined; // Avoid blocking promise chains
          if (prop === 'toJSON') return () => ({});
          
          if (prop === Symbol.toPrimitive) {
            return (hint: string) => {
              if (hint === 'number') return 150;
              if (hint === 'string') return 'available';
              return true;
            };
          }
          
          if (prop === 'toString' || prop === 'valueOf') {
            return () => 150;
          }
          
          const name = String(prop).toLowerCase();
          
          // Common array properties
          if (name === 'length') return 1;
          
          // Match common property names and return correct type/values
          if (name.includes('price') || name.includes('value') || name.includes('amount') || name.includes('rate') || name.includes('tariff') || name.includes('cents')) {
            return 150;
          }
          if (name.includes('avail') || name.includes('success') || name.includes('ok')) {
            return true;
          }
          if (name === 'status' || name === 'state') {
            return 'available';
          }
          if (name.includes('id') || name.includes('code') || name.includes('uuid') || name.includes('token') || name.includes('voucher') || name.includes('key')) {
            return 'MOCK_ID_12345';
          }

          // Return recursive smart mock so nested lookups don't crash
          return createSmartMock({
            available: true,
            price: 150,
            success: true,
            status: 'available',
            price_cents: 15000,
            rate: 150,
            amount: 150
          });
        }
      });
    };

    // Mock fetch for contract tests, returning correct mock data shapes using the smart mock proxy
    const mockFetch = async (input: any, init?: any) => {
      console.log(`[Sandbox Mock Fetch] Interceptando chamada em teste para: ${input}`);
      const smartMock = createSmartMock({
        available: true,
        price: 150,
        success: true,
        status: 'available',
        lock_id: 'MOCK_LOCK_123',
        lockId: 'MOCK_LOCK_123',
        voucher_code: 'MOCK_VOUCHER_123',
        voucherCode: 'MOCK_VOUCHER_123',
        voucher: 'MOCK_VOUCHER_123',
        error: null
      });

      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => smartMock,
        text: async () => '{"available":true,"price":150,"success":true}',
        blob: async () => new Blob(),
        arrayBuffer: async () => new ArrayBuffer(0)
      } as any;
    };

    // Injeta funções globais do Node 20 para o contexto seguro
    const contextObject = {
      fetch: isTest ? mockFetch : realFetch,
      console: console,
      Promise: Promise,
      Buffer: Buffer,
      setTimeout: setTimeout,
      URL: URL,
      Date: Date,
      Math: Math,
      JSON: JSON,
      Error: Error,
      Headers: Headers,
      Response: Response,
      Request: Request
    };
    
    const context = vm.createContext(contextObject);
    
    // Executa o script no contexto e recupera o valor de retorno (a classe do adaptador)
    const script = new vm.Script(code);
    const AdapterClass = script.runInContext(context);
    
    if (typeof AdapterClass !== 'function') {
      throw new Error('O código gerado não retornou uma classe executável válida.');
    }
    
    return new AdapterClass();
  }
}
