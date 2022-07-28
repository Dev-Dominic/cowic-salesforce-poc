import Fastify, { FastifyInstance } from 'fastify'
import 'dotenv/config';
import jsforce from 'jsforce';
import { getToken } from 'sf-jwt-token';
import { isArray } from 'util';

const server: FastifyInstance = Fastify({ logger: true })
const conn = new jsforce.Connection({});

type Order = {
  Id: string,
  AccountId: string, // shopper salesforceID
  Delivery_Date__c: Date,
}

type CreateOrder = {
  AccountId: string,
  ProductIds: string[],
  Delivery_Date__c: Date,
}

server.get('/shoppers', async () => {
  const shoppers = await conn.query('SELECT Id, Name, AccountNumber, BillingAddress, ShippingAddress FROM Account');
  return { shoppers };
})

server.get('/orders', async () => {
  // https://developer.salesforce.com/docs/atlas.en-us.order_management_developer_guide_html.meta/order_management_developer_guide_html/order_management_import_data.htm
  const result = await conn.query('SELECT Id, Account.Name, Status, Type, Delivery_Date__c, ShippingAddress, TotalAmount, OrderNumber FROM Order');
  const orderId = (result?.records as Order[])[0]?.Id;
  const orderItems = await conn.query(`SELECT Product2Id, TotalPrice FROM OrderItem WHERE OrderId='${orderId}'`);
  return { 
    orders: {...result}, 
    orderItems: {...orderItems}
  };
})

server.get('/products', async () => {
  const products = await conn.query('SELECT Id, Name FROM Product2');
  return { products };
})

server.post('/orders', async (request, response) => {
  const { 
    AccountId, 
    Delivery_Date__c,
    ProductIds 
  } = request.body as CreateOrder;

  // Create new order
  const result = await conn.sobject('Order').create([
    {
      AccountId,
      Delivery_Date__c,
      EffectiveDate: new Date(),
      Status: 'Draft'
    }
  ])

  return { ...result };
})

const start = async () => {
  try {
    await server.listen({ port: 3000 });

    const jwtResponseToken = await getToken({
      iss: process.env.SALESFORCE_CLIENT_ID || '',
      sub: process.env.SALESFORCE_USER_EMAIL || '',
      aud: process.env.SALESFORCE_AUDIENCE || '',
      privateKey: process.env.PRIVATE_KEY || ''
    })

    conn.initialize({
      instanceUrl: jwtResponseToken.instance_url,
      accessToken: jwtResponseToken.access_token,
    });

    const address = server.server.address()
    const port = typeof address === 'string' ? address : address?.port

  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}
start()
