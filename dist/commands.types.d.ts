import { RoleTypes } from './middleware/auth';
import * as Discord from 'discord.js';
import Commands from './commands';
/** send true if the command worked fine. */
export declare type CommandFunction = (message: Discord.Message, definition: CommandDefinition, parameters: ParameterDefinition, client: Discord.Client, self: Commands, ...params: any[]) => Promise<boolean | void>;
/** Note this is not a middleware, it cannot shut down the message chain. */
export declare type PreMessageFunction = (message: Discord.Message) => Promise<void>;
export declare type MiddlewareFunction = (message: Discord.Message, definition: CommandDefinition, client: Discord.Client) => Promise<boolean>;
/**
 * Reference a function cache instead of creating
 * a new instance of a function for every aliased command.
 */
export interface CommandSchema {
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
    command: CommandActionDescriber;
    /** A description object for autogenerated help commands. */
    description?: CommandDescription;
    /** Authentication enumerable type. */
    authentication?: RoleTypes;
}
export interface CommandActionDescriber {
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
export declare class CommandError extends Error {
}
export declare type botTypes = 'normal' | 'self' | 'guildonly';
export interface CommandsOptions {
    /**
     * Valid bot types
     * Normal replies to all text channels, including guildonly
     * Self bot, only replies to you and only you.
     * Guildonly will only work in discord guild channels
     *
     * @type {botTypes}
     * @memberof CommandsOptions
     */
    botType: botTypes;
    /**
     * If someone types a prefixed command like !action,
     * delete the message on successful reply
     *
     * @type {boolean}
     * @memberof CommandsOptions
     */
    deleteCommandMessage?: boolean;
    /**
     * Defines the amount of time the !action command will
     * stay in the channel until it is deleted.
     *
     * @type {number}
     * @memberof CommandsOptions
     */
    deleteMessageDelay?: number;
    /**
     * Automatically delete error messages
     * // TODO: catch all errors.
     * @type {number}
     * @memberof CommandsOptions
     */
    killErrorMessages?: boolean;
}
