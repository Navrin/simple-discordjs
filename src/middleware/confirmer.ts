import * as Discord from 'discord.js';

export interface Status {
    success: string;
    failure: string;
}

const statusCodes: Status = {
    success: '✅',
    failure: '❌',
};

export type Codes = keyof Status;

export interface ConfirmOptions {
    delete: boolean;
    delay: number;
}

const confirm = async (
    message: Discord.Message,
    type: Codes,
    reason?: string,
    options: ConfirmOptions = {
        delete: true,
        delay: 3000,
    },
) => {
    message.react(statusCodes[type]);
    if (reason) {
        const replyMessage = await message.reply(`**Alert:** ${reason}`);
        if (options.delete) {
            const reply = Array.isArray(replyMessage) ? replyMessage[0] : replyMessage;
            reply.delete(options.delay || 3000);
        }

    }

    if (options.delete) {
        message.delete(options.delay || 3000);

    }
};

export {
    confirm,
    statusCodes,
};

