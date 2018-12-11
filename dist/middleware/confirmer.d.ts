import * as Discord from 'discord.js';
export interface Status {
    success: string;
    failure: string;
}
declare const statusCodes: Status;
export declare type Codes = keyof Status;
export interface ConfirmOptions {
    delete: boolean;
    delay: number;
}
declare const confirm: (message: Discord.Message, type: "success" | "failure", reason?: string | undefined, options?: ConfirmOptions) => Promise<void>;
export { confirm, statusCodes, };
