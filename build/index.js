"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
require("dotenv/config");
const jsforce_1 = __importDefault(require("jsforce"));
const sf_jwt_token_1 = require("sf-jwt-token");
const server = (0, fastify_1.default)({ logger: true });
const conn = new jsforce_1.default.Connection({});
server.get('/shoppers', async () => {
    const shoppers = await conn.query('SELECT Id, Name, AccountNumber, BillingAddress, ShippingAddress FROM Account');
    return { shoppers };
});
server.get('/orders', async () => {
    var _a;
    // https://developer.salesforce.com/docs/atlas.en-us.order_management_developer_guide_html.meta/order_management_developer_guide_html/order_management_import_data.htm
    const result = await conn.query('SELECT Id, Account.Name, Status, Type, Delivery_Date__c, ShippingAddress, TotalAmount, OrderNumber FROM Order');
    const orderId = (_a = (result === null || result === void 0 ? void 0 : result.records)[0]) === null || _a === void 0 ? void 0 : _a.Id;
    const orderItems = await conn.query(`SELECT Product2Id, TotalPrice FROM OrderItem WHERE OrderId='${orderId}'`);
    return {
        orders: Object.assign({}, result),
        orderItems: Object.assign({}, orderItems)
    };
});
server.get('/deliveryOrders', async () => {
    // https://developer.salesforce.com/docs/atlas.en-us.order_management_developer_guide_html.meta/order_management_developer_guide_html/order_management_import_data.htm
    const deliveryOrders = await conn.query('SELECT Name, Delivery_Contact_Name__c FROM Delivery_Order__c');
    return { deliveryOrders };
});
server.post('/deliveryOrders', async (request, response) => {
    const { Account__c, Delivery_Date__c, Upload_First_Name__c, Upload_Last_Name__c, Upload_Phone__c, Upload_Email__c, Upload_Address_Line_1__c, Upload_Address_Line_2__c, Upload_City__c, Upload_State__c, Upload_Zip__c, Upload_Delivery_Notes__c, Units__c, Order_Details__c, Is_imported__c, Delivery_Status__c } = request.body;
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
    return Object.assign({}, result);
});
server.get('/products', async () => {
    const products = await conn.query('SELECT Id, Name FROM Product2');
    return { products };
});
server.post('/orders', async (request, response) => {
    const { AccountId, Delivery_Date__c, ProductIds } = request.body;
    // Create new order
    const result = await conn.sobject('Order').create([
        {
            AccountId,
            Delivery_Date__c,
            EffectiveDate: new Date(),
            Status: 'Draft'
        }
    ]);
    return Object.assign({}, result);
});
const start = async () => {
    try {
        await server.listen({ port: 3000 });
        const jwtResponseToken = await (0, sf_jwt_token_1.getToken)({
            iss: process.env.SALESFORCE_CLIENT_ID || '',
            sub: process.env.SALESFORCE_USER_EMAIL || '',
            aud: process.env.SALESFORCE_AUDIENCE || '',
            privateKey: process.env.PRIVATE_KEY || ''
        });
        conn.initialize({
            instanceUrl: jwtResponseToken.instance_url,
            accessToken: jwtResponseToken.access_token,
        });
        const address = server.server.address();
        const port = typeof address === 'string' ? address : address === null || address === void 0 ? void 0 : address.port;
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
