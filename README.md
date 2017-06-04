# DiscordJS-Commands

[![TypeScript](https://badges.frapsoft.com/typescript/version/typescript-next.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![David](https://david-dm.org/Navrin/yifflesworth.svg)](https://david-dm.org)
![npm](https://img.shields.io/npm/l/express.svg?style=flat-square)

The commander class was originally designed to assist a programmer with the tedious task of setting up commands for Discord.js.

The syntax for the bot is as follows:

```typescript
new Commands(configJson.prefix, client)
    .use(rateLimit.protect)
    .use(auth.authenticate)
    .defineCommand({
        command: {
            name: ['p', 'ping'],
            action: ping,
        },
        description: 'Replies with pong.',
    })
    .defineCommand({
        command: {
            name: ['pang', 'pong'],
            action: pinger,
            pattern: /p[oa]ng/,
        },
        description: 'A joke reply to pong',
    })
    .generateHelp()
    .listen();
```

## Commands Middlware Support

The `.use` syntax on the class is a form of middleware, accepting a promise that returns a boolean condition. The message chain will fail, and not send if the condition returns false.

```typescript
new Commands(configJson.prefix, client)
    .use(async (message, options client) => {
        // do stuff to check the message.
        return true;
    });
```

The middleware demonstrated above is a spam limiter, checking an auto-clearing object and rejecting a message middleware if they are above the spam limit.

### Middlewares included

#### Rate Limiter

A simple rate limiter that prevents users from flooding a bot with commands.

Syntax is as follows

```typescript
const limiter = new RateLimiter(['messages allowed per window'],
                                ['window length in seconds'])
```

A window is the period of time the user will be allowed to send message, within the limit. After the limit is reached, the bot will not respond to any messages from the user until the window is reset. Pass to the middleware acceptor with,

```typescript
new Commander(prefix, client)
    .use(limiter.protect)
```

### **Authentication Module**

The auth module exposes a middleware function and a command object for the user. It uses a SQLite database to keep tract of what roles have what permissions on a server. All the roles are set up in a enumerable with 5 properties.

```typescript
enum RoleTypes {
    ALL = 0,
    MOD,
    ADMIN,
    OWNER,
    SUPERUSER,
};
```

**Due to properties being simple numbers, roles have hierarchy. A superuser will have access to all commands as it is the highest number.**

`Superuser` should be your user ID.

`Owner` is automatically infered from the server owner exposed from discord.

`Admin | Mod` is set via the `!addrole` command. Only server owners or the superuser may use addrole.

Usage is as follows:

```typescript

const auth = new Auth(superuserToken); // superuser token should be your discord user ID, you will have access to all commands.

new Commands(prefix, client)
    .use(auth.authenticate)
    .defineCommand(auth.getCommand())

```

### Command Helper

#### Simple Command

The `.defineCommand` function defines a chat command that takes an `action`, a function that will be called once the command is verified and registered. An optional `description` is passed to generate a help command with the `.generateHelp` command.

```typescript
    .defineCommand({
        command: {
            name: ['action', 'a', 'actionname']
            action:
                (message: Discord.Message,
                options: CommandOptions,
                parameters: ParameterOptions,
                client: Discord.Client) => Promise<boolean>,
            parameters: '{{param1}} {{param2}}',
            noPrefix: false,
            // a boolean that represents if the function
            // requres an explicit call, like .action or !action
            // additional options can be found in the full documentation.

        },
        description:  {
            message: 'A description of the function, for the generator',
            example: '{{prefix}}action',
        },
    });
```

For regex matching, pass a `pattern: RegExp` in the command object.

## Parameter matching

Reverse string templating is supported with the `parameter` option in the function description. Parameters are defined with `{{parameter}}`, and are passed as an object to the action. Strings must match to register, you cannot ignore parts of message, e.g. `'action verb noun' !== '{{action}} ignore {{noun}}'`. Instead, match it and add a junk name to it, e.g. `'action verb noun' === '{{action}} {{ignored}} {{noun}}'`.

```typescript
// called with .param ADD 1 2.
    .defineCommand(['param'], {
        command: {
            action: (message, options, params) => {
                console.log(params);
                // { directive: 'ADD', num1: '1', num2: '2' }
            },
            parameters: '{{directive}} {{num1}} {{num2}}',
        }
    })
```

### Help Generator

The command `.generateHelp(descriptor?)` will automatically take the current command list and generate a series of `RichEmbed` objects that will be DM'd to the user who calls either `h` or `help` with the assigned prefix. The function also accepts an optional `RichEmbed` element for a custom message to be sent after the commands.

In the example parameter in the description object, `{{prefix}}` is templated to return the default prefix of the command class.

```typescript
{
    ...options
    description: {
        message: 'The description of the chat command',
        example: 'The chat command, e.g. {{prefix}}command',
    }
}
```

The returned help function looks as follows:

![helper](https://i.imgur.com/wBOdcK6.png)

*Please do not remove the signature from the source code, it would be appreciated if you left that in for developers looking to use this library.*
