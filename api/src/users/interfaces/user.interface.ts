import { Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  VIEWER = 'viewer',
}

export interface IUser extends Document {
  username: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
