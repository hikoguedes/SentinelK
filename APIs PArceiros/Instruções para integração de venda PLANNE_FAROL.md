Instruções para integração de vendas
via Plano da API do Vendedor
Links
● Seller API : http://planne-api-docs.planne.com.br/v2-seller-api
Definições
Este guia tem como objetivo auxiliar na integração do registro de vendas externas para dentro
da plataforma Planne, através das funcionalidades da API do Seller.
Os próximos artigos trazemos maior contexto sobre as entidades que são trabalhadas na API.

Aplicativos
Se refere ao contexto contendo todas as informações/dados de um vendedor específico.
Praticamente todas as entidades da API residem dentro de um App específico, isolado do
contexto de outros vendedores que utilizam a plataforma Planne.

Produtos e edificação
Os produtos representam os serviços oferecidos pelo Vendedor (por exemplo: um passeio
específico de uma agência, uma reserva de jantar de um restaurante, etc).
Devido à sazonalidade em que muitos negócios operam, a precificação desses produtos se dá
através de entidades auxiliares, permitindo maior flexibilidade na definição dos preços dos
produtos durante diferentes períodos. Cada produto na plataforma está configurado com uma de
três opções de modo de venda: WITH_DATE_AND_TIME (dados e horário ) , WITH_DATE_ONLY
(apenas dados) e WITHOUT_DATE (sem dados).
Aqui estão tarifas e grupos de tarifas . Essas entidades permitem a definição de diferentes
preços para cada produto. Cada produto pode ter vários grupos de tarifa, e cada grupo de
tarifa possui múltiplas tarifas. Cada tarifa possui um valor associado e a referência ao seu tipo
(Nome customizado ao qual se refere).

Vendas
A entidade Venda representa uma compra realizada por um cliente. A integração descrita neste
documento permite o registro de vendas realizadas a partir de outras plataformas. Uma venda
é composta pelas seguintes propriedades:
● Cliente : o comprador da venda;
● Estado : status atual de venda. Os valores possíveis são:
○ criado (Em aberto);
○ pendente (Pendente);
○ expirado (Expirado);
○ cancelado (Cancelado);
○ payment_complete (Venda confirmada);
○ payment_voided (Pagamento estornado);
○ payment_chargeback (pagamento contestado);
● Itens : os itens presentes na venda. Cada venda deve possuir, no mínimo, 1 item. Cada
item possui as seguintes características:
○ Reserva: uma reserva registrada para o item da venda. Será apresentado apenas
para vendas nos status [ criado , pendente, pagamento_completo ] ;
○ Tarifas : a lista de tarifas do item. Sempre contém no mínimo 1 tarifa;
○ Adicionais : uma lista de adicionais do item. Nem todos os produtos possuem
adicionais, então essa lista pode ser vazia;
○ Recursos : uma lista de lugares do item. Nem todos os produtos possuem mapa
de lugares, então essa lista pode ficar vazia;

Realizando chamadas para o SellerAPI
Ambientes
Ao realizar requisições, certifique-se de definir corretamente o host das chamadas, conforme o
ambiente em que o aplicativo reside:
● Produção : seller-api.planne.com.br
● Staging : staging-seller-api.planne.com.br

Autenticação
A autenticação na API do Seller é realizada através de duas chaves, Client-Id e Client-Secret .
Ambas devem ser informadas corretamente para autenticar com sucesso as chamadas à API.
Ao realizar a integração através de requisições HTTP, as chaves deverão ser passadas no
cabeçalho das requisições, utilizando os cabeçalhos X-Client-Id e X-Client-Secret . Segue abaixo
um exemplo de requisição contendo os títulos:
Obs: o client id e client secret da imagem abaixo são apenas ilustrativos. Os corretos para
serem utilizados para integração em homologação estão disponíveis no final do documento.

Identificando o App(vendedor) das requisições
Muitas das operações apresentadas na API baseiam-se na presença do parâmetro appId nas URLs
a serem requisitadas. Por exemplo, requisições para obter uma lista de produtos, lista de vendas,
etc.

Ao utilizar o modelo de autenticação por chaves, conforme descrito acima, é possível utilizar uma
string “ own ” como valor válido para o parâmetro appId . Ou seja, supondo a existência de um
App com o id “ 123ABC ”, ambas as requisições são válidas e resultam no mesmo resultado:
GET https://seller-api.planne.com.br/1/apps/123ABC/products
ou
GET https://seller-api.planne.com.br/1/apps/own/products

