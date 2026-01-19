export enum Access {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3,
}

export type DBAccess = {
  db: string;
  access: number;
};

export type User = {
  username: string;
  password: string;
  db: Map<string, Access>;
  admin: boolean;
};
