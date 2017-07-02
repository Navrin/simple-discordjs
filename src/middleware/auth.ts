import { Role } from './database/role/model';
import { createGuildIfNone } from './database/guild/actions';
import { Guild } from './database/guild/model';
import { ConnectionManager, ConnectionOptions, createConnection, getRepository } from 'typeorm';
import { MiddlewareFunction, CommandFunction, CommandDefinition } from '../commands.types';
import entities from './database/entities';
import * as Discord from 'discord.js';

/**
 * Roletypes to be checked, using an enumerable instead of string literals.
 * For non role'd commands / all user commands use 0 to check for falsey.
 * @enum {number}
 */
enum RoleTypes {
    ALL = 0,
    MOD,
    ADMIN,
    OWNER,
    SUPERUSER,
};


export interface AuthOptions {
    /**
     * Automatically delete commands that are denied after a set time.
     *
     * @type {boolean}
     * @memberof AuthOptions
     */
    deleteMessages?: boolean;

    deleteMessageDelay?: number;
}

/**
 * Auth helper! Uses a enumerable with different roles. If a role is higher or equal to the needed role, then allow the message.
 *
 * @class Auth
 */
class Auth {
    connection: ConnectionManager;
    superuser: string;
    connectionSettings: ConnectionOptions;
    options: AuthOptions;

    constructor(superuser: string, options: AuthOptions = {}) {
        this.connectionSettings = {
            name: 'commander_connection',
            driver: {
                type: 'sqlite',
                storage: 'commander_entities.db',
            },
            entities,
        };
        this.options = {
            deleteMessages: false,
            deleteMessageDelay: 0,
            ...options,
        };

        createConnection(this.connectionSettings);
         // the database is essentially the 'state' anyway.
        this.superuser = superuser;
    }

    /**
     * Authenticate the user, finding their highest role and checking
     * it against the requirement for the command.
     *
     * @type {MiddlewareFunction}
     * @memberof Auth
     */
    public authenticate: MiddlewareFunction = async (message, options, client) => {
        if (!options.authentication) {
            return true;
        }

        const fastCheck = this.getHighestRole(message);
        // if the user's maximum role is higher or equal to the required
        // authentication needed for the command.
        if (fastCheck >= options.authentication) {
            return fastCheck;
        }

        // user* are Discord.js results for the user.
        const userGuildMember = message.guild.member(message.author);
        const userGuildRoles = Array.from(userGuildMember.roles.values());
        const userRoleIds = userGuildRoles.map(role => role.id);

        const roleRepo = await getRepository(Role, 'commander_connection');
        const roleRecords = await roleRepo
            .createQueryBuilder('role')
            .where('role.guild = :guild', { guild: message.guild.id })
            .andWhere('role.type <= :type', { type: options.authentication })
            .andWhereInIds(userRoleIds)
            .getCount();

        if (roleRecords > 0) {
            return true;
        }

        const msg = await message.channel.send(`🚫 You're not allowed to use this command.`);
        if (this.options.deleteMessages) {
            (Array.isArray(msg))
                ? msg[0].delete(this.options.deleteMessageDelay)
                : msg.delete(this.options.deleteMessageDelay);

            message.delete(this.options.deleteMessageDelay);
        }
        return false;
    }

    /**
     * The chat command for adding roles to a guild.
     *
     * @param {Auth} this
     * @returns
     *
     * @memberof Auth
     */
    public getCommand(this: Auth) {
        const command: CommandDefinition = {
            command: {
                names: ['addrole', 'role', 'setrole'],
                action: this.addRoleCommand,
                parameters: '{{type}} {{mentions}}',
            },
            authentication: RoleTypes.OWNER,
            description: {
                message: 'Add a role to the auth types. You may use either `mod` or `admin`',
                example: '{{prefix}}addrole mod @mods',
            },
        };
        return command;
    }
    /**
     * The command that will passed to the command.action.
     *
     * @private
     * @type {CommandFunction}
     * @memberof Auth
     */
    private addRoleCommand: CommandFunction = async (
        message,
        options,
        parameters: {
            array: string[],
            named: {
                type: string;
            },
        }
        ) => {
        const role = parameters.named.type.toLowerCase();

        if (!['mod', 'admin'].includes(role)) {
            message.channel.send(`${role} was not found as a role.`);
            return false;
        }
        const result = await this.setRole(message, role);
        if (!result) {
            message.channel.send(`There was an issue adding the roles.`);
        }
        return true;
    }
    /**
     * Returns the highest possible role for the user,
     * since all roles are numbers, its easy to compare < or >.
     * @param {Discord.Message} message
     * @returns
     *
     * @memberof Auth
     */
    private getHighestRole(message: Discord.Message) {
        switch (true) {
            case message.author.id === this.superuser:
                return RoleTypes.SUPERUSER;
            case message.author.id === message.guild.ownerID:
                return RoleTypes.OWNER;
            default:
                return RoleTypes.ALL;
        }
    }

    /**
     * Persist a role to the guild's database.
     *
     * @private
     *
     * @memberof Auth
     */
    private setRole = async (message: Discord.Message, type: string): Promise<boolean> => {
        const roles = Array.from(message.mentions.roles);
        if (roles.length <= 0) {
            message.channel.send(`You didn't specify any roles to add.`);
            return false;
        }

        // wot in tarnation?
        // sadly, typescript doesn't let you access an enumerable via the enum[key] way.
        // adding [key: string]: number will incur a compile error. so, any hacks!
        const enumType: number | undefined = (RoleTypes as any)[type.toUpperCase()];
        if (!enumType) {
            message.channel.send(`Role ${type} was not found. Check .h for the role names.`);
            return false;
        }

        const roleRepo = await getRepository(Role, 'commander_connection');
        const guildRepo = await getRepository(Guild, 'commander_connection');
        const guild = await guildRepo.findOneById(message.guild.id)
            || await createGuildIfNone(message);

        for (const [, role] of roles) {
            const roleRecord = new Role();
            roleRecord.id = role.id;
            roleRecord.guild = guild;
            roleRecord.type = enumType;
            roleRepo.persist(roleRecord);
        }

        message.channel.send(`Roles have been added to the command permissions!`);
        return true;
    }
}

export {
    Auth,
    RoleTypes,
};