Exemplo de requisição HTTP
Como exemplo, uma requisição para obter os produtos de um aplicativo possui as seguintes
características:

Requisição
> GET /1/apps/own/products HTTP/1.
> Host: seller-api.planne.com.br
> User-Agent: curl/7.88.
> Accept: */*
> X-Client-Id: 8047a5b6-e4c2-403a-9436-a3d50083a95b
> X-Client-Secret: 9078b1ba-d0ac-4e60-9f25-8b298128d
Resposta
< HTTP/1.1 200 OK
< ...
< X-Pagination-Limit: 10
< X-Pagination-Offset: 0
< X-Pagination-Total-Count: 8
< X-Ratelimit-Limit: 600
< X-Ratelimit-Remaining: 598
< X-Ratelimit-Reset: 1698869215
<
[...]
Operações da API
Parâmetro “include”
Por padrão, o retorno em JSON das respostas da Seller API busca traz apenas informações
pertinentes ao recurso que você está sendo requisitado, rapidamente assim o tamanho da resposta.
Porém, pensando na praticidade para obter informações complementares, a maior parte das
transações disponíveis permite a inclusão de um parâmetro “include”, onde é possível declarar
propriedades extras para serem “preenchidas”.
O endpoint /apps/{appId}/sales serve como exemplo. Por padrão, ele retorna apenas os dados
relativos às vendas. Porém, incluindo o parâmetro include, as informações relativas ao
consumidor passariam a ser retornadas também, dentro da chave “ cliente ” de cada venda:
https://seller-api.planne.com.br/1/apps/own/sales?include=customer
Nos cenários onde é necessário retornar mais de um dado no include, basta incluir todos os
valores desejados separados por “ , ”:
https://seller-api.planne.com.br/1/apps/own/vouchers?include=product,sale.customer
Cada operação possui um conjunto próprio de valores disponíveis para inclusão, com base no tipo
de retorno. Consulte a documentação para mais informações.

Paginação
Todas as operações de listagem da Seller API retornam, por padrão, apenas um subconjunto
dos itens disponíveis. Para ajustar a quantidade de itens retornados por requisição, utilize os
parâmetros limit e offset. O parâmetro limit define a quantidade de itens a serem retornados
na requisição, possui valor padrão de 10 e, se definido na requisição, possui valor máximo de
O parâmetro offset , por sua vez, define quantos itens serão “pulados” na listagem.
A quantidade total de itens em uma coleção é retornada na resposta através do cabeçalho
X-Pagination-Total-Count , conforme imagem abaixo. Combinando as parâmetros e as
informações do cabeçalho das respostas, é possível navegar pela listagem de itens de
qualquer coleção da API.
Consulta de lamento
A consulta de tarifas pode ser realizada através da listagem das tarifas para um grupo
específico. Para obter a lista de produtos disponíveis, utilize o endpoint:
GET https://seller-api.planne.com.br/1/apps/own/products
Para obter os grupos de tarifa de cada produto, utilize:
GET https://seller-api.planne.com.br/1/products/{productId}/tariffGroups
E, para obter as tarifas dentro de um grupo, use:
GET https://seller-api.planne.com.br/1/tariffGroups/{tariffGroupId}/tariffs?include=type
Consulta de agendamentos
A operação getProductDetailedSchedulings permite listar os agendamentos disponíveis para
um produto a partir de um intervalo de dados. Usando as configurações desde e até , a chamada
retornará os agendamentos ainda disponíveis para o produto dentro desses dados.
GET
https://seller-api.planne.com.br/1/products/{productId}/detailedSchedulings?since=YYYY-MM-DD&until=YYYY-MM-DD&include=fi
nalTariffGroup.tariffs.type
Além das informações relativas ao agendamento em si, cada item da listagem contém detalhes
sobre o grupo de preços aplicados naquele pedido em específico, além de informações
sobre a consulta atual do agendamento. Abaixo detalhamos as características dessas duas
informações.
Grupo de tarifas do agendamento
A chave “ finalTariffGroup” contém informações apresentadas sobre o grupo de tarifas aplicadas ao
agendamento. É importante citar que cada agendamento possui apenas um grupo de tarifas
associadas ao mesmo.
Dentro das informações do grupo de tarifas, a chave “ tarifas ” contém todas as tarifas
disponíveis dentro do grupo. Cada tarifa, por sua vez, apresenta o seu correspondente tipo na chave
“type” (adicione no parâmetro include o valor “ finalTariffGroup.tariffs.type ” para preencher este
objeto), assim como o seu valor em centavos dentro da propriedade “ priceCents ”.

trabalho do agendamento
A propriedade “ OcupationRates ” contém as informações relacionadas com a ocupação do
agendamento. Essa ocupação se baseia nas configurações de disponibilidades definidas pelo
vendedor através da plataforma do Planne. As informações de ocupação são dadas em três níveis
diferentes: produto , tarifa e adicional .
O nível de produto ( horário de quantidades ) diz respeito à quantidade total disponível para compra
do produto, organizado para cada horário disponível no agendamento.
O nível de tarifa ( tarifaScheduleQuantities ) diz respeito à quantidade total disponível para
compra de cada tarifa do grupo de tarifas associadas ao agendamento, organizado para cada
horário disponível. Esse nível é relevante pois o vendedor pode possuir configurações de
disponibilidade específicas para determinadas tarifas do produto.
O nível de adicional ( adicionalScheduleQuantities ) diz respeito à quantidade total disponível
para compra de cada adicional do produto, organizado para cada horário disponível.
Dentro de cada nível, as informações de ocupação estão separadas por horário (e por id da
tarifa/adicional, nos casos de tarifa e adicional ).
É importante ressaltar que, nos casos de produtos com modo de venda
WITH_DATE_ONLY, a lista de itens dentro de cada nível contará apenas um único
item, representando a taxa de ocupação de todo o agendamento (afinal, não existirão
horários distintos para o agendamento).
As taxas de cada local estão representadas através do esquema OccupationInfo , possuindo
duas propriedades. O availableAmount refere-se ao número de itens disponíveis, sendo maior
ou igual a zero. A taxa de ocupação representa a taxa de ocupação, sendo um número flutuante
(float) variando entre 0 (não ocupado) e 1 (totalmente ocupado). Nos casos em que não haja
disponibilidade definida para o agendamento, ambos os valores serão nulos.

Enviar vendas externas
O endpoint createAppExternalSale permite a geração de vendas de um vendedor dentro da
plataforma Planne. Ao gerar uma venda, seu status será registrado automaticamente como
payment_complete , e as reservas e vouchers serão gerados.
POST https://seller-api.planne.com.br/1/apps/own/externalSales
Abaixo são descritas as configurações da chamada:
● atributos : Obrigatório. lista de atributos da venda. Deve conter um ou mais dos
atributos válidos a serem associados à venda. Utilizar o atributo informado pelo
Planne durante o kick-off da integração ;
● customerId : id do consumidor que será atrelado à venda. Não deve ser preenchido
quando o cliente for definido no payload;
● cliente : parâmetros para a criação de um novo consumidor, que será atrelado à
venda. Não deve ser preenchido quando customerId for definido no payload; Os
seguintes valores podem ser enviados:
○ firstName : primeiro nome do consumidor;
○ sobrenome : sobrenome do consumidor;
○ identificador : CPF do consumidor. Opcional ;
○ email : e-mail do consumidor. Opcional ;
○ telefone : telefone do consumidor. Opcional ;
● itens : uma lista de itens a serem inseridos na venda. Cada item possui as seguintes
informações:
○ productId : o id do produto;
○ ScheduleDate : um dado do item, sem formato AAAA-MM-DD. Essa informação não
deve ser inserida caso o produto possua o modo de venda WITHOUT_DATE ;
○ ScheduleTime : a hora do item, no formato HH:MM. Essa informação deve ser
inserida apenas nos casos em que o produto possui modo de venda
WITH_DATE_AND_TIME ;
○ tarifas : a lista com as tarifas selecionadas para o item. No mínimo, uma tarifa
deve ser enviada. Cada elemento possui os seguintes campos:
■ id : o id da tarifa;
■ quantidade : a quantidade de itens da tarifa. Valor mínimo de 1;
○ recursos : lista com os lugares que serão atrelados ao item. Opcional caso o
agendamento não tenha mapa de lugares associados;
○ autoAllocateResources : define alocação automática de lugares. Quando
ativada, a plataforma selecionará automaticamente os lugares necessários
para alocar todas as tarifas, conforme lugares disponíveis na data e horário do
item. Não pode ser definido caso uma lista de lugares seja informada na chave
resources ;
○ adicionais : lista com os adicionais que serão atrelados ao item. Opcional;
● amountCents : O valor da venda. Se não for preenchido, o valor é calculado
automaticamente com base nos itens da venda;

● verificações : restrições que permitem desabilitar certas validações
realizadas durante a criação da venda;
○ ignoreAvailabilities : permite ignorar as verificações de disponibilidade dos itens
da venda, fazendo com que os itens possuam quaisquer detalhes;
○ ignoreResources : permite ignorar as verificações de lugares dos itens da
venda, fazendo com que lugares já ocupados sejam utilizados, ou até mesmo
não definir lugares para o item;
○ ignoreTariffDependency : permite ignorar as verificações de dependência entre
as tarifas;
Segue abaixo um exemplo de requisição para gerar uma venda externa com um único item,
contendo duas tarifas distintas:
{
"customer": {
"firstName": "Foo",
"lastName": "Bar"
},
"items": [{
"productId": "9876",
"scheduleDate": "2023-11-22",
"scheduleTime": "15:00",
"tariffs": [{
"id": "4321",
"quantidade": 3
}, {
"id": "1234",
"quantidade": 1
}]
}],
"amountCents": 12345 ,
"atributos": [" ATRIBUTO "],
"verificações": {
"ignoreResources": true
}
}

Vouchers de acesso
Os vouchers gerados para uma venda específica podem ser acessados ​​através da chamada
getSaleVouchers , informando o id da venda na URL:

GET https://seller-api.planne.com.br/1/sales/{saleId}/vouchers
É importante ressaltar que a chamada acima traz a lista de vouchers paginada, então
certifique-se de verificar se não existem mais páginas disponíveis após a primeira requisição.
Caso opte por gerar seus próprios vouchers personalizados, você pode utilizar o
qrCodeContent para gerar o QR Code e ser impresso no voucher.
Ou, para obter o documento PDF de cada voucher, utilize a chamada getVoucherPdf abaixo:
GET https://seller-api.planne.com.br/1/vouchers/{voucherId}/pdf
A resposta dessa requisição possui Content-Type do tipo application/pdf .
Cancelar vendas externas
O cancelamento de vendas externas pode ser realizado através da chamada
cancelExternalSale :
DELETE https://seller-api.planne.com.br/1/externalSales/{saleId}
Quando realizado com sucesso, o cancelamento gera os seguintes efeitos:
● A venda passa para o status cancelado ;
● As reservas agendadas para o futuro são arquivos. O restante das reservas são
preservadas;
● Os vouchers não consumidos são revogados, impedindo o seu consumo;
Reagendamento de reservas
O reagendamento de uma venda pode ser realizado através do reagendamento das reservas
geradas pela venda. Para obter reservas de uma venda, utilize o nome
getSaleReservations :
GET https://seller-api.planne.com.br/1/sales/{saleId}/reservations
Cada item de uma venda gera uma respectiva reserva. O reagendamento em si é realizado
através da chama reagendamentoReserva :

POST https://seller-api.planne.com.br/1/reservation/{reservationId}/reschedule
Para reagendar uma reserva, o produto relacionado não pode possuir modo de venda
WITHOUT_DATE. As seguintes parâmetros disponíveis estão para essa chamada:
● ScheduleDate : um dado do item, no formato AAAA-MM-DD;
● scheduleTime : a hora do item, no formato HH:MM. Essa informação deve ser inserida
apenas nos casos em que o produto possui modo de venda WITH_DATE_AND_TIME ;
● verificações : parâmetros para desabilitar validações realizadas durante o
reagendamento. Possuem comportamento semelhante às mesmas parâmetros na chamada
createAppExternalSale ;

Fluxo de validação da integração
Antes de receber as credenciais para integração em produção, é necessário validar a
integração dentro do ambiente de staging da plataforma Planne. Através das chaves de acesso
informadas pela nossa equipe, crie uma venda externa contendo no mínimo um item e informe
o id da venda gerada para a nossa equipe. Após análise interna, a integração será aprovada e
as credenciais de produção serão repassadas.
Para realizar testes e gerar a venda de validação da integração, utilize as chaves abaixo:
ID Seller API : 82420a18-6e84-4c73-985a-9f85e27601a
Chave Seller API : 72768044-6b54-44e0-9b5e-b66102eb32b
Reforçando que, para criar vendas externas, é necessário informar o atributo de integração
dentro do payload da chamada createAppExternalSale. Esse atributo será informado pela
equipe Planne.
Lembrando que o host da Seller API a ser utilizado durante o período de validação é o
staging-seller-api.planne.com.br. Uma vez que a integração seja aprovada, substitua pelo
host seller-api.planne.com.br para enviar vendas reais.
Em caso de dúvidas, contate o e-mail integracoes@planne.com.br.