import { Guild } from './../guild/model';
import { Entity, Column, PrimaryColumn, ManyToOne } from 'typeorm';
import 'reflect-metadata';

@Entity()
export class Role {
    @PrimaryColumn()
    id: number;

    @Column()
    type: number;

    @ManyToOne(type => Guild, guild => guild.roles)
    guild: Guild;
};
