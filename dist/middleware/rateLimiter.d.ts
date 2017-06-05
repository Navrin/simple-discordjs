import { MiddlewareFunction } from '../commands';
/**
 * @param {string} boolean - if true, don't listen to commands
 */
export interface Limiter {
    [key: string]: number;
}
export declare class RateLimiter {
    count: Limiter;
    intervalMessageLimit: number;
    intervalClearLength: number;
    /**
     * Creates a new Rate Limiter, use RateLimiter.limit for the middleware.
     * @param {number} intervalMessageLimit - How long a user can send messages during
     *                                        their window before the message is denied.
     * @param {number} intervalClearLength - How long a window will last before being cleared.
     */
    constructor(intervalMessageLimit: number, intervalClearLengthInSeconds: number);
    /**
     * Middleware for the limiter, to be used with the Command class.
     * @param message
     * @param client
     */
    protect: MiddlewareFunction;
    /**
     * Check if use is allowed to send more commands to the bot.
     * @param id
     */
    private checkUser(this, id);
    /**
     * Helper method
     * Times out the user filter.
     * @param id
     */
    private deferClear(id);
}
