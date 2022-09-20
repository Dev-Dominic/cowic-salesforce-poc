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

type CreateDeliveryOrder = {
  Account__c: string,
  Delivery_Date__c: Date,
  Upload_First_Name__c: string,
  Upload_Last_Name__c: string,
  Upload_Phone__c: string,
  Upload_Email__c: string,
  Upload_Address_Line_1__c: string,
  Upload_Address_Line_2__c: string,
  Upload_City__c: string,
  Upload_State__c: string,
  Upload_Zip__c: number,
  Upload_Delivery_Notes__c: string,
  Units__c: number,
  Order_Details__c: string,
  Is_imported__c: boolean,
  Delivery_Status__c: string
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

server.get('/deliveryOrders', async () => {
  // https://developer.salesforce.com/docs/atlas.en-us.order_management_developer_guide_html.meta/order_management_developer_guide_html/order_management_import_data.htm
  const deliveryOrders = await conn.query(
    'SELECT Name, Delivery_Contact_Name__c FROM Delivery_Order__c'
  );
  
  return { deliveryOrders };
})

server.post('/deliveryOrders', async (request, response) => {
  const { 
    Account__c,
    Delivery_Date__c,
    Upload_First_Name__c,
    Upload_Last_Name__c,
    Upload_Phone__c,
    Upload_Email__c,
    Upload_Address_Line_1__c,
    Upload_Address_Line_2__c,
    Upload_City__c,
    Upload_State__c,
    Upload_Zip__c,
    Upload_Delivery_Notes__c,
    Units__c,
    Order_Details__c,
    Is_imported__c,
    Delivery_Status__c
  } = request.body as CreateDeliveryOrder;

  // Create new delivery order
  const result = await conn.sobject('Delivery_Order__c').create([
    {
      Account__c,
      Delivery_Date__c,
      Upload_First_Name__c,
      Upload_Last_Name__c,
      Upload_Phone__c,
      Upload_Email__c,
      Upload_Address_Line_1__c,
      Upload_Address_Line_2__c,
      Upload_City__c,
      // Upload_State__c,
      Upload_Zip__c,
      Upload_Delivery_Notes__c,
      Units__c,
      Order_Details__c,
      Is_imported__c,
      Delivery_Status__c
    }
  ]);

  return { ...result };
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
