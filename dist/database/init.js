"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
exports.Connection = typeorm_1.Connection;
const entities_1 = require("./entities");
require("reflect-metadata");
const connectionOptions = {
    driver: {
        type: 'sqlite',
        storage: 'bot.db',
    },
    entities: [
        ...entities_1.default,
    ],
    autoSchemaSync: true,
};
const connectionManager = typeorm_1.getConnectionManager();
exports.default = connectionManager.createAndConnect(connectionOptions)
    .catch(e => console.log(e));
//# sourceMappingURL=init.js.map