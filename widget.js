(function () {
  // 1. Identificar o token do parceiro a partir da tag script
  const currentScript = document.currentScript || document.querySelector('script[data-token], script[data-partner-id]');
  const partnerId = currentScript ? (currentScript.getAttribute('data-token') || currentScript.getAttribute('data-partner-id')) : null;

  if (!partnerId) {
    console.error('[SentinelK Widget] Token ou partnerId não configurado na tag <script>. Use data-token="PART-xyz".');
    return;
  }

  // 2. Auto-detectar URL do backend com base no src do script
  let apiHost = 'http://localhost:3333/api';
  if (currentScript && currentScript.src) {
    try {
      const url = new URL(currentScript.src);
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        // Se estiver rodando na EC2 ou outro domínio
        apiHost = `${url.protocol}//${url.hostname}:3333/api`;
      }
    } catch (e) {
      console.warn('[SentinelK Widget] Falha ao parsear URL do script, usando localhost como fallback.');
    }
  }

  console.log(`[SentinelK Widget] Inicializado como canal de distribuição para o parceiro ${partnerId}. Conectando à API: ${apiHost}`);

  // 3. Criar container do Widget e anexar o Shadow DOM
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'sk-widget-root';
  document.body.appendChild(widgetContainer);

  const shadow = widgetContainer.attachShadow({ mode: 'closed' });

  // 4. Injetar Estilos CSS dentro do Shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    :host {
      --bg-main: #f8fafc;
      --bg-card: #ffffff;
      --bg-hover: #f1f5f9;
      --border-light: #e2e8f0;
      --accent-purple: #7c3aed;
      --accent-purple-hover: #6d28d9;
      --accent-purple-glow: rgba(124, 58, 237, 0.12);
      --accent-green: #10b981;
      --accent-green-glow: rgba(16, 185, 129, 0.15);
      --accent-orange: #f97316;
      --accent-blue: #3b82f6;
      --text-dark: #0f172a;
      --text-muted: #64748b;
      --text-blue: #2563eb;
      --bg-blue-light: #eff6ff;
      --font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Botão Flutuante */
    .sk-floating-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, var(--accent-purple), #6366f1);
      color: white;
      border: none;
      border-radius: 50px;
      padding: 14px 26px;
      font-family: var(--font-family);
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 10px 25px rgba(124, 58, 237, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 999999;
    }
    .sk-floating-btn:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 15px 30px rgba(124, 58, 237, 0.45);
    }
    .sk-floating-btn svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.5;
    }

    /* Modal Overlay */
    .sk-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      font-family: var(--font-family);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .sk-overlay.active {
      display: flex;
      opacity: 1;
    }

    /* Modal Body */
    .sk-modal {
      background: var(--bg-main);
      border: 1px solid var(--border-light);
      border-radius: 20px;
      width: 100%;
      max-width: 1000px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03);
      color: var(--text-dark);
      display: flex;
      flex-direction: column;
      transform: scale(0.95);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      position: relative;
    }
    .sk-overlay.active .sk-modal {
      transform: scale(1);
    }

    /* Header */
    .sk-header {
      padding: 16px 24px;
      border-bottom: 1px solid var(--border-light);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
    }
    .sk-header h3 {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-dark);
    }
    .sk-close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
      border-radius: 50%;
      transition: all 0.2s;
    }
    .sk-close-btn:hover {
      background: var(--bg-hover);
      color: var(--text-dark);
    }
    .sk-close-btn svg {
      width: 18px;
      height: 18px;
    }

    /* Content wrapper */
    .sk-body {
      padding: 24px;
      flex: 1;
      display: flex;
      flex-direction: column;
      background: var(--bg-main);
    }

    /* Storefront Header */
    .sk-storefront-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .sk-storefront-title-area {
      flex: 1;
      min-width: 280px;
    }
    .sk-storefront-title {
      font-size: 1.65rem;
      font-weight: 800;
      color: var(--text-dark);
      margin-bottom: 4px;
    }
    .sk-storefront-subtitle {
      font-size: 0.9rem;
      color: var(--text-muted);
      line-height: 1.45;
    }

    /* Global Date Picker Container */
    .sk-global-date-container {
      position: relative;
    }
    .sk-global-date-btn {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 12px;
      padding: 10px 16px;
      font-family: var(--font-family);
      font-weight: 600;
      font-size: 0.88rem;
      color: var(--text-dark);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      transition: all 0.2s;
    }
    .sk-global-date-btn:hover {
      border-color: var(--accent-purple);
      background: var(--bg-hover);
    }
    .sk-global-date-btn svg {
      width: 16px;
      height: 16px;
      color: var(--accent-purple);
      stroke-width: 2;
    }

    .sk-global-calendar-popover {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      z-index: 1000;
      width: 300px;
      display: none;
    }
    .sk-global-calendar-popover.active {
      display: block;
    }

    /* Category pills (Abas) */
    .sk-pills {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 8px;
      margin-bottom: 24px;
      scrollbar-width: none;
    }
    .sk-pills::-webkit-scrollbar {
      display: none;
    }
    .sk-pill {
      background: #ffffff;
      border: 1px solid var(--border-light);
      color: var(--text-dark);
      padding: 8px 16px;
      border-radius: 30px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.01);
    }
    .sk-pill:hover {
      border-color: var(--accent-purple);
      background: var(--bg-hover);
    }
    .sk-pill.active {
      background: var(--accent-purple);
      color: white;
      border-color: var(--accent-purple);
      box-shadow: 0 4px 12px var(--accent-purple-glow);
    }
    .sk-pill svg {
      width: 14px;
      height: 14px;
      stroke-width: 2.2;
    }

    /* Product Grid layout (Estilo Vitrine) */
    .sk-product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
    }
    .sk-product-card {
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    .sk-product-card:hover {
      border-color: var(--accent-purple);
      transform: translateY(-5px);
      box-shadow: 0 12px 20px -5px rgba(0,0,0,0.06), 0 8px 8px -6px rgba(0,0,0,0.02);
    }
    .sk-product-img-wrapper {
      position: relative;
      height: 140px;
      background: #e2e8f0;
      overflow: hidden;
    }
    .sk-product-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .sk-product-card:hover .sk-product-thumb {
      transform: scale(1.04);
    }
    .sk-product-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      background: #ffffff;
      border: 1px solid var(--border-light);
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-dark);
      display: flex;
      align-items: center;
      gap: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
      z-index: 5;
    }
    .sk-product-badge svg {
      width: 12px;
      height: 12px;
      stroke-width: 2.2;
    }
    .sk-product-badge.pwi svg { color: var(--accent-blue); }
    .sk-product-badge.planne svg { color: var(--accent-green); }
    .sk-product-badge.hotel svg { color: var(--accent-orange); }
    .sk-product-badge.gastronomia svg { color: #db2777; }
    .sk-product-badge.ia svg { color: var(--accent-purple); }

    .sk-product-info {
      padding: 16px;
      display: flex;
      flex-direction: column;
      flex: 1;
      gap: 8px;
    }
    .sk-product-code-badge {
      align-self: flex-start;
      background: var(--bg-blue-light);
      color: var(--text-blue);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
    .sk-product-name {
      font-weight: 800;
      font-size: 1.02rem;
      color: var(--text-dark);
      line-height: 1.35;
      text-transform: uppercase;
    }
    .sk-product-desc {
      font-size: 0.8rem;
      color: var(--text-muted);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }
    .sk-product-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--border-light);
      padding-top: 12px;
      margin-top: 8px;
    }
    .sk-product-price {
      font-weight: 800;
      color: var(--text-dark);
      font-size: 1.15rem;
    }
    
    .sk-product-btn {
      background: var(--accent-purple);
      color: #ffffff;
      border: none;
      padding: 8px 12px 8px 14px;
      border-radius: 8px;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sk-product-btn:hover {
      background: var(--accent-purple-hover);
      box-shadow: 0 4px 8px var(--accent-purple-glow);
    }
    .sk-product-btn-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.18);
      border-radius: 50%;
      width: 16px;
      height: 16px;
    }
    .sk-product-btn-icon svg {
      width: 10px;
      height: 10px;
      stroke: #ffffff;
      stroke-width: 3.5;
      fill: none;
    }

    /* Split layout (Layout das etapas de reserva) */
    .sk-split-layout {
      display: grid;
      grid-template-columns: 1.1fr 1.3fr;
      gap: 28px;
      background: #ffffff;
      border-radius: 16px;
      padding: 8px;
    }
    @media (max-width: 768px) {
      .sk-split-layout {
        grid-template-columns: 1fr;
      }
    }
    .sk-split-left {
      border-right: 1px solid var(--border-light);
      padding-right: 24px;
    }
    @media (max-width: 768px) {
      .sk-split-left {
        border-right: none;
        padding-right: 0;
        border-bottom: 1px solid var(--border-light);
        padding-bottom: 20px;
      }
    }

    /* Custom Grid Calendar */
    .sk-calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .sk-calendar-month {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--text-dark);
    }
    .sk-calendar-nav-btn {
      background: #ffffff;
      border: 1px solid var(--border-light);
      color: var(--text-dark);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .sk-calendar-nav-btn:hover {
      border-color: var(--accent-purple);
      background: var(--bg-hover);
    }
    .sk-calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .sk-calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
    }
    .sk-calendar-day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.82rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      color: var(--text-dark);
      transition: all 0.15s;
      background: #ffffff;
    }
    .sk-calendar-day:hover:not(.disabled):not(.selected) {
      background: var(--bg-hover);
      color: var(--accent-purple);
    }
    .sk-calendar-day.disabled {
      color: #cbd5e1;
      background: #f8fafc;
      cursor: not-allowed;
    }
    .sk-calendar-day.selected {
      background: var(--accent-purple);
      color: white;
      font-weight: bold;
      box-shadow: 0 4px 10px var(--accent-purple-glow);
    }
    .sk-calendar-day.today:not(.selected) {
      border-color: var(--accent-purple);
      color: var(--accent-purple);
      font-weight: 700;
    }

    /* Qty Selector */
    .sk-qty-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 12px;
      padding: 14px 18px;
      margin-top: 16px;
    }
    .sk-qty-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .sk-qty-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid var(--border-light);
      background: #ffffff;
      color: var(--text-dark);
      font-size: 1.1rem;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .sk-qty-btn:hover {
      border-color: var(--accent-purple);
      color: var(--accent-purple);
      background: var(--bg-hover);
    }
    .sk-qty-val {
      font-weight: 700;
      font-size: 1rem;
      min-width: 20px;
      text-align: center;
    }

    /* Forms */
    .sk-form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }
    .sk-form-group label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sk-input {
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 10px;
      padding: 10px 14px;
      color: var(--text-dark);
      font-family: var(--font-family);
      font-size: 0.85rem;
      outline: none;
      transition: all 0.2s;
    }
    .sk-input:focus {
      border-color: var(--accent-purple);
      box-shadow: 0 0 0 3px var(--accent-purple-glow);
    }

    /* Buttons */
    .sk-btn-primary {
      background: linear-gradient(135deg, var(--accent-purple), #6366f1);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 14px 20px;
      font-family: var(--font-family);
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      margin-top: 16px;
      transition: all 0.2s;
      box-shadow: 0 4px 10px var(--accent-purple-glow);
    }
    .sk-btn-primary:hover {
      opacity: 0.95;
      transform: translateY(-1px);
    }
    .sk-btn-primary:disabled {
      background: #cbd5e1;
      color: #94a3b8;
      box-shadow: none;
      cursor: not-allowed;
    }

    .sk-btn-secondary {
      background: #ffffff;
      color: var(--text-muted);
      border: 1px solid var(--border-light);
      border-radius: 10px;
      padding: 12px;
      font-family: var(--font-family);
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      width: 100%;
      margin-top: 10px;
      text-align: center;
      transition: all 0.2s;
    }
    .sk-btn-secondary:hover {
      border-color: var(--accent-purple);
      color: var(--accent-purple);
      background: var(--bg-hover);
    }

    /* Payment Screen / PIX */
    .sk-pix-box {
      text-align: center;
      background: #ffffff;
      border: 1px solid var(--border-light);
      border-radius: 16px;
      padding: 20px;
    }
    .sk-qr-code {
      width: 170px;
      height: 170px;
      background: white;
      border: 1px solid var(--border-light);
      border-radius: 12px;
      padding: 10px;
      margin: 16px auto;
      display: block;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    }
    .sk-copia-cola-row {
      display: flex;
      gap: 8px;
      background: var(--bg-main);
      border: 1px solid var(--border-light);
      padding: 10px;
      border-radius: 8px;
      align-items: center;
      margin-bottom: 16px;
    }
    .sk-copia-cola-text {
      font-size: 0.75rem;
      font-family: monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      text-align: left;
      color: var(--text-muted);
    }
    .sk-copy-btn {
      background: var(--bg-blue-light);
      border: 1px solid rgba(37, 99, 235, 0.1);
      color: var(--text-blue);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: bold;
      cursor: pointer;
    }
    .sk-copy-btn:hover {
      background: #dbeafe;
    }

    /* Timer */
    .sk-timer-bar {
      background: rgba(249, 115, 22, 0.08);
      border: 1px solid rgba(249, 115, 22, 0.15);
      padding: 10px;
      border-radius: 8px;
      color: var(--accent-orange);
      font-size: 0.8rem;
      font-weight: bold;
      margin-bottom: 16px;
      text-align: center;
    }

    /* Ticket */
    .sk-ticket {
      border: 1px solid var(--border-light);
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      margin: 10px auto;
      max-width: 440px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
    }
    .sk-ticket-header {
      background: linear-gradient(135deg, var(--accent-purple), #6366f1);
      padding: 12px 18px;
      font-size: 0.75rem;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 0.1em;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sk-ticket-body {
      padding: 20px;
      text-align: left;
      background: #ffffff;
    }
    .sk-ticket-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 2px;
      font-weight: 700;
    }
    .sk-ticket-value {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-dark);
      margin-bottom: 12px;
    }
    .sk-ticket-divider {
      border-top: 2px dashed var(--border-light);
      margin: 16px 0;
      position: relative;
    }
    .sk-ticket-divider::before, .sk-ticket-divider::after {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
      background: var(--bg-main);
      border-radius: 50%;
      top: -8px;
      border: 1px solid var(--border-light);
    }
    .sk-ticket-divider::before { left: -28px; }
    .sk-ticket-divider::after { right: -28px; }

    /* Loading Spinner */
    .sk-spinner {
      border: 3px solid rgba(0,0,0,0.05);
      border-left-color: var(--accent-purple);
      border-radius: 50%;
      width: 32px;
      height: 32px;
      animation: sk-spin 1s linear infinite;
      margin: 40px auto;
    }
    @keyframes sk-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  shadow.appendChild(style);

  // 5. Estrutura HTML base do Modal
  const modalHTML = `
    <button class="sk-floating-btn" id="sk-trigger">
      <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
      Comprar Ingressos
    </button>

    <div class="sk-overlay" id="sk-overlay">
      <div class="sk-modal">
        <div class="sk-header">
          <h3 id="sk-modal-title">Experiências Disponíveis</h3>
          <button class="sk-close-btn" id="sk-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="sk-body" id="sk-modal-body">
          <!-- Conteúdo dinâmico aqui -->
        </div>
      </div>
    </div>
  `;

  // Se houver uma div #sentinelk-widget no site, vamos renderizar inline lá. Senão, adicionamos o botão flutuante.
  const inlineContainer = document.getElementById('sentinelk-widget');
  if (inlineContainer) {
    // Modo Inline
    const inlineHTML = `
      <div class="sk-modal" style="max-width: 100%; max-height: none; box-shadow: none; border-radius: 16px;">
        <div class="sk-header">
          <h3 id="sk-modal-title">Experiências Disponíveis</h3>
        </div>
        <div class="sk-body" id="sk-modal-body">
          <!-- Conteúdo dinâmico aqui -->
        </div>
      </div>
    `;
    shadow.innerHTML = `<style>${style.textContent}</style>${inlineHTML}`;
  } else {
    // Modo Flutuante
    const containerWrapper = document.createElement('div');
    containerWrapper.innerHTML = modalHTML;
    // Mover estilos e nós para o shadow root
    while (containerWrapper.firstChild) {
      shadow.appendChild(containerWrapper.firstChild);
    }
  }

  // Elementos do DOM dentro do Shadow DOM
  const overlay = shadow.getElementById('sk-overlay');
  const triggerBtn = shadow.getElementById('sk-trigger');
  const closeBtn = shadow.getElementById('sk-close');
  const bodyEl = shadow.getElementById('sk-modal-body');
  const titleEl = shadow.getElementById('sk-modal-title');

  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);

  // Estado interno do Widget
  let state = {
    products: [],
    filteredProducts: [],
    activeCategory: 'all',
    selectedProduct: null,
    selectedDate: todayDate,
    quantity: 1,
    clientName: '',
    clientEmail: '',
    clientCpf: '',
    clientPhone: '',
    orderId: null,
    pixData: null,
    calendarYear: todayDate.getFullYear(),
    calendarMonth: todayDate.getMonth(),
    timerInterval: null
  };

  // 6. Abrir e Fechar Modal (se estiver em modo flutuante)
  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => {
      overlay.classList.add('active');
      loadProducts();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
      clearInterval(state.timerInterval);
    });
  }

  // Se for inline, carrega imediatamente
  if (inlineContainer) {
    loadProducts();
  }

  // 7. Carregar Catálogo de Produtos do Parceiro
  async function loadProducts() {
    renderLoading();
    try {
      const res = await fetch(`${apiHost}/widget/products?partnerId=${partnerId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.products && data.products.length > 0) {
        state.products = data.products;
        state.filteredProducts = data.products;
        renderProductList();
      } else {
        const errorMsg = data.error || `Nenhum produto ativo encontrado para o parceiro "${partnerId}".`;
        renderError(errorMsg);
      }
    } catch (e) {
      console.error('[SentinelK Widget Error]', e);
      renderError(`Falha ao conectar com o middleware (${apiHost}). Verifique se o servidor está online e a porta 3333 liberada.`);
    }
  }

  // Renderizadores de estados fundamentais
  function renderLoading() {
    titleEl.innerText = "Carregando...";
    bodyEl.innerHTML = `<div class="sk-spinner"></div><p style="text-align: center; color: var(--text-muted); font-size: 0.85rem;">Sincronizando vitrine e ingressos em tempo real...</p>`;
  }

  function renderError(msg) {
    titleEl.innerText = "Erro";
    bodyEl.innerHTML = `
      <div style="text-align: center; padding: 20px 0;">
        <p style="color: var(--accent-orange); font-weight: bold; margin-bottom: 12px;">⚠️ Ops!</p>
        <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; margin-bottom: 16px;">${msg}</p>
        <button class="sk-btn-secondary" id="sk-retry-btn">Tentar Novamente</button>
      </div>
    `;
    shadow.getElementById('sk-retry-btn').addEventListener('click', loadProducts);
  }

  // 6.5. Funções Auxiliares de Ícones para Vitrine Claro
  function getCategorySvg(key) {
    switch(key) {
      case 'all':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
      case 'PWI':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M12 12h.01M17 12h.01M7 12h.01"></path></svg>`;
      case 'PLANNE':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"></path></svg>`;
      case 'hotel':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v18M6 12h4v10H6zM14 6h3v3h-3zM14 11h3v3h-3zM6 6h3v3H6z"></path></svg>`;
      case 'gastronomia':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
      case 'IA':
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4M8 16h.01M16 16h.01"></path></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
  }

  function getBadgeSvg(key) {
    switch(key) {
      case 'PWI':
        return `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M12 12h.01M17 12h.01M7 12h.01"></path></svg>`;
      case 'PLANNE':
        return `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"></path></svg>`;
      case 'hotel':
        return `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 21h18M3 7v14M21 7v14M6 14h3M6 10h3M15 14h3M15 10h3"></path></svg>`;
      case 'gastronomia':
        return `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
      case 'IA':
        return `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle></svg>`;
      default:
        return `<svg fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
  }

  // Ouvinte de clique fora para fechar o calendário global do topo
  document.addEventListener('click', (e) => {
    const path = e.composedPath();
    const btn = shadow.getElementById('sk-global-date-btn');
    const popover = shadow.getElementById('sk-global-calendar-popover');
    if (btn && popover) {
      if (!path.includes(btn) && !path.includes(popover)) {
        popover.classList.remove('active');
      }
    }
  });

  // Renderizador: Vitrine de Produtos (Storefront Layout)
  function renderProductList() {
    titleEl.innerText = "";
    if (closeBtn) {
      closeBtn.style.display = "flex";
      const headerEl = shadow.querySelector('.sk-header');
      if (headerEl) {
        headerEl.style.display = "flex";
        headerEl.style.borderBottom = "none";
      }
    }

    const formattedDate = state.selectedDate ? state.selectedDate.toLocaleDateString('pt-BR') : 'Selecione a data';

    // Categorias Únicas
    const categories = {
      all: 'Todos',
      PWI: 'Parques (PWI API)',
      PLANNE: 'Planne (Farol API)',
      hotel: 'Hotéis & Resorts',
      gastronomia: 'Gastronomia Local',
      IA: 'Integrações IA'
    };

    // Cabeçalho da vitrine idêntico ao mockup
    let headerHtml = `
      <div class="sk-storefront-header">
        <div class="sk-storefront-title-area">
          <h2 class="sk-storefront-title">Experiências Disponíveis</h2>
          <p class="sk-storefront-subtitle">Lotes integrados em tempo real com as catracas PWI e bancos de dados.</p>
        </div>
        <div class="sk-global-date-container">
          <button class="sk-global-date-btn" id="sk-global-date-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            Data da Utilização: ${formattedDate}
          </button>
          <div class="sk-global-calendar-popover" id="sk-global-calendar-popover">
            <div class="sk-calendar-header">
              <button class="sk-calendar-nav-btn" id="sk-gcal-prev">&lt;</button>
              <span class="sk-calendar-month" id="sk-gcal-title"></span>
              <button class="sk-calendar-nav-btn" id="sk-gcal-next">&gt;</button>
            </div>
            <div class="sk-calendar-weekdays">
              <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
            </div>
            <div class="sk-calendar-grid" id="sk-gcal-grid"></div>
          </div>
        </div>
      </div>
    `;

    // Filtros de Categorias
    let pillsHtml = '<div class="sk-pills">';
    Object.keys(categories).forEach(key => {
      const hasProd = key === 'all' || state.products.some(p => p.categoria === key);
      if (hasProd) {
        const activeClass = state.activeCategory === key ? 'active' : '';
        pillsHtml += `<span class="sk-pill ${activeClass}" data-cat="${key}">${getCategorySvg(key)} ${categories[key]}</span>`;
      }
    });
    pillsHtml += '</div>';

    // Grid de Cards
    let gridHtml = headerHtml + pillsHtml + '<div class="sk-product-grid">';
    
    // Filtrar Produtos
    state.filteredProducts = state.products.filter(p => {
      if (state.activeCategory === 'all') return true;
      return p.categoria === state.activeCategory;
    });

    state.filteredProducts.forEach((p, idx) => {
      const formattedPrice = parseFloat(p.preco).toFixed(2).replace('.', ',');
      const paddedId = String(p.id).padStart(6, '0');
      
      // Definição de Badges
      let badgeLabel = 'Local';
      let badgeClass = 'local';
      if (p.categoria === 'PWI') { badgeLabel = 'Estoque Real PWI'; badgeClass = 'pwi'; }
      else if (p.categoria === 'PLANNE') { badgeLabel = 'Farol API (Planne)'; badgeClass = 'planne'; }
      else if (p.categoria === 'hotel') { badgeLabel = 'Hotelaria'; badgeClass = 'hotel'; }
      else if (p.categoria === 'gastronomia') { badgeLabel = 'Restaurante'; badgeClass = 'gastronomia'; }
      else if (p.categoria === 'IA') { badgeLabel = 'Integração IA'; badgeClass = 'ia'; }

      gridHtml += `
        <div class="sk-product-card" data-id="${p.id}">
          <div class="sk-product-img-wrapper">
            <span class="sk-product-badge ${badgeClass}">
              ${getBadgeSvg(p.categoria)}
              ${badgeLabel}
            </span>
            <img class="sk-product-thumb" src="${p.imgUrl}" alt="${p.nome}" onerror="this.src='https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80'">
          </div>
          <div class="sk-product-info">
            <span class="sk-product-code-badge">Cod: ${paddedId}</span>
            <h4 class="sk-product-name">${p.nome}</h4>
            <p class="sk-product-desc">${p.descricao}</p>
            <div class="sk-product-footer">
              <span class="sk-product-price">R$ ${formattedPrice}</span>
              <button class="sk-product-btn">
                Comprar
                <span class="sk-product-btn-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    gridHtml += '</div>';
    bodyEl.innerHTML = gridHtml;

    // Evento de Toggle do Calendário Global
    const globalDateBtn = shadow.getElementById('sk-global-date-btn');
    const globalCalendarPopover = shadow.getElementById('sk-global-calendar-popover');
    if (globalDateBtn && globalCalendarPopover) {
      globalDateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        globalCalendarPopover.classList.toggle('active');
        if (globalCalendarPopover.classList.contains('active')) {
          buildGlobalCalendar();
        }
      });
    }

    // Eventos do Mês no Calendário Global do Topo
    const prevGcal = shadow.getElementById('sk-gcal-prev');
    const nextGcal = shadow.getElementById('sk-gcal-next');
    if (prevGcal && nextGcal) {
      prevGcal.addEventListener('click', (e) => {
        e.stopPropagation();
        state.calendarMonth--;
        if (state.calendarMonth < 0) {
          state.calendarMonth = 11;
          state.calendarYear--;
        }
        buildGlobalCalendar();
      });
      nextGcal.addEventListener('click', (e) => {
        e.stopPropagation();
        state.calendarMonth++;
        if (state.calendarMonth > 11) {
          state.calendarMonth = 0;
          state.calendarYear++;
        }
        buildGlobalCalendar();
      });
    }

    // Eventos das Pills
    shadow.querySelectorAll('.sk-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        state.activeCategory = pill.getAttribute('data-cat');
        renderProductList();
      });
    });

    // Eventos nos Cards para ir ao Checkout
    shadow.querySelectorAll('.sk-product-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        state.selectedProduct = state.products.find(p => p.id === id);
        renderDateAndQtySelection();
      });
    });
  }

  // Construtor do Calendário Global do Topo
  function buildGlobalCalendar() {
    const grid = shadow.getElementById('sk-gcal-grid');
    const calTitle = shadow.getElementById('sk-gcal-title');
    if (!grid || !calTitle) return;

    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    calTitle.innerText = `${months[state.calendarMonth]} ${state.calendarYear}`;

    const today = new Date();
    today.setHours(0,0,0,0);

    const firstDayIndex = new Date(state.calendarYear, state.calendarMonth, 1).getDay();
    const lastDay = new Date(state.calendarYear, state.calendarMonth + 1, 0).getDate();

    grid.innerHTML = '';

    for (let i = 0; i < firstDayIndex; i++) {
      const cell = document.createElement('div');
      cell.className = 'sk-calendar-day disabled';
      grid.appendChild(cell);
    }

    for (let day = 1; day <= lastDay; day++) {
      const cell = document.createElement('div');
      cell.className = 'sk-calendar-day';
      cell.innerText = day;

      const cellDate = new Date(state.calendarYear, state.calendarMonth, day);
      cellDate.setHours(0,0,0,0);

      if (cellDate < today) {
        cell.classList.add('disabled');
      } else {
        if (cellDate.getTime() === today.getTime()) {
          cell.classList.add('today');
        }

        if (state.selectedDate && cellDate.getTime() === state.selectedDate.getTime()) {
          cell.classList.add('selected');
        }

        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          state.selectedDate = cellDate;
          const popover = shadow.getElementById('sk-global-calendar-popover');
          if (popover) popover.classList.remove('active');
          renderProductList();
        });
      }
      grid.appendChild(cell);
    }
  }

  // Renderizador: Seleção de Data & Quantidade (Layout Split)
  function renderDateAndQtySelection() {
    titleEl.innerText = "Configurar Agendamento";
    if (closeBtn) closeBtn.style.display = "flex";

    const formattedPrice = parseFloat(state.selectedProduct.preco).toFixed(2).replace('.', ',');
    const totalPrice = (state.selectedProduct.preco * state.quantity).toFixed(2).replace('.', ',');
    const paddedId = String(state.selectedProduct.id).padStart(6, '0');

    bodyEl.innerHTML = `
      <div class="sk-split-layout">
        <!-- Coluna Esquerda: Ficha do Produto -->
        <div class="sk-split-left">
          <img style="width:100%; height:160px; object-fit:cover; border-radius:12px; margin-bottom:14px;" src="${state.selectedProduct.imgUrl}" alt="${state.selectedProduct.nome}">
          <h3 style="margin-bottom:8px; font-size:1.2rem; color: var(--text-dark);">${state.selectedProduct.nome}</h3>
          <p style="color:var(--text-muted); font-size:0.85rem; line-height:1.45; margin-bottom:14px;">${state.selectedProduct.descricao}</p>
          <span style="font-size:0.75rem; background: var(--bg-blue-light); padding:5px 10px; border-radius:6px; font-weight:bold; color: var(--text-blue);">Cod: ${paddedId}</span>
        </div>

        <!-- Coluna Direita: Lógica do Calendário -->
        <div>
          <h4 style="font-size:0.82rem; color:var(--text-muted); margin-bottom:12px; text-transform:uppercase; font-weight:700;">Data da Utilização:</h4>
          
          <!-- Calendário -->
          <div>
            <div class="sk-calendar-header">
              <button class="sk-calendar-nav-btn" id="sk-cal-prev">&lt;</button>
              <span class="sk-calendar-month" id="sk-cal-title">Mês Ano</span>
              <button class="sk-calendar-nav-btn" id="sk-cal-next">&gt;</button>
            </div>
            <div class="sk-calendar-weekdays">
              <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
            </div>
            <div class="sk-calendar-grid" id="sk-cal-grid"></div>
          </div>

          <!-- Qtd -->
          <div class="sk-qty-container">
            <div>
              <p style="font-weight: 700; font-size: 0.88rem; color: var(--text-dark);">Vagas/Ingressos</p>
              <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">R$ ${formattedPrice} un</p>
            </div>
            <div class="sk-qty-controls">
              <button class="sk-qty-btn" id="sk-qty-dec">-</button>
              <span class="sk-qty-val" id="sk-qty-display">${state.quantity}</span>
              <button class="sk-qty-btn" id="sk-qty-inc">+</button>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px;">
            <span style="font-size: 0.88rem; color: var(--text-muted); font-weight: 500;">Subtotal</span>
            <span style="font-size: 1.25rem; font-weight: 800; color: var(--text-dark);" id="sk-total-price">R$ ${totalPrice}</span>
          </div>

          <button class="sk-btn-primary" id="sk-next-btn" ${!state.selectedDate ? 'disabled' : ''}>
            Avançar para Dados
          </button>
          <button class="sk-btn-secondary" id="sk-back-btn">Voltar à Vitrine</button>
        </div>
      </div>
    `;

    // Eventos da quantidade
    shadow.getElementById('sk-qty-dec').addEventListener('click', () => {
      if (state.quantity > 1) {
        state.quantity--;
        updateQtyDisplay();
      }
    });
    shadow.getElementById('sk-qty-inc').addEventListener('click', () => {
      state.quantity++;
      updateQtyDisplay();
    });

    // Calendário nav
    shadow.getElementById('sk-cal-prev').addEventListener('click', () => {
      state.calendarMonth--;
      if (state.calendarMonth < 0) {
        state.calendarMonth = 11;
        state.calendarYear--;
      }
      buildCalendar();
    });

    shadow.getElementById('sk-cal-next').addEventListener('click', () => {
      state.calendarMonth++;
      if (state.calendarMonth > 11) {
        state.calendarMonth = 0;
        state.calendarYear++;
      }
      buildCalendar();
    });

    // Botão avançar/voltar
    shadow.getElementById('sk-next-btn').addEventListener('click', renderIdentificationForm);
    shadow.getElementById('sk-back-btn').addEventListener('click', renderProductList);

    buildCalendar();
  }

  function updateQtyDisplay() {
    shadow.getElementById('sk-qty-display').innerText = state.quantity;
    const totalPrice = (state.selectedProduct.preco * state.quantity).toFixed(2).replace('.', ',');
    shadow.getElementById('sk-total-price').innerText = `R$ ${totalPrice}`;
  }

  // Construtor do Calendário
  function buildCalendar() {
    const grid = shadow.getElementById('sk-cal-grid');
    const calTitle = shadow.getElementById('sk-cal-title');
    const nextBtn = shadow.getElementById('sk-next-btn');

    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    calTitle.innerText = `${months[state.calendarMonth]} de ${state.calendarYear}`;

    const today = new Date();
    today.setHours(0,0,0,0);

    const firstDayIndex = new Date(state.calendarYear, state.calendarMonth, 1).getDay();
    const lastDay = new Date(state.calendarYear, state.calendarMonth + 1, 0).getDate();

    grid.innerHTML = '';

    for (let i = 0; i < firstDayIndex; i++) {
      const cell = document.createElement('div');
      cell.className = 'sk-calendar-day disabled';
      grid.appendChild(cell);
    }

    for (let day = 1; day <= lastDay; day++) {
      const cell = document.createElement('div');
      cell.className = 'sk-calendar-day';
      cell.innerText = day;

      const cellDate = new Date(state.calendarYear, state.calendarMonth, day);
      cellDate.setHours(0,0,0,0);

      if (cellDate < today) {
        cell.classList.add('disabled');
      } else {
        if (cellDate.getTime() === today.getTime()) {
          cell.classList.add('today');
        }

        if (state.selectedDate && cellDate.getTime() === state.selectedDate.getTime()) {
          cell.classList.add('selected');
        }

        cell.addEventListener('click', () => {
          state.selectedDate = cellDate;
          shadow.querySelectorAll('.sk-calendar-day').forEach(d => d.classList.remove('selected'));
          cell.classList.add('selected');
          nextBtn.removeAttribute('disabled');
        });
      }
      grid.appendChild(cell);
    }
  }

  // Renderizador: Formulário de Identificação (Split Layout)
  function renderIdentificationForm() {
    titleEl.innerText = "Finalizar Cadastro";

    const formattedDate = state.selectedDate.toLocaleDateString('pt-BR');
    const totalPrice = (state.selectedProduct.preco * state.quantity).toFixed(2).replace('.', ',');

    bodyEl.innerHTML = `
      <div class="sk-split-layout">
        <!-- Coluna Esquerda: Resumo da Reserva -->
        <div class="sk-split-left" style="display:flex; flex-direction:column; gap:16px;">
          <h4 style="font-size:0.82rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Resumo da Reserva</h4>
          
          <div style="background:#ffffff; border:1px solid var(--border-light); padding:16px; border-radius:12px; display:flex; flex-direction:column; gap:10px; color: var(--text-dark);">
            <p><strong>Experiência:</strong><br><span style="color:var(--text-muted); font-size:0.9rem;">${state.selectedProduct.nome}</span></p>
            <p><strong>Data de Utilização:</strong><br><span style="color:var(--accent-purple); font-size:0.9rem; font-weight:bold;">${formattedDate}</span></p>
            <p><strong>Quantidade:</strong><br><span style="color:var(--text-muted); font-size:0.9rem;">${state.quantity}x ingressos</span></p>
            <div style="border-top:1px solid var(--border-light); padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
              <span>Total a pagar</span>
              <strong style="color:var(--accent-green); font-size:1.15rem;">R$ ${totalPrice}</strong>
            </div>
          </div>
        </div>

        <!-- Coluna Direita: Formulário de Contato -->
        <div>
          <div class="sk-form-group">
            <label for="sk-name">Nome Completo</label>
            <input type="text" class="sk-input" id="sk-name" placeholder="Ex: João da Silva" value="${state.clientName}">
          </div>

          <div class="sk-form-group">
            <label for="sk-email">E-mail</label>
            <input type="email" class="sk-input" id="sk-email" placeholder="Ex: joao@email.com" value="${state.clientEmail}">
          </div>

          <div class="sk-form-group">
            <label for="sk-cpf">CPF</label>
            <input type="text" class="sk-input" id="sk-cpf" placeholder="000.000.000-00" value="${state.clientCpf}">
          </div>

          <div class="sk-form-group">
            <label for="sk-phone">Celular</label>
            <input type="text" class="sk-input" id="sk-phone" placeholder="(00) 00000-0000" value="${state.clientPhone}">
          </div>

          <button class="sk-btn-primary" id="sk-reserve-btn">
            Reservar e Gerar PIX
          </button>
          <button class="sk-btn-secondary" id="sk-back-btn">Voltar</button>
        </div>
      </div>
    `;

    // Máscaras reativas
    const cpfInput = shadow.getElementById('sk-cpf');
    cpfInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, "");
      if (v.length > 11) v = v.substring(0, 11);
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d)/, "$1.$2");
      v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      e.target.value = v;
      state.clientCpf = v;
    });

    const phoneInput = shadow.getElementById('sk-phone');
    phoneInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, "");
      if (v.length > 11) v = v.substring(0, 11);
      v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
      v = v.replace(/(\d{5})(\d)/, "$1-$2");
      e.target.value = v;
      state.clientPhone = v;
    });

    // Inputs padrão
    shadow.getElementById('sk-name').addEventListener('input', (e) => { state.clientName = e.target.value; });
    shadow.getElementById('sk-email').addEventListener('input', (e) => { state.clientEmail = e.target.value; });

    // Ações dos botões
    shadow.getElementById('sk-reserve-btn').addEventListener('click', executeCheckout);
    shadow.getElementById('sk-back-btn').addEventListener('click', renderDateAndQtySelection);
  }

  // Execução do Checkout: Enviar dados e obter o PIX
  async function executeCheckout() {
    if (!state.clientName || !state.clientEmail || !state.clientCpf) {
      alert("Por favor, preencha os campos obrigatórios (Nome, E-mail e CPF).");
      return;
    }

    const btn = shadow.getElementById('sk-reserve-btn');
    btn.innerHTML = `<span class="sk-spinner" style="width: 14px; height: 14px; margin: 0; display: inline-block; vertical-align: middle;"></span> Criando Reserva...`;
    btn.disabled = true;

    // Formatar data local em YYYY-MM-DD
    const tzoffset = state.selectedDate.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(state.selectedDate.getTime() - tzoffset)).toISOString().split('T')[0];

    const cart = [{
      provider: state.selectedProduct.categoria || 'STATIC',
      productId: state.selectedProduct.id,
      qty: state.quantity,
      price: state.selectedProduct.preco,
      name: state.selectedProduct.nome,
      date: localISOTime
    }];

    try {
      const response = await fetch(`${apiHost}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart: cart,
          clientData: {
            name: state.clientName,
            email: state.clientEmail,
            cpf: state.clientCpf.replace(/\D/g, ""),
            phone: state.clientPhone
          },
          referredBy: partnerId // Atribuição automática da comissão ao parceiro!
        })
      });

      const data = await response.json();
      if (data.success) {
        state.orderId = data.orderId;
        state.pixData = data.pix;
        renderPaymentScreen();
      } else {
        alert("Erro no checkout: " + data.error);
        renderIdentificationForm();
      }
    } catch (e) {
      console.warn("Backend offline. Simulando geração local de PIX.");
      setTimeout(() => {
        state.orderId = "ORD-" + Math.floor(Math.random() * 1000000);
        state.pixData = {
          qrCodeBase64: "",
          qrCode: "00020101021226830014br.gov.bcb.pix2561api.mercadopago.com/v1/payments/12345/qr"
        };
        renderPaymentScreen();
      }, 1200);
    }
  }

  // Renderizador: Tela de Pagamento (PIX)
  function renderPaymentScreen() {
    titleEl.innerText = "Efetuar Pagamento PIX";

    const formattedDate = state.selectedDate.toLocaleDateString('pt-BR');
    const totalPrice = (state.selectedProduct.preco * state.quantity).toFixed(2).replace('.', ',');
    const qrSrc = state.pixData.qrCodeBase64 
      ? `data:image/jpeg;base64,${state.pixData.qrCodeBase64}`
      : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(state.pixData.qrCode)}`;

    bodyEl.innerHTML = `
      <div class="sk-split-layout">
        <!-- Coluna Esquerda: Dados do Pedido -->
        <div class="sk-split-left" style="display:flex; flex-direction:column; gap:16px;">
          <h4 style="font-size:0.82rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Resumo da Reserva</h4>
          
          <div style="background:#ffffff; border:1px solid var(--border-light); padding:16px; border-radius:12px; display:flex; flex-direction:column; gap:8px; font-size:0.85rem; color: var(--text-dark);">
            <p><strong>Experiência:</strong><br><span style="color:var(--text-muted);">${state.selectedProduct.nome}</span></p>
            <p><strong>Agendamento:</strong><br><span style="color:var(--accent-purple); font-weight:bold;">${formattedDate}</span></p>
            <p><strong>Visitante:</strong><br><span style="color:var(--text-muted);">${state.clientName}</span></p>
            <p><strong>CPF:</strong><br><span style="color:var(--text-muted);">${state.clientCpf}</span></p>
            <div style="border-top:1px solid var(--border-light); padding-top:8px; margin-top:4px; display:flex; justify-content:space-between; align-items:center;">
              <span>Total a pagar</span>
              <strong style="color:var(--accent-green); font-size:1.1rem;">R$ ${totalPrice}</strong>
            </div>
          </div>
        </div>

        <!-- Coluna Direita: Código QR do PIX -->
        <div class="sk-pix-box">
          <div class="sk-timer-bar">
            ⏰ Pague em até <span id="sk-countdown">10:00</span> para garantir suas vagas!
          </div>

          <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">
            Escaneie o QR Code abaixo pelo app do seu banco:
          </p>

          <img class="sk-qr-code" src="${qrSrc}" alt="QR Code PIX">

          <div class="sk-copia-cola-row">
            <span class="sk-copia-cola-text" id="sk-cc-key">${state.pixData.qrCode}</span>
            <button class="sk-copy-btn" id="sk-copy-btn">Copiar</button>
          </div>

          <button class="sk-btn-primary" style="background: var(--accent-green); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);" id="sk-webhook-btn">
            Simular Pagamento Aprovado
          </button>
          <button class="sk-btn-secondary" id="sk-cancel-btn">Cancelar e Voltar</button>
        </div>
      </div>
    `;

    // Inicia countdown
    startTimer(600);

    // Botão copiar
    shadow.getElementById('sk-copy-btn').addEventListener('click', () => {
      navigator.clipboard.writeText(state.pixData.qrCode).then(() => {
        const btn = shadow.getElementById('sk-copy-btn');
        btn.innerText = "Copiado!";
        setTimeout(() => { btn.innerText = "Copiar"; }, 1500);
      });
    });

    // Simular webhook
    shadow.getElementById('sk-webhook-btn').addEventListener('click', simulatePaymentSuccess);

    // Cancelar
    shadow.getElementById('sk-cancel-btn').addEventListener('click', () => {
      clearInterval(state.timerInterval);
      renderIdentificationForm();
    });
  }

  function startTimer(duration) {
    clearInterval(state.timerInterval);
    let timer = duration;
    const display = shadow.getElementById('sk-countdown');

    state.timerInterval = setInterval(() => {
      let minutes = parseInt(timer / 60, 10);
      let seconds = parseInt(timer % 60, 10);

      minutes = minutes < 10 ? "0" + minutes : minutes;
      seconds = seconds < 10 ? "0" + seconds : seconds;

      display.textContent = minutes + ":" + seconds;

      if (--timer < 0) {
        clearInterval(state.timerInterval);
        alert("Sua reserva de ingressos expirou por falta de pagamento.");
        renderDateAndQtySelection();
      }
    }, 1000);
  }

  // Simular confirmação via webhook no backend
  async function simulatePaymentSuccess() {
    clearInterval(state.timerInterval);
    const btn = shadow.getElementById('sk-webhook-btn');
    btn.innerHTML = `<span class="sk-spinner" style="width: 14px; height: 14px; margin: 0; display: inline-block; vertical-align: middle;"></span> Emitindo Voucher...`;
    btn.disabled = true;

    try {
      const response = await fetch(`${apiHost}/webhooks/pagamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: state.orderId })
      });
      const data = await response.json();
      if (data.success && data.tickets) {
        renderSuccessVoucher(data.tickets[0]);
      } else {
        alert("Erro ao validar pagamento: " + data.error);
        renderPaymentScreen();
      }
    } catch (e) {
      console.warn("Backend offline. Simulando emissão de voucher local.");
      setTimeout(() => {
        renderSuccessVoucher(null);
      }, 1000);
    }
  }

  // Renderizador: Voucher final Premium
  function renderSuccessVoucher(ticketData) {
    titleEl.innerText = "Aventura Confirmada!";

    const userCpf = state.clientCpf;
    const formattedDate = state.selectedDate.toLocaleDateString('pt-BR');
    const prodName = state.selectedProduct.nome;

    let barcodeString = String(Math.floor(10000000000 + Math.random() * 90000000000));
    if (ticketData) {
      if (ticketData.ingressos && ticketData.ingressos.length > 0) {
        const ing = ticketData.ingressos[0];
        barcodeString = `${ing.numeroPassaporte}${ing.digitoPassaporte}`;
      } else if (ticketData.voucher) {
        barcodeString = ticketData.voucher;
      } else if (ticketData.id) {
        barcodeString = ticketData.id;
      }
    }

    bodyEl.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(16,185,129,0.1); border: 2px solid var(--accent-green); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="3" style="width: 24px; height: 24px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.45;">
          O webhook confirmou o PIX. A sua reserva está emitida e liberada no sistema SentinelK!
        </p>

        <!-- Ticket Virtual Premium -->
        <div class="sk-ticket">
          <div class="sk-ticket-header">
            <span>SENTINELK VOUCHER</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div class="sk-ticket-body">
            <div class="sk-ticket-label">Experiência</div>
            <div class="sk-ticket-value" style="font-size: 1rem; color: var(--text-dark);">${prodName}</div>

            <div style="display: flex; justify-content: space-between; gap: 8px;">
              <div>
                <div class="sk-ticket-label">Visitante</div>
                <div class="sk-ticket-value" style="color: var(--text-dark);">${state.clientName}</div>
              </div>
              <div>
                <div class="sk-ticket-label">CPF</div>
                <div class="sk-ticket-value" style="color: var(--text-dark);">${userCpf}</div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 8px;">
              <div>
                <div class="sk-ticket-label">Data de Utilização</div>
                <div class="sk-ticket-value" style="color: var(--accent-purple);">${formattedDate}</div>
              </div>
              <div>
                <div class="sk-ticket-label">Quantidade</div>
                <div class="sk-ticket-value" style="color: var(--text-dark);">${state.quantity}x</div>
              </div>
            </div>

            <div class="sk-ticket-divider"></div>

            <div style="text-align: center; background: white; padding: 10px; border-radius: 8px; display: inline-block; width: 100%;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${barcodeString}" style="width: 110px; height: 110px; display: block; margin: 0 auto;">
              <p style="color: black; font-family: monospace; font-weight: bold; letter-spacing: 2px; font-size: 0.8rem; margin-top: 6px;">
                ${barcodeString}
              </p>
            </div>
          </div>
        </div>

        <button class="sk-btn-primary" id="sk-finish-btn">Concluir</button>
      </div>
    `;

    shadow.getElementById('sk-finish-btn').addEventListener('click', () => {
      if (overlay) {
        overlay.classList.remove('active');
      } else {
        // Se for inline, reinicia o fluxo na vitrine
        state.selectedDate = todayDate;
        state.quantity = 1;
        state.orderId = null;
        state.pixData = null;
        loadProducts();
      }
    });
  }

})();
