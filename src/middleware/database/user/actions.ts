import * as Discord from 'discord.js';
import { User } from './model';
import { Connection, getRepository } from 'typeorm';

export interface CreateUserOptions {
    createdFromBark?: boolean;
    createdFromYTB?: boolean;
}

export type CreateUserFunc =
    (discordUser: Discord.User,
        connection: Connection,
        options?: CreateUserOptions) => Promise<boolean>;

const createUserIfNone: CreateUserFunc =
    async (
        discordUser,
        connection,
        options = {}
    ) => {
        try {
            const userRepo = await getRepository(User, 'commander_connection');

            const user = new User();
            user.id = parseInt(discordUser.id, 10);
            user.name = discordUser.username;

            await userRepo.persist(user);

            return true;
        } catch (e) {
            return false;
        }
    };

export {
    createUserIfNone,
}
