import * as Discord from 'discord.js';
import { User } from './model';
import { Connection } from 'typeorm';

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
            const userRepo = await connection.getRepository(User);

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
