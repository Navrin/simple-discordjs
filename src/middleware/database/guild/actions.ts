import { getRepository } from "typeorm";
import { Guild } from "./model";
import * as Discord from "discord.js";

export const createGuildIfNone = async (message: Discord.Message) => {
    const guildRepo = await getRepository(Guild, "commander_connection");
    const guild = new Guild();
    guild.id = message.guild.id;
    await guildRepo.save(guild);
    return guild;
};
