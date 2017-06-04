import * as Discord from 'discord.js';
import { oneLineTrim, stripIndents } from 'common-tags';
import { chunk } from 'lodash';
import * as mustache from 'mustache';
import escapeStringRegexp = require('escape-string-regexp');
import { RoleTypes } from './middleware/auth';

const reverseMustache = require('reverse-mustache');

// send true if the command worked fine.
export type CommandFunction =
    (message: Discord.Message,
        definition: CommandDefinition,
        parameters: ParameterDefinition,
        client: Discord.Client) => Promise<boolean>;

/// Note this is not a middleware, it cannot shut down the message chain.
export type PreMessageFunction =
    (message: Discord.Message) => Promise<void>;

export type MiddlewareFunction =
    (message: Discord.Message,
        definition: CommandDefinition,
        client: Discord.Client) => Promise<boolean>;
/**
 * Reference a function cache instead of creating
 * a new instance of a function for every aliased command.
 */
export interface CommandObject {
    definition: CommandDefinition;
    information?: CommandDescription;
    symbol: Symbol;
    aliases: string[];
    pattern?: boolean;
}

export interface CommandList {
    [key: string]: Symbol;
}

/**
 * Specifies what definition you can pass for a function.
 * @interface CommandDefinition
 */
export interface CommandDefinition {
    custom?: any;
    /** the actual function that will use the message */
    command: CommandAction;
    /** A description object for autogenerated help commands. */
    description?: CommandDescription;
    /** Authentication enumerable type. */
    authentication?: RoleTypes;
}

export interface CommandAction {
    action: CommandFunction;
    names: string[];
        /**  if true, the message wont need a chat prefix to be called */
    noPrefix?: boolean;
    /** The optional parameters the function will take
     *   parameters: '{{actionOption}} with {{value}}',
     *
     *  will result in a command parameters to equal
     *  when called with !action hello with person
     *
     *  { array: ['!action', 'hello', 'with', 'person'],
     *   named: { actionOption: 'hello', value: 'person' }}
     */
    parameters?: string;
    /**
     * Instead of seperating simpleCommand and pattern command, simply check for
     * a regex, if so, call a private patternCommand instead.
     * @type {RegExp}
     * @memberof CommandAction
     */
    pattern?: RegExp;
}

export interface CommandDescription {
    /** The message to be shown to the user in the command description. */
    message: string;
    /** An example in the code block for the use of the command. */
    example?: string;
}

export interface ParameterDefinition {
    array: string[];
    named?: {
        [key: string]: string;
    };
}

export interface Prefixer {
    str: string;
    regex: RegExp;
}

/** Don't catch all the errors, just the commandError ones. */
export class CommandError extends Error { };

/**
 * Command Class. Allows for easier usage and management of
 * bot commands. Usage will be as follows.
 *
 * The command class supports middlewares, which on rejection will
 * halt the chain and stop the message from being sent.
 * @example
 * ```typescript
 *
 * new Commands(prefix, client)
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
export class Commands {
    readonly defaultPrefix: Prefixer;
    private client: Discord.Client;
    private commands: CommandList;
    private patterns: Map<RegExp, Symbol>;
    private funcs: Map<Symbol, CommandObject>;
    private middlewares: MiddlewareFunction[];
    /**
     * Creates an instance of Commands.
     * @param {string} prefix  The command prefix used for all
     *                         bot commands. Can be something like `!, y>, |>.`
     *                         Case is automatically ignored.
     * @param {discord.Client} client - discord client, used for easy reference.
     * @memberof Commands
     */
    constructor(prefix: string, client: Discord.Client) {
        this.defaultPrefix = {
            str: prefix,
            regex: new RegExp(`(${escapeStringRegexp(prefix)})?(.+)`),
        };
        this.client = client;
        this.commands = {};
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
        // TODO: add more functionality to the definition paramater,
        // roles, verification, etc.
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
        if (message.author.id === this.client.user.id) {
            return;
        }
        try {
            const [chatPrefix, chatCommand, ...parameterArray] = this.parseRequest(message);
            const commands = this.getCommand(chatCommand, chatPrefix, message);

            for (const commandObject of commands) {
                this.checkPrefix(chatPrefix, commandObject);
                // check if the function needs a prefix
                const parameters = this.createParameters(parameterArray, commandObject.definition, message);
                // create the named parameter object.
                await this.checkMiddleware(message, commandObject.definition);
                // check the middleware's response before executing.
                commandObject.definition.command.action(message, commandObject.definition, parameters, this.client);
                // rate limiting, don't try to send a million messages at once,
                // otherwise discord will rate limit us
            }
        } catch (e) {
            if (e instanceof CommandError) {
                return;
            }
            throw e;
        }
    }
    /**
     * Generates a prefixed help command from the current commands.
     * @param {Discord.RichEmbed} descriptor
     */
    public generateHelp(descriptor?: Discord.RichEmbed): Commands {
        /**
         * Creates prefixed versions of the chat examples.
         * @param {CommandDescription} desc
         * @param {CommandObject} info
         */
        const showPrefixed = (desc: CommandDescription, info: CommandObject) =>
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
     * @returns {CommandObject}
     *
     * @memberof Commands
     */
    private getCommand(
        chatCommand: string,
        chatPrefix: string,
        message: Discord.Message,
    ): CommandObject[] {
        const commands: CommandObject[] = [];
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
     * @param {CommandObject[]} commands
     * @param {Discord.Message} message
     *
     * @memberof Commands
     */
    private checkPatterns(commands: CommandObject[], message: Discord.Message) {
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
    private checkPrefix(chatPrefix: string, commandObject: CommandObject) {
        if (!chatPrefix && !commandObject.definition.command.noPrefix && !commandObject.pattern) {
            // if command is valid + requires a prefix and there is no prefix for the command
            throw new CommandError(`Function requires a prefix.`);
        }
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
            message.channel.send(oneLineTrim`Please format your ${templater.content || 'empty message'} 
            to match ${(templater.template || '').replace(/({{)|(}})/, '')}`);
            throw new CommandError('The parameters are not correct.');
        }
    }
}
