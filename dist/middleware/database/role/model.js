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
const model_1 = require("./../guild/model");
const typeorm_1 = require("typeorm");
require("reflect-metadata");
let Role = class Role {
};
__decorate([
    typeorm_1.PrimaryColumn(),
    __metadata("design:type", Number)
], Role.prototype, "id", void 0);
__decorate([
    typeorm_1.Column(),
    __metadata("design:type", Number)
], Role.prototype, "type", void 0);
__decorate([
    typeorm_1.ManyToOne(type => model_1.Guild, guild => guild.roles),
    __metadata("design:type", model_1.Guild)
], Role.prototype, "guild", void 0);
Role = __decorate([
    typeorm_1.Entity()
], Role);
exports.Role = Role;
;
//# sourceMappingURL=model.js.map