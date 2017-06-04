import * as Discord from 'discord.js';
import { Connection } from 'typeorm';
export interface CreateUserOptions {
    createdFromBark?: boolean;
    createdFromYTB?: boolean;
}
export declare type CreateUserFunc = (discordUser: Discord.User, connection: Connection, options?: CreateUserOptions) => Promise<boolean>;
declare const createUserIfNone: CreateUserFunc;
export { createUserIfNone };
