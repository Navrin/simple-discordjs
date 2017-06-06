import { User } from './../user/model';
import { Role } from './../role/model';
import 'reflect-metadata';
export declare class Guild {
    id: number;
    roles: Role[];
    users: User[];
}
