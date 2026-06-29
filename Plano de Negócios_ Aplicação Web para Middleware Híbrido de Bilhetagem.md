**Plano de Negócios: Aplicação Web para Middleware Híbrido de Bilhetagem**

**1\. Proposta de Valor e Posicionamento de Mercado** A aplicação web atuará como um **Agregador de Inventário** e um "Cérebro da Expedição", operando a venda antecipada de ingressos de parques. O grande diferencial competitivo do negócio é a eliminação da fricção no acesso: diferentemente de plataformas de voucher (como o Laçador de Ofertas), onde o cliente precisa apresentar um cupom para validação manual ("baixa") no estabelecimento, o middleware entregará um **ingresso com QR Code direto para a catraca**, padronizado para ser lido instantaneamente pelo parque.

A plataforma operará com duas naturezas de inventário em uma única interface:

* **Inventário Dinâmico (API):** Conexão em tempo real para parques com restrições de capacidade (como o Snowland) ou que utilizam sistemas como o Volpe ERP/PWI.  
* **Inventário Estático (Consignado):** Gestão de lotes locais via upload de planilhas (CSV) para parques sem integração avançada.

**2\. Modelo de Receita e Precificação Dinâmica (Revenue Management)** Em vez de operar com descontos fixos, o negócio maximizará o lucro operando como um "Player de Mercado", utilizando um **Motor de Precificação Dinâmica (RM)**. Como no inventário consignado o custo de aquisição do ingresso é fixo, toda variação para cima reflete em margem de lucro direta. A aplicação dividirá o inventário em "Buckets" (baldes) com reajustes automáticos baseados nos seguintes pilares:

* **Bucket Promo (Antecedência):** Ingressos mais baratos (ex: 20% do lote) para compras com mais de 60 dias de antecedência, garantindo fluxo de caixa rápido.  
* **Bucket Standard:** Ocupa 50% do lote com um preço médio.  
* **Bucket Last Minute (Curva de Demanda):** À medida que o estoque diminui, os 30% finais do lote têm o preço elevado automaticamente para capturar o público de última hora (preço premium).  
* **Sincronização de Concorrência:** Para parques conectados via API, o sistema poderá utilizar Bots/Scrapers ou consultas para monitorar se o site oficial do parque baixou o preço, ajustando o seu próprio RM para não ficar fora de mercado.

**3\. Arquitetura Técnica e Operacional** O sistema será desenvolvido preferencialmente em **Python ou Node.js**, suportado por uma infraestrutura escalável na AWS (utilizando instâncias EC2, S3 ou funções Lambda para suportar picos de tráfego em feriados e férias). O banco de dados (MongoDB ou SQL) possuirá uma tabela unificada gerenciando ambos os tipos de estoque.

Para o funcionamento perfeito, a engenharia da aplicação terá três módulos centrais:

* **Camada de Abstração (Drivers):** O checkout do cliente ("front-end") chamará sempre a mesma função de venda. Por trás, o sistema decide se utilizará o **Driver Estático** (retirando um código da sua gaveta virtual do banco de dados) ou o **Driver API** (comunicando-se com o servidor do parque).  
* **Fluxo Anti-Overbooking ("Duplo Check"):** Para evitar a "Condição de Corrida" (dois clientes comprando o último ingresso), o sistema faz uma consulta (Polling), aplica um bloqueio temporário (*Soft Lock*) de 10 a 15 minutos durante o checkout e, somente após a confirmação do gateway de pagamento, efetiva a venda (Sync). Caso o ingresso esgote nesse meio tempo, uma rotina de *Fallback* realiza o estorno automático.  
* **O "Wrapper" de QR Code:** Utilizando bibliotecas como `qrcode` ou `canvas`, a aplicação encapsulará a string recebida (seja um ID numérico simples ou uma URL assinada) gerando dinamicamente a imagem do QR Code com contraste e proporções ideais para as leitoras ópticas das catracas de cada parque específico.

**4\. Portal B2B: Retenção e Fidelização de Parques Parceiros** Para ganhar poder de barganha e negociar lotes e descontos maiores, a aplicação deixará de ser apenas um revendedor e funcionará como uma plataforma B2B, entregando total segurança e previsibilidade operacional para a gestão do parque. Isso será feito por meio de:

* **Dashboard do Parceiro (Multitenancy):** Uma interface web onde o parque faz login. Através de uma "View" segmentada no banco de dados, o parque acessa apenas os seus próprios números (total vendido, faturamento e taxas de ocupação por data). Essa previsibilidade permite ao parque organizar o *staff* e o suprimento para os dias cheios.  
* **Notificações Webhook em Tempo Real:** No instante em que o cliente compra o ingresso, o middleware dispara um pacote JSON para o servidor do parque, informando dados como "ID do Ingresso", "Parque" e "Data de Uso".  
* **Conciliação e Relatórios Automáticos:** O sistema eliminará os erros humanos gerando e enviando automaticamente por e-mail relatórios de fechamento em CSV ou PDF (diários ou mensais). Com base nisso, o parque saberá exatamente quais ingressos consignados foram vendidos e poderá liberar o que sobrou (fazer a "baixa") para outros canais deles.

