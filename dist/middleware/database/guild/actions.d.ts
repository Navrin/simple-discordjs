import { Guild } from './model';
import * as Discord from 'discord.js';
export declare const createGuildIfNone: (message: Discord.Message) => Promise<Guild>;
