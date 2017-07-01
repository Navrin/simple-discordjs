import { User } from './../user/model';
import { Role } from './../role/model';
import 'reflect-metadata';
export declare class Guild {
    id: string;
    roles: Role[];
    users: User[];
}
