import { MiddlewareFunction } from '../commands.types';

/**
 * @param {string} boolean - if true, don't listen to commands
 */
export interface Limiter {
    [key: string]: number;
}


export class RateLimiter {
    count: Limiter;
    intervalMessageLimit: number;
    intervalClearLength: number;
    /**
     * Creates a new Rate Limiter, use RateLimiter.limit for the middleware.
     * @param {number} intervalMessageLimit - How long a user can send messages during
     *                                        their window before the message is denied.
     * @param {number} intervalClearLength - How long a window will last before being cleared.
     */
    constructor(intervalMessageLimit: number, intervalClearLengthInSeconds: number) {
        this.intervalClearLength = intervalClearLengthInSeconds;
        this.intervalMessageLimit = intervalMessageLimit;
        this.count = {};
    }

    /**
     * Middleware for the limiter, to be used with the Command class.
     * @param message
     * @param client
     */
    public protect: MiddlewareFunction = async (message, options, client) => {
        return this.checkUser(message.author.id);
    }

    /**
     * Check if use is allowed to send more commands to the bot.
     * @param id
     */
    private checkUser(this: RateLimiter, id: string): boolean {
        if (!this.count[id]) {
            this.deferClear(id);
        }

        this.count[id] = this.count[id] + 1 || 1;

        if (this.count[id] > this.intervalMessageLimit) {
            return false;
        }

        return true;
    }

    /**
     * Helper method
     * Times out the user filter.
     * @param id
     */
    private deferClear(id: string) {
        setTimeout(
            () => {
                this.count[id] = 0;
            },
            this.intervalClearLength * 1000);
    }
}

