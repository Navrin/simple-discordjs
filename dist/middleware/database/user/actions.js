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
const model_1 = require("./model");
const typeorm_1 = require("typeorm");
const createUserIfNone = (discordUser, connection, options = {}) => __awaiter(this, void 0, void 0, function* () {
    try {
        const userRepo = yield typeorm_1.getRepository(model_1.User, 'commander_connection');
        const user = new model_1.User();
        user.id = parseInt(discordUser.id, 10);
        user.name = discordUser.username;
        yield userRepo.persist(user);
        return true;
    }
    catch (e) {
        return false;
    }
});
exports.createUserIfNone = createUserIfNone;
//# sourceMappingURL=actions.js.map