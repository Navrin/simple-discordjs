import * as Discord from "discord.js";
import { User } from "./model";
import { Connection, getRepository } from "typeorm";

export interface CreateUserOptions {
    createdFromBark?: boolean;
    createdFromYTB?: boolean;
}

export type CreateUserFunc = (
    discordUser: Discord.User,
    connection: Connection,
    options?: CreateUserOptions,
) => Promise<boolean>;

const createUserIfNone: CreateUserFunc = async (
    discordUser,
    connection,
    options = {},
) => {
    try {
        const userRepo = await getRepository(User, "commander_connection");

        const user = new User();
        user.id = discordUser.id;
        user.name = discordUser.username;

        await userRepo.save(user);

        return true;
    } catch (e) {
        return false;
    }
};

export { createUserIfNone };
