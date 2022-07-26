import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify'
// import { helmet } from 'fastify-helmet';
import { Connection } from 'jsforce';
import 'dotenv/config';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import axios from 'axios';
import jsforce from 'jsforce';
import { getToken } from 'sf-jwt-token';
// import { Server, IncomingMessage, ServerResponse } from 'http'

const server: FastifyInstance = Fastify({ logger: true })
const conn = new jsforce.Connection({});

server.get('/shoppers', async () => {
  const shoppers = await conn.query('SELECT Name, AccountNumber, BillingAddress, ShippingAddress FROM Account');
  return { shoppers };
})

server.get('/orders', async () => {
  // https://developer.salesforce.com/docs/atlas.en-us.order_management_developer_guide_html.meta/order_management_developer_guide_html/order_management_import_data.htm
  const orders = await conn.query('SELECT Id, Account.Name, Status, Type, Delivery_Date__c, ShippingAddress, TotalAmount FROM Order');
  return { orders };
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
