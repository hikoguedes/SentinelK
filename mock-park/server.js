const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

// Banco de dados SQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'rootpassword',
  database: process.env.DB_NAME || 'park_erp'
};

// Teste de sanidade da API do Parque
app.get('/api/health', (req, res) => res.send('Park ERP API Online e Conectada'));

// Endpoint 1: Bloquear Vaga (Soft Lock) -> O Middleware chama isso antes de cobrar
app.post('/api/pwi/lock', async (req, res) => {
  try {
    const { external_code, qty } = req.body;
    const db = await mysql.createConnection(dbConfig);
    
    const [rows] = await db.execute('SELECT * FROM inventory WHERE external_code = ?', [external_code]);
    if (rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado no sistema do Parque' });
    
    const product = rows[0];
    const available = product.total_capacity - product.sold - product.locked;
    
    if (available < qty) {
      return res.status(400).json({ status: 'SOLD_OUT', message: 'Sem vagas suficientes no parque' });
    }

    // Trava a vaga
    await db.execute('UPDATE inventory SET locked = locked + ? WHERE id = ?', [qty, product.id]);
    
    const lockId = crypto.randomUUID();
    await db.execute('INSERT INTO reservations (lock_id, external_code, status) VALUES (?, ?, ?)', [lockId, external_code, 'LOCKED']);
    
    res.json({ status: 'LOCKED', transaction_id: lockId });
    await db.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 2: Confirmar Venda (Commit) e Gerar Ingresso -> O Middleware chama após o PIX
app.post('/api/pwi/commit', async (req, res) => {
  try {
    const { transaction_id } = req.body;
    const db = await mysql.createConnection(dbConfig);
    
    const [rows] = await db.execute('SELECT * FROM reservations WHERE lock_id = ? AND status = "LOCKED"', [transaction_id]);
    if (rows.length === 0) return res.status(400).json({ error: 'Lock inválido ou já faturado' });
    
    const reservation = rows[0];
    const barcode = 'PARK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Atualiza banco do Parque
    await db.execute('UPDATE reservations SET status = "COMMITTED", ticket_barcode = ? WHERE lock_id = ?', [barcode, transaction_id]);
    
    // Transforma lock em venda oficial
    await db.execute('UPDATE inventory SET locked = locked - 1, sold = sold + 1 WHERE external_code = ?', [reservation.external_code]);
    
    // Gera Imagem Base64 do QR Code oficial do parque
    const qrCodeData = await qrcode.toDataURL(barcode);

    res.json({ status: 'COMMITTED', ticket_barcode: barcode, qr_code_base64: qrCodeData });
    await db.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Painel Visual do Parque (Admin Dashboard)
app.get('/admin', async (req, res) => {
  try {
    const db = await mysql.createConnection(dbConfig);
    const [inventory] = await db.execute('SELECT * FROM inventory');
    const [reservations] = await db.execute('SELECT * FROM reservations ORDER BY id DESC LIMIT 10');
    await db.end();

    let html = `
      <html>
      <head>
        <title>Painel do Parque (ERP Fictício)</title>
        <meta http-equiv="refresh" content="2"> <!-- Auto-atualiza a cada 2 seg -->
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #eef2f5; padding: 40px; color: #333; }
          .card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
          th { background: #f8fafc; color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 0.8rem; }
          .locked { color: #f59e0b; font-weight: bold; background: #fef3c7; padding: 4px 8px; border-radius: 4px; }
          .committed { color: #10b981; font-weight: bold; background: #d1fae5; padding: 4px 8px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>🎡 ERP Oficial do Parque (Sistema Falso PWI)</h1>
        <p style="color: #64748b; margin-bottom: 32px;">O Middleware (Porta 3333) está controlando este banco de dados remotamente. Esta tela atualiza sozinha a cada 2 segundos.</p>
        
        <div class="card">
          <h2 style="margin-top:0;">📦 Inventário Físico (Catraca)</h2>
          <table>
            <tr><th>Produto</th><th>Capacidade Total</th><th>Vendidos (Baixados)</th><th>Soft Locks (Carrinho)</th><th>Livre para Venda</th></tr>
            ${inventory.map(i => `<tr>
              <td><strong>${i.product_name}</strong> <br><small style="color:#94a3b8">${i.external_code}</small></td>
              <td>${i.total_capacity}</td>
              <td style="color: #10b981; font-weight: 600;">${i.sold}</td>
              <td class="locked">${i.locked}</td>
              <td style="font-weight: bold;">${i.total_capacity - i.sold - i.locked}</td>
            </tr>`).join('')}
          </table>
        </div>

        <div class="card">
          <h2 style="margin-top:0;">🎟️ Últimas Emissões (Ingressos)</h2>
          <table>
            <tr><th>Transaction / Lock ID</th><th>Status do Pedido</th><th>Código de Catraca Gerado</th></tr>
            ${reservations.map(r => `<tr>
              <td style="font-family: monospace; color: #64748b;">${r.lock_id}</td>
              <td><span class="${r.status.toLowerCase()}">${r.status}</span></td>
              <td style="font-family: monospace; font-size: 1.1rem; color: #0f172a;">${r.ticket_barcode || 'Aguardando Pagamento...'}</td>
            </tr>`).join('')}
          </table>
        </div>
      </body>
      </html>
    `;
    res.send(html);
  } catch (error) {
    res.status(500).send("Erro ao carregar banco: " + error.message);
  }
});

app.listen(4000, () => console.log('Mock Park ERP API rodando na porta 4000'));
