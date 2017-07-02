"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const model_1 = require("./database/role/model");
const actions_1 = require("./database/guild/actions");
const model_2 = require("./database/guild/model");
const typeorm_1 = require("typeorm");
const entities_1 = require("./database/entities");
/**
 * Roletypes to be checked, using an enumerable instead of string literals.
 * For non role'd commands / all user commands use 0 to check for falsey.
 * @enum {number}
 */
var RoleTypes;
(function (RoleTypes) {
    RoleTypes[RoleTypes["ALL"] = 0] = "ALL";
    RoleTypes[RoleTypes["MOD"] = 1] = "MOD";
    RoleTypes[RoleTypes["ADMIN"] = 2] = "ADMIN";
    RoleTypes[RoleTypes["OWNER"] = 3] = "OWNER";
    RoleTypes[RoleTypes["SUPERUSER"] = 4] = "SUPERUSER";
})(RoleTypes || (RoleTypes = {}));
exports.RoleTypes = RoleTypes;
;
/**
 * Auth helper! Uses a enumerable with different roles. If a role is higher or equal to the needed role, then allow the message.
 *
 * @class Auth
 */
class Auth {
    constructor(superuser, options = {}) {
        /**
         * Authenticate the user, finding their highest role and checking
         * it against the requirement for the command.
         *
         * @type {MiddlewareFunction}
         * @memberof Auth
         */
        this.authenticate = (message, options, client) => __awaiter(this, void 0, void 0, function* () {
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
            const roleRepo = yield typeorm_1.getRepository(model_1.Role, 'commander_connection');
            const roleRecords = yield roleRepo
                .createQueryBuilder('role')
                .where('role.guild = :guild', { guild: message.guild.id })
                .andWhere('role.type <= :type', { type: options.authentication })
                .andWhereInIds(userRoleIds)
                .getCount();
            if (roleRecords > 0) {
                return true;
            }
            const msg = yield message.channel.send(`🚫 You're not allowed to use this command.`);
            if (this.options.deleteMessages) {
                (Array.isArray(msg))
                    ? msg[0].delete(this.options.deleteMessageDelay)
                    : msg.delete(this.options.deleteMessageDelay);
                message.delete(this.options.deleteMessageDelay);
            }
            return false;
        });
        /**
         * The command that will passed to the command.action.
         *
         * @private
         * @type {CommandFunction}
         * @memberof Auth
         */
        this.addRoleCommand = (message, options, parameters) => __awaiter(this, void 0, void 0, function* () {
            const role = parameters.named.type.toLowerCase();
            if (!['mod', 'admin'].includes(role)) {
                message.channel.send(`${role} was not found as a role.`);
                return false;
            }
            const result = yield this.setRole(message, role);
            if (!result) {
                message.channel.send(`There was an issue adding the roles.`);
            }
            return true;
        });
        /**
         * Persist a role to the guild's database.
         *
         * @private
         *
         * @memberof Auth
         */
        this.setRole = (message, type) => __awaiter(this, void 0, void 0, function* () {
            const roles = Array.from(message.mentions.roles);
            if (roles.length <= 0) {
                message.channel.send(`You didn't specify any roles to add.`);
                return false;
            }
            // wot in tarnation?
            // sadly, typescript doesn't let you access an enumerable via the enum[key] way.
            // adding [key: string]: number will incur a compile error. so, any hacks!
            const enumType = RoleTypes[type.toUpperCase()];
            if (!enumType) {
                message.channel.send(`Role ${type} was not found. Check .h for the role names.`);
                return false;
            }
            const roleRepo = yield typeorm_1.getRepository(model_1.Role, 'commander_connection');
            const guildRepo = yield typeorm_1.getRepository(model_2.Guild, 'commander_connection');
            const guild = (yield guildRepo.findOneById(message.guild.id))
                || (yield actions_1.createGuildIfNone(message));
            for (const [, role] of roles) {
                const roleRecord = new model_1.Role();
                roleRecord.id = role.id;
                roleRecord.guild = guild;
                roleRecord.type = enumType;
                roleRepo.persist(roleRecord);
            }
            message.channel.send(`Roles have been added to the command permissions!`);
            return true;
        });
        this.connectionSettings = {
            name: 'commander_connection',
            driver: {
                type: 'sqlite',
                storage: 'commander_entities.db',
            },
            entities: entities_1.default,
        };
        this.options = Object.assign({ deleteMessages: false, deleteMessageDelay: 0 }, options);
        typeorm_1.createConnection(this.connectionSettings);
        // the database is essentially the 'state' anyway.
        this.superuser = superuser;
    }
    /**
     * The chat command for adding roles to a guild.
     *
     * @param {Auth} this
     * @returns
     *
     * @memberof Auth
     */
    getCommand() {
        const command = {
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
     * Returns the highest possible role for the user,
     * since all roles are numbers, its easy to compare < or >.
     * @param {Discord.Message} message
     * @returns
     *
     * @memberof Auth
     */
    getHighestRole(message) {
        switch (true) {
            case message.author.id === this.superuser:
                return RoleTypes.SUPERUSER;
            case message.author.id === message.guild.ownerID:
                return RoleTypes.OWNER;
            default:
                return RoleTypes.ALL;
        }
    }
}
exports.Auth = Auth;
//# sourceMappingURL=auth.js.map