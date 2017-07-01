import { ConnectionManager, ConnectionOptions } from 'typeorm';
import { MiddlewareFunction, CommandDefinition } from '../commands.types';
/**
 * Roletypes to be checked, using an enumerable instead of string literals.
 * For non role'd commands / all user commands use 0 to check for falsey.
 * @enum {number}
 */
declare enum RoleTypes {
    ALL = 0,
    MOD = 1,
    ADMIN = 2,
    OWNER = 3,
    SUPERUSER = 4,
}
/**
 * Auth helper! Uses a enumerable with different roles. If a role is higher or equal to the needed role, then allow the message.
 *
 * @class Auth
 */
declare class Auth {
    connection: ConnectionManager;
    superuser: string;
    connectionSettings: ConnectionOptions;
    constructor(superuser: string);
    /**
     * Authenticate the user, finding their highest role and checking
     * it against the requirement for the command.
     *
     * @type {MiddlewareFunction}
     * @memberof Auth
     */
    authenticate: MiddlewareFunction;
    /**
     * The chat command for adding roles to a guild.
     *
     * @param {Auth} this
     * @returns
     *
     * @memberof Auth
     */
    getCommand(this: Auth): CommandDefinition;
    /**
     * The command that will passed to the command.action.
     *
     * @private
     * @type {CommandFunction}
     * @memberof Auth
     */
    private addRoleCommand;
    /**
     * Returns the highest possible role for the user,
     * since all roles are numbers, its easy to compare < or >.
     * @param {Discord.Message} message
     * @returns
     *
     * @memberof Auth
     */
    private getHighestRole(message);
    /**
     * Persist a role to the guild's database.
     *
     * @private
     *
     * @memberof Auth
     */
    private setRole;
}
export { Auth, RoleTypes };
