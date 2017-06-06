import { Guild } from './../guild/model';
import { Entity, Column, PrimaryColumn, ManyToMany, JoinTable } from 'typeorm';
import 'reflect-metadata';

@Entity()
export class User {
    @PrimaryColumn()
    id: number;

    @Column()
    name: string;

    @ManyToMany(type => Guild, guild => guild.users)
    @JoinTable()
    guilds: Guild[] = [];
}
