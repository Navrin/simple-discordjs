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
const common_tags_1 = require("common-tags");
const Discord = require("discord.js");
const lodash_1 = require("lodash");
const mustache = require("mustache");
const escapeStringRegexp = require("escape-string-regexp");
const reverseMustache = require('reverse-mustache');
const commands_types_1 = require("./commands.types");
const defaultOptions = {
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
class Commands {
    /**
     * Creates an instance of Commands.
     * @param {string} prefix  The command prefix used for all
     *                         bot commands. Can be something like `!, y>, |>.`
     *                         Case is automatically ignored.
     * @param {discord.Client} client - discord client, used for easy reference.
     * @memberof Commands
     */
    constructor(prefix, client, options) {
        /***********
         * PRIVATE *
         ***********/
        this.botVerify = (botType) => {
            switch (botType) {
                case 'self':
                    return (message) => this.client.user.id === message.author.id;
                case 'guildonly':
                    return (message) => message.channel.type === 'text';
                default:
                    return (message) => message.author.id !== this.client.user.id;
            }
        };
        this.defaultPrefix = {
            str: prefix,
            regex: new RegExp(`(${escapeStringRegexp(prefix)})?(.+)`),
        };
        this.client = client;
        this.commands = {};
        this.options = Object.assign({ defaultOptions }, options);
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
    use(middleware) {
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
    defineCommand(definition) {
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
    message(message) {
        return __awaiter(this, void 0, void 0, function* () {
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
                    yield this.checkMiddleware(message, commandSchema.definition);
                    // check the middleware's response before executing.
                    commandSchema.definition.command.action(message, commandSchema.definition, parameters, this.client);
                    // rate limiting, don't try to send a million messages at once,
                    // otherwise discord will rate limit us
                    if (this.options.deleteCommandMessage && prefixed) {
                        message.delete(this.options.deleteMessageDelay || 0);
                    }
                }
            }
            catch (e) {
                if (e instanceof commands_types_1.CommandError) {
                    return;
                }
                throw e;
            }
        });
    }
    /**
     * Generates a prefixed help command from the current commands.
     * @param {Discord.RichEmbed} descriptor
     */
    generateHelp(descriptor) {
        /**
         * Creates prefixed versions of the chat examples.
         * @param {CommandDescription} desc
         * @param {commandSchema} info
         */
        const showPrefixed = (desc, info) => info.aliases
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
                ? common_tags_1.stripIndents `${ticks}ini
                              # Example use of the command:
                              ${example}
                              ${ticks}`
                : '';
            descriptors.push({
                name: `**${showPrefixed(desc.information, desc)}**`,
                value: common_tags_1.oneLineTrim `${desc.information.message} 
                                   ${exampleMessage}`,
            });
        }
        // embeds only have a limit of 25 fields per message.
        // therefore, chunk them into groups of 25, and loop through
        // an array of embeds.
        const functionDescriptions = lodash_1.chunk(descriptors, 25);
        // please leave this in :)
        const signature = new Discord.RichEmbed()
            .setAuthor('Discord Commands (developed by Navrin)')
            .setDescription(common_tags_1.stripIndents `Use bots with discord.js? Consider checking out
                                         my [commands helper](github.com/Navrin/)`)
            .addField('GitHub', 'https://www.github.com/Navrin')
            .setURL(`https://www.github.com/Navrin`);
        /**
         * The actual help command, generated and registered as a normal command.
         * @param message
         * @param parameters
         */
        const help = (message, definition, parameters) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield message.channel.send(`Help has been sent to your PMs, ${message.author.username}!`);
                yield message.author.send(common_tags_1.stripIndents `Here are the commands for the bot. 
                    Commands are called with a prefix unless specified otherwise.`);
                // loop through the chunks and send them as embeds.
                for (const chunk of functionDescriptions) {
                    yield message.author.send('', { embed: { fields: chunk } });
                }
                // use the custom descriptor embed, if provided.
                if (descriptor) {
                    yield message.author.send('', { embed: descriptor });
                }
                // signature to github, to help other developers find this library.
                yield message.author.send('', { embed: signature });
                return true;
            }
            catch (e) {
                return false;
            }
        });
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
    listen(customFunc) {
        this.client.on('message', (discordMessage) => {
            if (customFunc) {
                customFunc(discordMessage);
            }
            this.message(discordMessage);
        });
        return this;
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
    patternCommand(regex, definition) {
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
    checkMiddleware(message, definition) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            for (const ware of this.middlewares) {
                const result = yield ware(message, definition, this.client);
                if (!result) {
                    reject(new commands_types_1.CommandError('Middlware Rejection!'));
                }
            }
            resolve(true);
        }));
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
    parseRequest(message) {
        // transforms the message into a more parse-able list
        // y!goodboye target will become
        // ["y!goodboye", "target"]
        const [fullCommand, ...parameters] = message.content.trim().split(/\s/gmi);
        // /(prefix)?(.+)/ message is match to this regex.
        const search = this.defaultPrefix.regex.exec(fullCommand);
        if (!search) {
            throw new commands_types_1.CommandError(`Message is malformed, not a correct command request.`);
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
    getCommand(chatCommand, chatPrefix, message) {
        const commands = [];
        const commandReference = this.commands[chatCommand.toLowerCase()];
        const command = this.funcs.get(commandReference);
        if (command) {
            commands.push(command);
        }
        this.checkPatterns(commands, message);
        if (commands.length <= 0) {
            if (chatPrefix === this.defaultPrefix.str
                && !message.content.startsWith(this.defaultPrefix.str.repeat(2))) {
                message.channel.send(common_tags_1.oneLineTrim `Command not found! 
                Consider sending ${this.defaultPrefix.str}help.`);
            }
            throw new commands_types_1.CommandError(`Command isn't valid.`);
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
    checkPatterns(commands, message) {
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
    checkPrefix(chatPrefix, commandSchema) {
        if (!chatPrefix && !commandSchema.definition.command.noPrefix && !commandSchema.pattern) {
            // if command is valid + requires a prefix and there is no prefix for the command
            throw new commands_types_1.CommandError(`Function requires a prefix.`);
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
    createParameters(parameterArray, definition, message) {
        const templater = {
            template: definition.command.parameters,
            content: parameterArray.join(' '),
        };
        try {
            const named = (definition.command.parameters)
                ? reverseMustache(templater)
                : null;
            return {
                named,
                array: parameterArray,
            };
        }
        catch (e) {
            message.channel.send(common_tags_1.oneLineTrim `Please format your ${templater.content || 'empty message'} 
            to match ${(templater.template || 'template not defined?')}`);
            throw new commands_types_1.CommandError('The parameters are not correct.');
        }
    }
}
exports.default = Commands;
//# sourceMappingURL=commands.js.map