import * as Discord from 'discord.js';
import { PreMessageFunction, MiddlewareFunction, CommandDefinition, Prefixer, CommandsOptions } from './commands.types';
/**
 * Command Class. Allows for easier usage and management of
 * bot commands. Usage will be as follows.
 *
 * The command class supports middlewares, which on rejection will
 * halt the chain and stop the message from being sent.
 * @example
 * ```typescript
 *
 * import Commands, { RateLimiter, RoleTypes, Auth } from 'discordjs-command-helper'
 *
 * new Commands(prefix, client, options)
 *  .use(rateLimit.protect)
 *  .use(auth.authenticate)
 *  .defineCommand(auth.getCommand())
 *  .defineCommand({
 *      command: {
 *          names: ['p', 'ping'],
 *          action: ping,
 *      },
 *      description: {
 *          message: 'Replies with pong.',
 *          example: '{{prefix}}ping',
 *      },
 *  })
 *
 * ```
 * @class Commands
 * @export
 */
export default class Commands {
    readonly defaultPrefix: Prefixer;
    readonly options: CommandsOptions;
    private client;
    private commands;
    private patterns;
    private funcs;
    private middlewares;
    /**
     * Creates an instance of Commands.
     * @param {string} prefix  The command prefix used for all
     *                         bot commands. Can be something like `!, y>, |>.`
     *                         Case is automatically ignored.
     * @param {discord.Client} client - discord client, used for easy reference.
     * @memberof Commands
     */
    constructor(prefix: string, client: Discord.Client, options?: CommandsOptions);
    /**
     * Middleware Support. Middlewares will take 2 arguments.
     * `(message: Discord.Message, client: Discord.Client)`
     * and will always return a Promise that is either resolved
     * as true or false. On true, the function will not be halted.
     * @example
     * ```typescript
     *
     * .use(async (message, client) => {
     *      message.channel.send(`Middleware check: :ok:`);
     *      return true;
     *  })
     *
     * ```
     * @param {MiddlewareFunction} middleware
     */
    use(middleware: MiddlewareFunction): Commands;
    /**
     * defineCommand is the basis of the command class.
     * It allows for easier use of commands via a chained function call.
     *
     * NOTE: simple command used to be just command, but has changed to support the
     * different upcomming command schemes.
     * @example
     * ```typescript
     *
     * .defineCommand({
     *      command: {
     *          names: ['p', 'ping'],
     *          action: ping,
     *      },
     *      description: {
     *          message: 'Replies with pong.',
     *          example: '{{prefix}}ping',
     *      },
     * })
     *
     * ```
     * @param {string[]} commandName
     * @param {CommandInterface} definition
     * @returns {Commands}
     *
     * @memberof Commands
     */
    defineCommand(definition: CommandDefinition): Commands;
    /**
     * Message event, all discord message will be passed into this method, and will assign
     * to the correct command.
     *
     * @param {Discord.Message} message
     * @returns {Promise<void>}
     *
     * @memberof Commands
     */
    message(message: Discord.Message): Promise<void>;
    /**
     * Generates a prefixed help command from the current commands.
     * @param {Discord.RichEmbed} descriptor
     */
    generateHelp(descriptor?: Discord.RichEmbed): Commands;
    /**
     * Finalize function, makes the code a bit more magic, but cleaner.
     * Basically an alias for listening to the message event.
     *
     * @param {PreMessageFunction} [customFunc]
     * @returns {Commands}
     *
     * @memberof Commands
     */
    listen(customFunc?: PreMessageFunction): Commands;
    /***********
     * PRIVATE *
     ***********/
    private botVerify;
    /**
     * Pattern Command, for regex matching commands.
     * requires a commandNames parameter for help command support, and
     * a named symbol.
     * @param {RegExp} regex The regex that will be matched on a message, can be matched multiple times.
     * @param {string[]} commandNames The 'basic' words that will be matched with the regex, to be shown in the help.
     * @param {CommandDefinition} definition Standard CommandDefinition object, with action included.
     * @returns {Commands}
     *
     * @memberof Commands
     */
    private patternCommand(regex, definition);
    /**
     * Middleware loop, will check each middleware and
     * throw an Error on a non-ok result for the ware.
     *
     * @private
     * @param {Discord.Message} message The raw message passed by discord
     * @param {CommandDefinition} definition The command definition that was matched.
     * @returns {Promise<boolean>}
     *
     * @memberof Commands
     */
    private checkMiddleware(message, definition);
    /**
     * Parse the discord message and split it into its
     * appropriate parameters for ease of use.
     *
     * @private
     * @param {Discord.Message} message
     * @returns {string[]}
     *
     * @memberof Commands
     */
    private parseRequest(message);
    /**
     * Get command, and the correct function for it from the func cache.
     *
     * @private
     * @param {string} chatCommand
     * @param {string} chatPrefix
     * @param {Discord.Message} message
     * @returns {commandSchema}
     *
     * @memberof Commands
     */
    private getCommand(chatCommand, chatPrefix, message);
    /**
     * Check the patterns defined with patternCommand.
     *
     * @private
     * @param {commandSchema[]} commands
     * @param {Discord.Message} message
     *
     * @memberof Commands
     */
    private checkPatterns(commands, message);
    /**
     * Checks if prefix is needed, valid, and that the functor is not a pattern.
     * @param chatPrefix
     * @param command
     */
    private checkPrefix(chatPrefix, commandSchema);
    /**
     * Creates a parameter object from the user arguments.
     * If the arugments aren't correct, send a null.
     * Note you cannot ignore arguments, this ensures validation
     * @param {string[]} parameterArray
     * @param {CommandDefinition} definition
     * @returns {Parameterdefinition}
     *
     * @memberof Commands
     */
    private createParameters(parameterArray, definition, message);
}
