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
class RateLimiter {
    /**
     * Creates a new Rate Limiter, use RateLimiter.limit for the middleware.
     * @param {number} intervalMessageLimit - How long a user can send messages during
     *                                        their window before the message is denied.
     * @param {number} intervalClearLength - How long a window will last before being cleared.
     */
    constructor(intervalMessageLimit, intervalClearLengthInSeconds) {
        /**
         * Middleware for the limiter, to be used with the Command class.
         * @param message
         * @param client
         */
        this.protect = (message, options, client) => __awaiter(this, void 0, void 0, function* () {
            return this.checkUser(message.author.id);
        });
        this.intervalClearLength = intervalClearLengthInSeconds;
        this.intervalMessageLimit = intervalMessageLimit;
        this.count = {};
    }
    /**
     * Check if use is allowed to send more commands to the bot.
     * @param id
     */
    checkUser(id) {
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
    deferClear(id) {
        setTimeout(() => {
            this.count[id] = 0;
        }, this.intervalClearLength * 1000);
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=rateLimiter.js.map