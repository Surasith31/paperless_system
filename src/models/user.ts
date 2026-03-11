export interface User {
  id: number;
  name: string;
  email: string;
  role: number;
  created_at?: Date;
  updated_at?: Date;
}
export interface userGetResponse {
  id: number;
  name: string;
  email: string;
  role: number;
  roleText: string;
}
export interface Manager {
  id: number;
  name: string;
  email: string;
}
export interface Engineer {
  id: number;
  name: string;
  email: string;
}
