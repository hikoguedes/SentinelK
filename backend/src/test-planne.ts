import { PlanneDriver } from './drivers/PlanneDriver';

async function runTest() {
  console.log("Iniciando Teste de Homologação com a Planne...");
  
  const config = {
    clientId: '82420a18-6e84-4c73-985a-9f85e27601a5',
    clientSecret: '72768044-6b54-44e0-9b5e-b66102eb32b5',
    isProd: false,
    atributo: 'unycopass'
  };

  const driver = new PlanneDriver(config);

  try {
    console.log("1. Buscando Produtos disponíveis no Staging...");
    const products = await driver.listProducts();
    
    if (!products || products.length === 0) {
      console.log("❌ Nenhum produto encontrado no ambiente de testes.");
      return;
    }
    
    // Procura o produto ID 4905 se ele existir na lista, senão pega o primeiro
    const product = products.find((p: any) => p.id === '4905') || products[0];
    console.log(`✅ Produto Encontrado: ${product.name} (ID: ${product.id})`);

    // Passo adicional: buscar tarifa para conseguir criar a venda teste.
    // A API do Planne requer os ids corretos das tarifas para gerar a venda.
    console.log("\n2. Buscando Grupo de Tarifas...");
    const headers = {
      'Content-Type': 'application/json',
      'X-Client-Id': config.clientId,
      'X-Client-Secret': config.clientSecret,
      'Accept': '*/*'
    };
    
    const baseUrl = 'https://staging-seller-api.planne.com.br';
    const tgRes = await fetch(`${baseUrl}/1/products/${product.id}/tariffGroups`, { headers });
    const tgData = await tgRes.json();
    
    if (!tgData || tgData.length === 0) {
        console.log("❌ Nenhuma tarifa encontrada para o produto.");
        return;
    }
    const tariffGroupId = tgData[0].id;
    
    const trRes = await fetch(`${baseUrl}/1/tariffGroups/${tariffGroupId}/tariffs?include=type`, { headers });
    const trData = await trRes.json();
    if (!trData || trData.length === 0) {
        console.log("❌ Nenhuma tarifa encontrada para o grupo de tarifas.");
        return;
    }
    const tariffId = trData[0].id;
    console.log(`✅ Tarifa Encontrada: ID ${tariffId}`);

    console.log("\n3. Criando uma Venda Externa de Teste (Validação)...");
    const todayDate = new Date().toISOString().split('T')[0];

    const payload = {
      customer: {
        firstName: "SentinelK",
        lastName: "Integration Test"
      },
      items: [{
        productId: product.id,
        scheduleDate: todayDate,
        tariffs: [{
          id: tariffId,
          quantity: 1
        }]
      }],
      attributes: ["unycopass"],
      checks: {
        ignoreAvailabilities: true,
        ignoreResources: true,
        ignoreTariffDependency: true
      }
    };

    const saleRes = await driver.createExternalSale(payload);
    
    console.log("==========================================");
    console.log("✅✅ SUCESSO! INTEGRAÇÃO VALIDADA!");
    console.log("==========================================");
    console.log("A venda de teste foi criada na plataforma Planne com sucesso.");
    console.log("👉 ID DA VENDA PARA INFORMAR À PLANNE:", saleRes.data?.id || saleRes.id);
    console.log("==========================================");
    
  } catch (error: any) {
    console.error("❌ ERRO DURANTE O TESTE:", error.message);
  }
}

runTest();
