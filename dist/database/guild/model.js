"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const model_1 = require("./../user/model");
const model_2 = require("./../role/model");
const typeorm_1 = require("typeorm");
require("reflect-metadata");
let Guild = class Guild {
    constructor() {
        this.users = [];
    }
};
__decorate([
    typeorm_1.PrimaryColumn(),
    __metadata("design:type", Number)
], Guild.prototype, "id", void 0);
__decorate([
    typeorm_1.OneToMany(type => model_2.Role, role => role.guild),
    __metadata("design:type", Array)
], Guild.prototype, "roles", void 0);
__decorate([
    typeorm_1.ManyToMany(type => model_1.User, user => user.guilds),
    __metadata("design:type", Array)
], Guild.prototype, "users", void 0);
Guild = __decorate([
    typeorm_1.Entity()
], Guild);
exports.Guild = Guild;
;
//# sourceMappingURL=model.js.map