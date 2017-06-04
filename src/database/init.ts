import { getConnectionManager, ConnectionOptions, Connection } from 'typeorm';
import entities from './entities';

import 'reflect-metadata';

const connectionOptions: ConnectionOptions = {
    driver: {
        type: 'sqlite',
        storage: 'bot.db',
    },
    entities: [
        ...entities,
    ],
    autoSchemaSync: true,
};


const connectionManager = getConnectionManager();
export { Connection };

export default connectionManager.createAndConnect(connectionOptions)
    .catch(e => console.log(e));
