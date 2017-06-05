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
const typeorm_1 = require("typeorm");
const model_1 = require("./model");
exports.createGuildIfNone = (message) => __awaiter(this, void 0, void 0, function* () {
    const guildRepo = yield typeorm_1.getConnectionManager().get().getRepository(model_1.Guild);
    const guild = new model_1.Guild();
    guild.id = parseInt(message.guild.id, 10);
    yield guildRepo.persist(guild);
    message.channel.send(`${message.guild.name} has been added to the database`);
    return guild;
});
//# sourceMappingURL=actions.js.map