"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const jsforce_1 = require("jsforce");
// import { Server, IncomingMessage, ServerResponse } from 'http'
const server = (0, fastify_1.default)({ logger: true });
const opts = {
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    pong: {
                        type: 'string'
                    }
                }
            }
        }
    }
};
server.get('/ping', opts, async (request, reply) => {
    const connection = new jsforce_1.Connection({
    // loginUrl: 'https://login.salesforces.com/services/oauth2/token' 
    });
    const result = await connection.login('dominic+salesforce@norustech.com', 'W)PDJH7q.9_cZ)9D');
    // console.log();
    // console.log(result);
    return { pong: 'it worked!' };
});
const start = async () => {
    try {
        await server.listen({ port: 3000 });
        const address = server.server.address();
        const port = typeof address === 'string' ? address : address === null || address === void 0 ? void 0 : address.port;
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
