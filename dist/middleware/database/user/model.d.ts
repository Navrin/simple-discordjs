import { Guild } from './../guild/model';
import 'reflect-metadata';
export declare class User {
    id: string;
    name: string;
    guilds: Guild[];
}
