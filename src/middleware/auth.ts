import { Role } from './../database/role/model';
import { createGuildIfNone } from './../database/guild/actions';
import { Guild } from './../database/guild/model';
import { getConnectionManager, Connection } from 'typeorm';
import { MiddlewareFunction, CommandFunction, CommandDefinition } from '../commands';
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


/**
 * Auth helper! Uses a enumerable with different roles. If a role is higher or equal to the needed role, then allow the message.
 * 
 * @class Auth
 */
class Auth {
    connection: Connection;
    superuser: string;

    constructor(superuser: string) {
        this.connection = getConnectionManager().get(); // the database is essentially the 'state' anyway.
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
        const userRoleIds = userGuildRoles.map(role => parseInt(role.id, 10));

        const roleRepo = await this.connection.getRepository(Role);
        const roleRecords = await roleRepo
            .createQueryBuilder('role')
            .where('role.guild = :guild', { guild: message.guild.id })
            .andWhere('role.type <= :type', { type: options.authentication })
            .andWhereInIds(userRoleIds)
            .getCount();

        if (roleRecords > 0) {
            return true;
        }

        message.channel.send(`🚫 You're not allowed to use this command.`);
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
                names: ['addrole', 'role'],
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
        // you generally can't access enumerables with enum[key], so instead
        // cast it to any, and access it that way. very hacky.
        const enumType: number | undefined = (<any>RoleTypes)[type.toUpperCase()];
        if (!enumType) {
            message.channel.send(`Role ${type} was not found. Check .h for the role names.`);
            return false;
        }

        const roleRepo = await this.connection.getRepository(Role);
        const guildRepo = await this.connection.getRepository(Guild);
        const guild = await guildRepo.findOneById(parseInt(message.guild.id, 10))
            || await createGuildIfNone(message);

        for (const [, role] of roles) {
            const roleRecord = new Role();
            roleRecord.id = parseInt(role.id, 10);
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