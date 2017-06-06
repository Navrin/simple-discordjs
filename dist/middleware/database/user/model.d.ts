import { Guild } from './../guild/model';
import 'reflect-metadata';
export declare class User {
    id: number;
    name: string;
    guilds: Guild[];
}
