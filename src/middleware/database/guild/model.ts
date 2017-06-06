import { User } from './../user/model';
import { Role } from './../role/model';
import { Entity, PrimaryColumn, OneToMany, ManyToMany } from 'typeorm';
import 'reflect-metadata';

@Entity()
export class Guild {
    @PrimaryColumn()
    id: number;

    @OneToMany(type => Role, role => role.guild)
    roles: Role[];

    @ManyToMany(type => User, user => user.guilds)
    users: User[] = [];
};
