import { getRepository } from 'typeorm';
import { Guild } from './model';
import * as Discord from 'discord.js';

export const createGuildIfNone = async (message: Discord.Message) => {
    const guildRepo = await getRepository(Guild, 'commander_connection');
    const guild = new Guild();
    guild.id = parseInt(message.guild.id, 10);
    await guildRepo.persist(guild);
    message.channel.send(`${message.guild.name} has been added to the database`);
    return guild;
};
