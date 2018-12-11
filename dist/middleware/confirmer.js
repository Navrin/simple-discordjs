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
const statusCodes = {
    success: '✅',
    failure: '❌',
};
exports.statusCodes = statusCodes;
const confirm = (message, type, reason, options = {
    delete: true,
    delay: 3000,
}) => __awaiter(this, void 0, void 0, function* () {
    message.react(statusCodes[type]);
    if (reason) {
        const replyMessage = yield message.reply(`**Alert:** ${reason}`);
        if (options.delete) {
            const reply = Array.isArray(replyMessage) ? replyMessage[0] : replyMessage;
            reply.delete(options.delay || 3000);
        }
    }
    if (options.delete) {
        message.delete(options.delay || 3000);
    }
});
exports.confirm = confirm;
//# sourceMappingURL=confirmer.js.map