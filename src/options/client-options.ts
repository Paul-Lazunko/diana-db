import joi from 'joi';

export interface Logger {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
}
export interface ClientOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  connectionPoolSize: number;
  logger?: Logger;
  cert?: string;
  key?: string;
  ca?: string;
  requestCert?: boolean;
  rejectUnauthorized?: boolean;
}
