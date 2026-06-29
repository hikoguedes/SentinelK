import { MercadoPagoConfig, Payment } from 'mercadopago';

export interface PixPaymentResponse {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
}

export class MercadoPagoDriver {
  private client: MercadoPagoConfig;
  private paymentClient: Payment;

  constructor() {
    // Usando o token real fornecido da conta 'Ana Paula Funke Porto' (Pescaria SUB)
    const accessToken = process.env.MP_ACCESS_TOKEN || 'APP_USR-533520416071697-061920-058ff5d0b1bc8c4eaaf293ec0cca0fd8-612550253';
    this.client = new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
    this.paymentClient = new Payment(this.client);
  }

  /**
   * Cria uma intenção de pagamento PIX no Mercado Pago
   */
  async createPixPayment(amount: number, description: string, email: string): Promise<PixPaymentResponse> {
    try {
      console.log(`[MercadoPago Driver] Gerando PIX no valor de R$ ${amount.toFixed(2)}...`);
      
      const body = {
        transaction_amount: amount,
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: email
        }
      };

      const response = await this.paymentClient.create({ body });

      if (response.point_of_interaction?.transaction_data) {
         return {
           paymentId: response.id!.toString(),
           qrCode: response.point_of_interaction.transaction_data.qr_code || '',
           qrCodeBase64: response.point_of_interaction.transaction_data.qr_code_base64 || '',
           ticketUrl: response.point_of_interaction.transaction_data.ticket_url || ''
         };
      }

      throw new Error('Retorno inesperado do Mercado Pago (sem dados de PIX).');
    } catch (error: any) {
      console.error('[MercadoPago Driver] Erro ao criar PIX:', error?.message || error);
      
      // FALLBACK PARA TESTES SEM TOKEN REAL
      // Se não temos um token real configurado, vamos gerar um QR Code Mock para permitir os testes de fluxo B2C
      if (!process.env.MP_ACCESS_TOKEN) {
         console.log('[MercadoPago Driver] FALLBACK: Usando Mock PIX (Token MP não configurado no .env).');
         return {
           paymentId: `MOCK_${Date.now()}`,
           qrCode: `00020101021126580014br.gov.bcb.pix0136mock@antigravity.com5204000053039865405${amount.toFixed(2)}5802BR5913ANTIGRAVITY6009SAO PAULO62070503***6304E1F4`,
           qrCodeBase64: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=MOCK_PIX_CODE_COPIA_E_COLA',
           ticketUrl: '#'
         };
      }
      throw new Error('Falha de conexão com o Gateway de Pagamento.');
    }
  }
}
