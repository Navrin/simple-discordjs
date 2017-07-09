import { oneLineTrim, stripIndents } from 'common-tags';
import * as Discord from 'discord.js';
import { chunk } from 'lodash';
import * as mustache from 'mustache';
import escapeStringRegexp = require('escape-string-regexp');
const reverseMustache = require('reverse-mustache');
import {
    CommandFunction,
    PreMessageFunction,
    MiddlewareFunction,
    CommandSchema,
    CommandList,
    CommandDefinition,
    CommandDescription,
    ParameterDefinition,
    Prefixer,
    CommandsOptions,
    CommandError,
    botTypes,
} from './commands.types';


const defaultOptions: CommandsOptions = {
    botType: 'normal',
    deleteCommandMessage: false,
    deleteMessageDelay: 0,
};

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
    private client: Discord.Client;
    private commands: CommandList;
    private patterns: Map<RegExp, Symbol>;
    private funcs: Map<Symbol, CommandSchema>;
    private middlewares: MiddlewareFunction[];

    /**
     * Creates an instance of Commands.
     * @param {string} prefix  The command prefix used for all
     *                         bot commands. Can be something like `!, y>, |>.`
     *                         Case is automatically ignored.
     * @param {discord.Client} client - discord client, used for easy reference.
     * @memberof Commands
     */
    constructor(prefix: string, client: Discord.Client, options?: CommandsOptions) {
        this.defaultPrefix = {
            str: prefix,
            regex: new RegExp(`(${escapeStringRegexp(prefix)})?(.+)`),
        };
        this.client = client;
        this.commands = {};
        this.options = { defaultOptions, ...options };
        this.patterns = new Map();
        this.funcs = new Map();
        this.middlewares = [];
        return this;
    }

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
    public use(middleware: MiddlewareFunction): Commands {
        this.middlewares.push(middleware);
        return this;
    }

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
    public defineCommand(definition: CommandDefinition): Commands {
        if (definition.command.pattern) {
            this.patternCommand(definition.command.pattern, definition);
            return this;
        }

        const commandNames = definition.command.names;
        const reference = Symbol(commandNames[0]);
        this.funcs.set(reference, {
            definition,
            symbol: reference,
            aliases: commandNames,
            information: definition.description,
        });

        for (const alias of commandNames) {
            // there's probably a much better way to do this
            // use maps / sets?
            // for now, use this for ease and simple code.
            this.commands[alias.toLowerCase()] = reference;
        }

        return this;
    }

    /**
     * Message event, all discord message will be passed into this method, and will assign
     * to the correct command.
     *
     * @param {Discord.Message} message
     * @returns {Promise<void>}
     *
     * @memberof Commands
     */
    public async message(message: Discord.Message): Promise<void> {
        const verifier = this.botVerify(this.options.botType);

        if (!verifier(message)) {
            return;
        }

        try {
            const [chatPrefix, chatCommand, ...parameterArray] = this.parseRequest(message);
            const commands = this.getCommand(chatCommand, chatPrefix, message);

            for (const commandSchema of commands) {
                const prefixed = this.checkPrefix(chatPrefix, commandSchema);
                // check if the function needs a prefix
                const parameters = this.createParameters(parameterArray, commandSchema.definition, message);
                // create the named parameter object.
                await this.checkMiddleware(message, commandSchema.definition);
                // check the middleware's response before executing.
                commandSchema.definition.command.action(message, commandSchema.definition, parameters, this.client, this);
                // rate limiting, don't try to send a million messages at once,
                // otherwise discord will rate limit us
                if (this.options.deleteCommandMessage && prefixed) {
                    message.delete(this.options.deleteMessageDelay || 0)
                        .catch((e) => {
                            // message was probably already deleted by other methods.
                            // TODO: catch permission errors. respond gracefully.
                        });
                }
            }
        } catch (e) {
            if (e instanceof CommandError) {
                return;
            }
            throw e;
        }
    }

    /**
     * Verfies the command's existance, this command is unlikely to be used often.
     * @param command
     */
    public checkCommandExists(command: string): boolean {
        return this.commands[command] !== undefined;
    }

    /**
     * Generates a prefixed help command from the current commands.
     * @param {Discord.RichEmbed} descriptor
     */
    public generateHelp(descriptor?: Discord.RichEmbed): Commands {
        /**
         * Creates prefixed versions of the chat examples.
         * @param {CommandDescription} desc
         * @param {commandSchema} info
         */
        const showPrefixed = (desc: CommandDescription, info: CommandSchema) =>
            info.aliases
                .map((cmd) => {
                    const prefix = this.defaultPrefix.str;
                    const param = info.definition.command.parameters || '';

                    return (info.definition.command.noPrefix || info.pattern)
                        ? `${cmd} ${param}`
                        : `${prefix}${cmd} ${param}`;
                })
                .join(', ');

        const descriptors = [];

        // not using Array.from.
        // causing garbage collector memory leak errors.
        // please dont try to refactor this into a 'pure' function.
        for (const [, desc] of this.funcs) {
            if (!desc.information) {
                continue;
            }
            const prefix = this.defaultPrefix.str;
            const ticks = '```'; // cleaner than trying to escape 3 backticks.

            // use a mustache render to provide a static template with the prefix,
            // can't use string templating, as the prefixes should be dynamic.
            const example = mustache.render(desc.information.example || '', { prefix });
            // example message, newlines are not allowed in the plaintext field content,
            // so provide the newline in the codeblock instead.
            const exampleMessage = (example)
                ? stripIndents`${ticks}ini
                              # Example use of the command:
                              ${example}
                              ${ticks}`
                : '';
            descriptors.push({
                name: `**${showPrefixed(desc.information, desc)}**`,
                value: oneLineTrim`${desc.information.message} 
                                   ${exampleMessage}`,
            });
        }
        // embeds only have a limit of 25 fields per message.
        // therefore, chunk them into groups of 25, and loop through
        // an array of embeds.
        const functionDescriptions = chunk(descriptors, 25);

        // please leave this in :)
        const signature = new Discord.RichEmbed()
            .setAuthor('Discord Commands (developed by Navrin)')
            .setDescription(stripIndents`Use bots with discord.js? Consider checking out
                                         my [commands helper](github.com/Navrin/)`)
            .addField('GitHub', 'https://www.github.com/Navrin')
            .setURL(`https://www.github.com/Navrin`);

        /**
         * The actual help command, generated and registered as a normal command.
         * @param message
         * @param parameters
         */
        const help: CommandFunction = async (message, definition, parameters) => {
            try {
                await message.channel.send(
                    `Help has been sent to your PMs, ${message.author.username}!`,
                );

                await message.author.send(
                    stripIndents`Here are the commands for the bot. 
                    Commands are called with a prefix unless specified otherwise.`,
                );

                // loop through the chunks and send them as embeds.
                for (const chunk of functionDescriptions) {
                    await message.author.send('', { embed: { fields: chunk } });
                }

                // use the custom descriptor embed, if provided.
                if (descriptor) {
                    await message.author.send('', { embed: descriptor });
                }

                // signature to github, to help other developers find this library.
                await message.author.send('', { embed: signature });

                return true;
            } catch (e) {
                return false;
            }
        };

        // Defining help as a command with the pre-existing command function.
        this.defineCommand({
            command: {
                names: ['help', 'h'],
                action: help,
            },
        });

        return this;
    }

    /**
     * Finalize function, makes the code a bit more magic, but cleaner.
     * Basically an alias for listening to the message event.
     *
     * @param {PreMessageFunction} [customFunc]
     * @returns {Commands}
     *
     * @memberof Commands
     */
    public listen(customFunc?: PreMessageFunction): Commands {
        this.client.on('message', (discordMessage) => {
            if (customFunc) {
                customFunc(discordMessage);
            }

            this.message(discordMessage);
        });

        return this;
    }

    /***********
     * PRIVATE *
     ***********/

    private botVerify = (botType: botTypes): (message: Discord.Message) => boolean => {
        switch (botType) {
            case 'self':
                return (message: Discord.Message) => this.client.user.id === message.author.id;
            case 'guildonly':
                return (message: Discord.Message) => message.channel.type === 'text';
            default:
                return (message: Discord.Message) => message.author.id !== this.client.user.id;
        }
    }

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
    private patternCommand(regex: RegExp, definition: CommandDefinition): Commands {
        const commandNames = definition.command.names;
        const reference = Symbol(commandNames[0]);
        this.funcs.set(reference, {
            definition,
            symbol: reference,
            aliases: commandNames,
            information: definition.description,
            pattern: true,
        });

        this.patterns.set(regex, reference);
        return this;
    }

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
    private checkMiddleware(
        message: Discord.Message,
        definition: CommandDefinition): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            for (const ware of this.middlewares) {
                const result = await ware(message, definition, this.client);
                if (!result) {
                    reject(new CommandError('Middlware Rejection!'));
                }
            }
            resolve(true);
        });
    }

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
    private parseRequest(message: Discord.Message): string[] {
        // transforms the message into a more parse-able list
        // y!goodboye target will become
        // ["y!goodboye", "target"]
        const [fullCommand, ...parameters] = message.content.trim().split(/\s/gmi);

        // /(prefix)?(.+)/ message is match to this regex.
        const search = this.defaultPrefix.regex.exec(fullCommand);
        if (!search) {
            throw new CommandError(`Message is malformed, not a correct command request.`);
        }
        // ignore first full match.
        const [, chatPrefix, chatCommand] = search;
        return [chatPrefix, chatCommand, ...parameters];
    }

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
    private getCommand(
        chatCommand: string,
        chatPrefix: string,
        message: Discord.Message,
    ): CommandSchema[] {
        const commands: CommandSchema[] = [];
        const commandReference = this.commands[chatCommand.toLowerCase()];
        const command = this.funcs.get(commandReference);
        if (command) {
            commands.push(command);
        }

        this.checkPatterns(commands, message);

        if (commands.length <= 0) {
            if (chatPrefix === this.defaultPrefix.str
                && !message.content.startsWith(this.defaultPrefix.str.repeat(2))) {
                message.channel.send(oneLineTrim`Command not found! 
                Consider sending ${this.defaultPrefix.str}help.`);
            }
            throw new CommandError(`Command isn't valid.`);
        }

        return commands;
    }

    /**
     * Check the patterns defined with patternCommand.
     *
     * @private
     * @param {commandSchema[]} commands
     * @param {Discord.Message} message
     *
     * @memberof Commands
     */
    private checkPatterns(commands: CommandSchema[], message: Discord.Message) {
        for (const [pattern, symbol] of this.patterns) {
            const regex = new RegExp(pattern);
            if (regex.test(message.content)) {
                const command = this.funcs.get(symbol);
                if (command) {
                    commands.push(command);
                }
            }
        }
    }

    /**
     * Checks if prefix is needed, valid, and that the functor is not a pattern.
     * @param chatPrefix
     * @param command
     */
    private checkPrefix(chatPrefix: string, commandSchema: CommandSchema): boolean {
        if (!chatPrefix && !commandSchema.definition.command.noPrefix && !commandSchema.pattern) {
            // if command is valid + requires a prefix and there is no prefix for the command
            throw new CommandError(`Function requires a prefix.`);
        }
        return !(commandSchema.definition.command.noPrefix || commandSchema.pattern);
    }

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
    private createParameters(parameterArray: string[], definition: CommandDefinition, message: Discord.Message): ParameterDefinition {
        const templater = {
            template: definition.command.parameters,
            content: parameterArray.join(' '),
        };

        try {
            const named =
                (definition.command.parameters)
                    ? reverseMustache(templater)
                    : null;
            return {
                named,
                array: parameterArray,
            };
        } catch (e) {
            message.channel.send(
                oneLineTrim`Please format your ${templater.content || 'empty message'} 
            to match ${(templater.template || 'template not defined?')}`)
                .then((msg) => {
                    if (this.options.deleteCommandMessage) {
                        Array.isArray(msg)
                            ? msg[0].delete(this.options.deleteMessageDelay)
                            : msg.delete(this.options.deleteMessageDelay);
                        message.delete(this.options.deleteMessageDelay);
                    }
                })

            throw new CommandError('The parameters are not correct.');
        }
    }
}
