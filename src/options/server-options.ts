import { Request } from '@dto';

export interface ServerOptions {
  port: number;
  ssl?: {
    key: Buffer;
    cert: Buffer;
  };
  handler: (request: Request) => void;
}
