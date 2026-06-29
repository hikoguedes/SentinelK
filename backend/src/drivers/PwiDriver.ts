export class PwiDriver {
  // host.docker.internal faz o container do Middleware achar o container do Parque na sua máquina
  private baseUrl = 'http://host.docker.internal:4000/api/pwi';

  async lockAvailability(externalCode: string, quantity: number) {
    const response = await fetch(`${this.baseUrl}/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ external_code: externalCode, qty: quantity })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || 'Erro ao travar vaga no Parque');
    
    return data.transaction_id;
  }

  async confirmBooking(transactionId: string) {
    const response = await fetch(`${this.baseUrl}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction_id: transactionId })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Erro ao confirmar venda no Parque');
    
    return data; // Retorna ticket_barcode e qr_code_base64
  }
}
